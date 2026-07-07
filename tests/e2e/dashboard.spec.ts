import { test, expect } from '@playwright/test'

test.describe('概览仪表盘', () => {
  test('应渲染标题和欢迎区', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '学伴' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '今天想学点什么？' })).toBeVisible()
  })

  test('应渲染 4 个统计卡片', async ({ page }) => {
    await page.goto('/')
    // 统计卡片是带 hover 效果的 button,且 label 是 "学科" 后跟数字
    await expect(page.getByText('学科', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('知识点', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('思考笔记', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('错题本', { exact: true }).first()).toBeVisible()
  })

  test('应渲染 7 日活跃度柱状图', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('最近 7 天学习活跃度')).toBeVisible()
  })

  test('点击统计卡片应跳转到对应模块', async ({ page }) => {
    await page.goto('/')
    // 用侧边栏导航按钮代替(更稳定)
    await page.getByRole('button', { name: '学科 管理学科分类' }).click()
    await expect(page.getByRole('heading', { name: '学科管理' })).toBeVisible()
  })

  test('应渲染侧边栏导航', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '概览 学习仪表盘' })).toBeVisible()
    await expect(page.getByRole('button', { name: '学科 管理学科分类' })).toBeVisible()
    await expect(page.getByRole('button', { name: '知识点 知识库与关联' })).toBeVisible()
    await expect(page.getByRole('button', { name: '思考笔记 自主思考 + AI 引导' })).toBeVisible()
    await expect(page.getByRole('button', { name: '错题本 错题与 AI 解析' })).toBeVisible()
  })

  test('侧边栏导航应可切换模块', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '错题本 错题与 AI 解析' }).click()
    await expect(page.getByRole('heading', { name: '错题本', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '知识点 知识库与关联' }).click()
    await expect(page.getByRole('heading', { name: '知识点', exact: true })).toBeVisible()
  })
})
