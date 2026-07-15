/**
 * generate-icons.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * Run once locally (or in CI) to convert the SVG favicon into all required
 * PNG sizes for the PWA manifest and iOS touch icons.
 *
 * Prerequisites:
 *   npm install --save-dev sharp
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Output (written to public/icons/):
 *   icon-192.png          — Android home screen icon
 *   icon-512.png          — Android splash / install sheet
 *   icon-maskable-512.png — Android adaptive icon (adds safe-zone padding)
 *   icon-152.png          — iPad home screen
 *   icon-167.png          — iPad Pro home screen
 *   icon-180.png          — iPhone home screen
 *   splash-390x844.png    — iOS startup image (iPhone 14 / 13)
 *   screenshot-mobile.png — Chrome install sheet screenshot (390×844)
 *
 * Maskable icon note:
 *   The maskable variant adds 10% padding around the icon so the artwork
 *   stays fully visible inside any adaptive-icon shape (circle, squircle, etc.).
 *   The background fill matches the app's background_color in the manifest.
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT  = join(ROOT, 'public', 'icons')

mkdirSync(OUT, { recursive: true })

const svgPath = join(ROOT, 'public', 'icons', 'favicon.svg')
const svgBuf  = readFileSync(svgPath)

async function render(size, outFile, opts = {}) {
  const { padding = 0, bg = '#04050b' } = opts
  const inner = size - padding * 2

  const icon = await sharp(svgBuf)
    .resize(inner, inner)
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4,
               background: { r: 4, g: 5, b: 11, alpha: 1 } },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(join(OUT, outFile))

  console.log(`✓  ${outFile}  (${size}×${size})`)
}

async function renderSplash(w, h, outFile) {
  const iconSize = Math.round(Math.min(w, h) * 0.28)
  const icon = await sharp(svgBuf).resize(iconSize, iconSize).toBuffer()

  await sharp({
    create: { width: w, height: h, channels: 4,
               background: { r: 4, g: 5, b: 11, alpha: 1 } },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(join(OUT, outFile))

  console.log(`✓  ${outFile}  (${w}×${h})`)
}

await render(192, 'icon-192.png')
await render(512, 'icon-512.png')
await render(512, 'icon-maskable-512.png', { padding: 51 }) // ~10% safe zone
await render(152, 'icon-152.png')
await render(167, 'icon-167.png')
await render(180, 'icon-180.png')
await renderSplash(390, 844, 'splash-390x844.png')
await renderSplash(390, 844, 'screenshot-mobile.png')

console.log('\n✅  All icons generated in public/icons/')
console.log('   Commit public/icons/*.png before deploying.')
