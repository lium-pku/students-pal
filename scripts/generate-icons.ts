/**
 * 生成 PWA 图标脚本
 * 基于 logo.svg 生成 192/512/maskable 尺寸的 PNG
 * 使用 sharp 库
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons')

// 确保目录存在
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true })
}

// 读取 SVG logo
const svgPath = path.join(PUBLIC_DIR, 'logo.svg')
const svgBuffer = fs.readFileSync(svgPath)

// 生成一个带背景色的 SVG(用于 maskable 和普通图标)
function createIconSvg(size: number, maskable = false) {
  const padding = maskable ? size * 0.1 : 0
  const innerSize = size - padding * 2
  // 使用项目主色 #2a9d8f(暖绿)作为背景
  const bg = maskable ? '#2a9d8f' : 'transparent'
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${bg !== 'transparent' ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
      <g transform="translate(${padding}, ${padding})">
        <svg width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </g>
    </svg>
  `
}

async function generateIcons() {
  console.log('🎨 生成 PWA 图标...')

  // 192x192 普通图标
  await sharp(Buffer.from(createIconSvg(192)))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'))
  console.log('   ✓ icon-192.png')

  // 512x512 普通图标
  await sharp(Buffer.from(createIconSvg(512)))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'))
  console.log('   ✓ icon-512.png')

  // 192x192 maskable 图标(带安全区)
  await sharp(Buffer.from(createIconSvg(192, true)))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192-maskable.png'))
  console.log('   ✓ icon-192-maskable.png')

  // 512x512 maskable 图标
  await sharp(Buffer.from(createIconSvg(512, true)))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'))
  console.log('   ✓ icon-512-maskable.png')

  // favicon (32x32)
  await sharp(Buffer.from(createIconSvg(32)))
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32.png'))
  console.log('   ✓ favicon-32.png')

  // apple-touch-icon (180x180)
  await sharp(Buffer.from(createIconSvg(180, true)))
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'))
  console.log('   ✓ apple-touch-icon.png')

  console.log('✅ 图标生成完成!')
}

generateIcons().catch((e) => {
  console.error('生成失败:', e)
  process.exit(1)
})
