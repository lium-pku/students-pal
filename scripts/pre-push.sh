#!/usr/bin/env bash
# pre-push 钩子:推送前强制检查
# 1. E2E 测试全过
# 2. 清理测试数据 + 注入演示数据(db:seed)
# 3. 检查文档是否更新(若有源码变更)
# 4. 检查 worklog 是否更新
#
# 用法:由 git hook 自动调用,或手动 bash scripts/pre-push.sh

set -e

echo "🔍 pre-push 检查开始..."
echo ""

# 1. 检查是否有源码变更但没有更新 REQUIREMENTS.md
echo "▶ [1/4] 检查文档更新..."
SOURCE_CHANGED=$(git diff --cached --name-only HEAD origin/main 2>/dev/null | grep -E "^src/" | head -20 || echo "")
# 用 working tree 与最新 commit 比较
RECENT_SOURCE=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E "^src/" | head -20 || echo "")
DOC_UPDATED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep "docs/REQUIREMENTS.md" || echo "")

if [ -n "$RECENT_SOURCE" ] && [ -z "$DOC_UPDATED" ]; then
  echo "  ⚠️  检测到源码变更但 REQUIREMENTS.md 未更新:"
  echo "$RECENT_SOURCE" | sed 's/^/    /'
  echo ""
  echo "  根据 AGENT_RULES.md 2.1 节,需求变更必须同步更新文档。"
  echo "  如果这是纯重构/bugfix(不涉及需求变更),可忽略此警告。"
  echo ""
  read -p "  确认继续推送?(y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 推送已取消。请更新 docs/REQUIREMENTS.md 后再推送。"
    exit 1
  fi
fi
echo "✅ 文档检查通过"
echo ""

# 2. E2E 测试
echo "▶ [2/4] 运行 E2E 测试..."
echo "  (这可能需要几分钟,请耐心等待...)"
if ! bun run test:e2e 2>&1 | tail -10; then
  echo ""
  echo "❌ E2E 测试失败!请修复后再推送。"
  exit 1
fi

# 检查 E2E 是否有失败
E2E_RESULT=$(bun run test:e2e 2>&1 | tail -5)
if echo "$E2E_RESULT" | grep -q "failed"; then
  echo ""
  echo "❌ E2E 测试有失败:"
  echo "$E2E_RESULT"
  exit 1
fi
echo "✅ E2E 测试通过"
echo ""

# 3. 清理测试数据 + 注入演示数据
echo "▶ [3/4] 清理测试数据 + 注入演示数据..."
bun run db:seed 2>&1 | tail -5
echo "✅ 数据已清理"
echo ""

# 4. 检查 worklog 是否更新
echo "▶ [4/4] 检查 worklog..."
WORKLOG_UPDATED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep "worklog.md" || echo "")
if [ -z "$WORKLOG_UPDATED" ]; then
  echo "  ⚠️  worklog.md 未更新。根据 AGENT_RULES.md 5 节,应追加工作记录。"
  read -p "  确认继续推送?(y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 推送已取消。请更新 worklog.md 后再推送。"
    exit 1
  fi
fi
echo "✅ worklog 检查通过"
echo ""

echo "✅ pre-push 检查全部通过!开始推送..."
