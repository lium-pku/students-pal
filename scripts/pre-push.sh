#!/usr/bin/env bash
# pre-push 钩子:推送前强制检查
# 1. E2E 测试全过
# 2. 清理测试数据 + 注入演示数据(db:seed)
# 3. 文档更新检查

echo "🔍 pre-push 检查开始..."

# 1. E2E 测试
echo "▶ [1/2] 运行 E2E 测试(可能需要几分钟)..."
bun run test:e2e > /tmp/e2e-output.txt 2>&1
E2E_EXIT=$?

# 显示结果
tail -5 /tmp/e2e-output.txt

if [ $E2E_EXIT -ne 0 ]; then
  echo ""
  echo "❌ E2E 测试失败!"
  grep -E "failed|FAIL" /tmp/e2e-output.txt | head -10
  exit 1
fi
echo "✅ E2E 测试通过"

# 2. 清理测试数据 + 注入演示数据
echo ""
echo "▶ [2/2] 清理测试数据 + 注入演示数据..."
bun run db:seed > /tmp/seed-output.txt 2>&1
if [ $? -ne 0 ]; then
  echo "❌ db:seed 失败!"
  exit 1
fi
tail -3 /tmp/seed-output.txt
echo "✅ 数据已清理"

echo ""
echo "✅ pre-push 检查全部通过!开始推送..."
