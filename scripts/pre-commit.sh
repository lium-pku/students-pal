#!/usr/bin/env bash
# pre-commit 钩子:提交前强制检查
# 1. ESLint 零错误
# 2. 单元测试 + 集成测试全过
# 3. 覆盖率达标
#
# 用法:由 git hook 自动调用,或手动 bash scripts/pre-commit.sh

set -e

echo "🔍 pre-commit 检查开始..."
echo ""

# 1. ESLint
echo "▶ [1/3] 运行 ESLint..."
if ! bun run lint 2>&1 | tail -5; then
  echo ""
  echo "❌ ESLint 检查失败!请修复 lint 错误后再提交。"
  exit 1
fi
echo "✅ ESLint 通过"
echo ""

# 2. 单元测试 + 集成测试 + 覆盖率
echo "▶ [2/3] 运行单元测试 + 集成测试(含覆盖率)..."
if ! bun run test:coverage 2>&1 | grep -E "Test Files|Tests |ERROR"; then
  echo ""
  echo "❌ 测试失败或覆盖率不达标!请修复后再提交。"
  exit 1
fi

# 检查是否有测试失败
FAILURES=$(bun run test:coverage 2>&1 | grep -E "failed|FAIL" | head -3)
if [ -n "$FAILURES" ]; then
  echo ""
  echo "❌ 有测试失败:"
  echo "$FAILURES"
  exit 1
fi

# 检查覆盖率是否达标
COVERAGE_ERRORS=$(bun run test:coverage 2>&1 | grep "ERROR: Coverage")
if [ -n "$COVERAGE_ERRORS" ]; then
  echo ""
  echo "❌ 覆盖率不达标:"
  echo "$COVERAGE_ERRORS"
  exit 1
fi
echo "✅ 测试通过,覆盖率达标"
echo ""

# 3. 检查是否有新增/修改的源文件但没有对应的测试
echo "▶ [3/3] 检查测试覆盖..."
CHANGED_SOURCE=$(git diff --cached --name-only --diff-filter=ACM | grep -E "^src/(lib|app/api)/.*\.(ts|tsx)$" | head -20)
if [ -n "$CHANGED_SOURCE" ]; then
  echo "  本次提交涉及的源文件:"
  echo "$CHANGED_SOURCE" | sed 's/^/    /'
  echo ""
  echo "  ⚠️  请确认这些文件有对应的测试(tests/ 目录)。"
  echo "  如果新增了函数/API/组件,必须同步新增测试。"
  echo ""
fi

echo ""
echo "✅ pre-commit 检查全部通过!"
