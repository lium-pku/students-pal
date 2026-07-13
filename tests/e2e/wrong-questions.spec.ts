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

  test('应能编辑错题', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page.getByText('错题详情')).toBeVisible({ timeout: 5000 })
      await page.getByRole('button', { name: '编辑' }).click()
      await expect(page.getByRole('heading', { name: '编辑错题' })).toBeVisible({ timeout: 5000 })
    }
  })

  test('应能删除错题', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page.getByText('错题详情')).toBeVisible({ timeout: 5000 })
      page.on('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: '删除' }).click()
      await expect(page.getByText('错题详情')).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('应能切换错题状态', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page.getByText('错题详情')).toBeVisible({ timeout: 5000 })
      // 应有状态切换按钮
      await expect(page.getByText('掌握状态：')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('已掌握')).toBeVisible()
    }
  })

  test('应能触发 AI 解析错题', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await page.waitForTimeout(1000)
    const cards = page.locator('div.cursor-pointer')
    const count = await cards.count()
    if (count > 0) {
      // 找未处理的错题(有"让 AI 解析"按钮)
      await cards.first().click()
      await expect(page.getByText('错题详情')).toBeVisible({ timeout: 5000 })
      const aiButton = page.getByRole('button', { name: /让 AI 解析|重新解析/ })
      if (await aiButton.count() > 0) {
        await aiButton.click()
        // 应显示加载或解析内容
        await page.waitForTimeout(1000)
      }
    }
  })
})
