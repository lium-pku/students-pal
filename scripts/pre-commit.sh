#!/usr/bin/env bash
# pre-commit 钩子:提交前强制检查
# 1. ESLint 零错误
# 2. 单元测试 + 集成测试全过
# 3. 覆盖率达标

echo "🔍 pre-commit 检查开始..."

# 1. ESLint
echo "▶ [1/2] 运行 ESLint..."
bun run lint > /tmp/lint-output.txt 2>&1
if [ $? -ne 0 ]; then
  cat /tmp/lint-output.txt
  echo ""
  echo "❌ ESLint 失败!请修复 lint 错误后再提交。"
  exit 1
fi
echo "✅ ESLint 通过"

# 2. 单元测试 + 覆盖率
echo "▶ [2/2] 运行单元测试 + 集成测试(含覆盖率)..."
bun run test:coverage > /tmp/test-output.txt 2>&1
TEST_EXIT=$?

# 显示测试结果摘要
grep -E "Test Files|Tests |All files" /tmp/test-output.txt

if [ $TEST_EXIT -ne 0 ]; then
  echo ""
  echo "❌ 测试失败!详情:"
  grep -E "FAIL|failed|ERROR" /tmp/test-output.txt | head -10
  exit 1
fi

# 检查覆盖率是否达标
if grep -q "ERROR: Coverage" /tmp/test-output.txt; then
  echo ""
  echo "❌ 覆盖率不达标:"
  grep "ERROR: Coverage" /tmp/test-output.txt
  exit 1
fi

echo "✅ 测试通过,覆盖率达标"
echo ""
echo "✅ pre-commit 检查全部通过!"
