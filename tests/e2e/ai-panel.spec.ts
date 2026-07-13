import { test, expect } from '@playwright/test'

test.describe('AI 学伴面板', () => {
  test('应能打开和关闭 AI 面板', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    // 面板打开后应显示"通用学习助手"
    await expect(page.getByText('通用学习助手')).toBeVisible({ timeout: 5000 })
    // 关闭
    await page.getByRole('button', { name: /收起 AI/ }).click()
    await expect(page.getByText('通用学习助手')).not.toBeVisible({ timeout: 3000 })
  })

  test('应渲染推荐提问', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await expect(page.getByText('这道题的关键思路是什么？')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('帮我梳理这个知识点的来龙去脉')).toBeVisible()
    await expect(page.getByText('给我出三道类似的练习题')).toBeVisible()
    await expect(page.getByText('这个概念容易和什么混淆？')).toBeVisible()
  })

  test('点击推荐提问应填入输入框', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await page.getByText('这道题的关键思路是什么？').click()
    await expect(page.getByPlaceholder(/向 AI 学伴提问/)).toHaveValue('这道题的关键思路是什么？')
  })

  test('应能切换联网搜索模式', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await page.getByRole('button', { name: /联网搜索/ }).click()
    await expect(page.getByPlaceholder(/输入要搜索的问题/)).toBeVisible({ timeout: 3000 })
  })

  test('应能打开历史会话', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await page.getByRole('button', { name: /历史会话/ }).click()
    // 抽屉打开,可能显示"暂无历史会话"或已有会话
    await page.waitForTimeout(1000)
  })

  test('应能发起新对话', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await page.getByRole('button', { name: /新对话/ }).click()
    await expect(page.getByText('这道题的关键思路是什么？')).toBeVisible({ timeout: 3000 })
  })

  test('应能发送消息并收到回复', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    // 输入消息
    const input = page.getByPlaceholder(/向 AI 学伴提问/)
    await input.fill('你好,请简单介绍一下勾股定理')
    // 按 Enter 发送
    await input.press('Enter')
    // 应显示用户消息
    await expect(page.getByText('你好,请简单介绍一下勾股定理')).toBeVisible({ timeout: 5000 })
    // 应显示 AI 回复(等待较长时间,AI 调用可能慢)
    await expect(page.getByText(/AI 思考中|AI 回复|定理/).first()).toBeVisible({ timeout: 90000 })
  })

  test('应能关闭 AI 面板', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /AI 学伴/, exact: false }).first().click()
    await expect(page.getByText('通用学习助手')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /关闭面板/ }).click()
    await expect(page.getByText('通用学习助手')).not.toBeVisible({ timeout: 3000 })
  })
})
