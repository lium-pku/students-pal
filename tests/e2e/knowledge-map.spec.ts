import { test, expect } from '@playwright/test'

test.describe('知识地图', () => {
  async function goToMap(page: import('@playwright/test').Page) {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '知识地图 可视化知识结构' }).click()
    await expect(page.getByRole('heading', { name: '知识地图', exact: true })).toBeVisible({ timeout: 10000 })
  }

  test('应能从侧边栏进入知识地图', async ({ page }) => { await goToMap(page) })

  test('应显示学科选择下拉(默认选数学)', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText(/数学/).first()).toBeVisible({ timeout: 5000 })
  })

  test('应显示刷新按钮', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByRole('button', { name: /刷新/ })).toBeVisible({ timeout: 5000 })
  })

  test('应显示缩放工具栏', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText(/缩放.*%/)).toBeVisible({ timeout: 5000 })
  })

  test('应显示图例', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText('知识点掌握度:')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('节点类型:')).toBeVisible()
  })

  test('点击刷新应重新生成地图', async ({ page }) => {
    await goToMap(page)
    await page.getByRole('button', { name: /刷新/ }).click()
    await expect(page.getByText('地图已刷新')).toBeVisible({ timeout: 15000 })
  })

  test('应渲染知识地图 SVG(含 circle 节点)', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText(/地图生成于/)).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    const result = await page.evaluate(() => {
      for (const svg of document.querySelectorAll('svg')) {
        const c = svg.querySelectorAll('circle').length
        if (c > 0) return { found: true, circles: c }
      }
      return { found: false, circles: 0 }
    })
    expect(result.found).toBe(true)
    expect(result.circles).toBeGreaterThan(0)
  })

  test('应显示知识点标题(勾股定理)', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText(/地图生成于/)).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)
    const hasTitle = await page.evaluate(() => {
      for (const svg of document.querySelectorAll('svg')) {
        const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent || '')
        if (texts.some(t => t.includes('勾股定理'))) return true
      }
      return false
    })
    expect(hasTitle).toBe(true)
  })

  test('应显示地图生成时间', async ({ page }) => {
    await goToMap(page)
    await expect(page.getByText(/地图生成于/)).toBeVisible({ timeout: 15000 })
  })
})
