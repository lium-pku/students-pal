import { test, expect } from '@playwright/test'

test.describe('学科管理流程', () => {
  test('应能新建学科', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    await expect(page.getByRole('heading', { name: '学科管理', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '新建学科' }).click()
    await expect(page.getByRole('heading', { name: '新建学科' })).toBeVisible()

    const uniqueName = `E2E测试学科_${Date.now()}`
    await page.getByPlaceholder('例如：数学、英语、物理').fill(uniqueName)
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 })
  })

  test('应在未填写名称时阻止创建', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    await page.getByRole('button', { name: '新建学科' }).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('请填写学科名称')).toBeVisible({ timeout: 3000 })
  })

  test('应能选择颜色', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    await page.getByRole('button', { name: '新建学科' }).click()
    const colorButtons = page.locator('button[class*="rounded-full"]')
    await expect(colorButtons).toHaveCount(8)
  })
})
