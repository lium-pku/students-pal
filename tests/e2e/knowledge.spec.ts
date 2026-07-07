import { test, expect } from '@playwright/test'

test.describe('知识点模块', () => {
  test('应能新建知识点', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '知识点 知识库与关联' }).click()
    await expect(page.getByRole('heading', { name: '知识点', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '新建知识点' }).click()
    await expect(page.getByRole('heading', { name: '新建知识点' })).toBeVisible()

    const title = `E2E知识点_${Date.now()}`
    await page.getByPlaceholder('例如：勾股定理').fill(title)
    await page.getByPlaceholder('详细描述这个知识点...').fill('这是测试内容')
    await page.getByPlaceholder('例如：几何, 定理, 初中').fill('测试,E2E')

    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 })
  })

  test('应能切换到关联图视图', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '知识点 知识库与关联' }).click()
    await page.getByRole('tab', { name: '关联图' }).click()
    // 关联图视图应显示节点数和边数(特有文本)
    await expect(page.getByText(/共\s*\d+\s*个知识点/)).toBeVisible({ timeout: 5000 })
  })

  test('应能打开知识点详情', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '知识点 知识库与关联' }).click()
    // 等待加载
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      // 详情对话框应有"掌握度"或"关联"标题
      await expect(page.getByText('AI 推荐关联').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('应支持关键词搜索', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '知识点 知识库与关联' }).click()
    await page.getByPlaceholder('搜索标题、内容或标签...').fill('不存在的关键词_xyz_unique_12345')
    await expect(page.getByText('还没有知识点')).toBeVisible({ timeout: 5000 })
  })
})
