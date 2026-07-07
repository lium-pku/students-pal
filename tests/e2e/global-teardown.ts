/**
 * Playwright 全局清理
 * 在所有 E2E 测试运行完成后,清空测试产生的数据并重新注入演示数据。
 *
 * 这样:
 *   1. 测试产生的脏数据(如 "E2E测试学科_xxx")被清掉
 *   2. 用户打开应用看到的是干净的演示数据,而不是一堆测试残留
 */
import { clearData, resetData } from '../../scripts/reset-data'

export default async function globalTeardown() {
  console.log('\n🧹 E2E 测试完成,开始清理...')
  try {
    // 先清空,再注入演示数据
    await clearData()
    await resetData()
    console.log('✅ 清理完成,已重新注入演示数据')
  } catch (e) {
    console.error('清理失败:', e)
    // 即使失败也不阻塞
  }
}
