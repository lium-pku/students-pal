import { test, expect } from '@playwright/test'

test.describe('错题本模块', () => {
  test('应能新建错题', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await expect(page.getByRole('heading', { name: '错题本', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '添加错题' }).click()
    await expect(page.getByRole('heading', { name: '添加错题' })).toBeVisible()

    const q = `E2E错题_${Date.now()}: 1+1=?`
    await page.getByPlaceholder('完整的题目内容...').fill(q)
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText(q).first()).toBeVisible({ timeout: 5000 })
  })

  test('应能打开错题详情', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page.getByText('错题详情')).toBeVisible({ timeout: 5000 })
    }
  })

  test('应在未填写题目时阻止创建', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.getByRole('button', { name: '添加错题' }).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('请填写题目')).toBeVisible({ timeout: 3000 })
  })

  test('应支持按状态过滤', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await expect(page.getByText('所有状态')).toBeVisible()
  })
})
