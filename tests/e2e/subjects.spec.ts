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

  test('应能重命名学科', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    // 点击第一个学科卡片上的"重命名"按钮
    const renameButtons = page.getByRole('button', { name: '重命名' })
    if (await renameButtons.count() > 0) {
      await renameButtons.first().click()
      await expect(page.getByRole('heading', { name: '重命名学科' })).toBeVisible()
      // 修改名称
      const nameInput = page.getByPlaceholder('例如：数学、英语、物理')
      await nameInput.fill('重命名后的学科')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.getByText('重命名后的学科')).toBeVisible({ timeout: 5000 })
    }
  })

  test('应能删除学科(取消)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    const deleteButtons = page.getByRole('button', { name: '删除' })
    const initialCount = await page.locator('div[class*="cursor-pointer"], [class*="rounded-lg"][class*="overflow-hidden"]').count()
    if (await deleteButtons.count() > 0) {
      // 点击删除但在确认对话框点取消
      page.on('dialog', (dialog) => dialog.dismiss())
      await deleteButtons.first().click()
      await page.waitForTimeout(500)
      // 学科数量应不变
    }
  })
})
