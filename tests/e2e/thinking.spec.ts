import { test, expect } from '@playwright/test'

test.describe('思考笔记模块', () => {
  test('应能新建思考笔记', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '思考笔记 自主思考 + AI 引导' }).click()
    await expect(page.getByRole('heading', { name: '自主思考笔记', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '新建思考' }).click()
    await expect(page.getByRole('heading', { name: '新建思考笔记' })).toBeVisible()

    const title = `E2E思考_${Date.now()}`
    await page.getByPlaceholder('例如：为什么乘法可以分配于加法？').fill(title)
    await page.getByPlaceholder('是什么引发了你的思考？').fill('测试问题')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 })
  })

  test('应能打开笔记详情并看到 4 种引导模式', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '思考笔记 自主思考 + AI 引导' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page.getByText('AI 学伴引导')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('苏格拉底提问').first()).toBeVisible()
      await expect(page.getByText('思考镜子').first()).toBeVisible()
      await expect(page.getByText('理性辩手').first()).toBeVisible()
      await expect(page.getByText('知识拓展员').first()).toBeVisible()
    }
  })

  test('应在未填写标题时阻止创建', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '思考笔记 自主思考 + AI 引导' }).click()
    await page.getByRole('button', { name: '新建思考' }).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('请填写标题')).toBeVisible({ timeout: 3000 })
  })
})
