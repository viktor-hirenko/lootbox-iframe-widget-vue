// vite/plugins/vite-plugin-themes.ts

/**
 * vite-plugin-themes
 *
 * Плагін для роботи з темами lootbox колеса в режимі DEV та BUILD.
 *
 * Архітектура:
 * - DEV: генерує /themes/themes-config.js та обслуговує файли тем
 * - BUILD: створює dist/themes/ з CSS, зображень та конфігурації
 *
 * Підтримувані формати:
 * - Конфіги: config.ts (типізований)
 * - Стилі: theme.scss, styles.scss, theme.css, styles.css
 * - Зображення: будь-які формати в папці images/
 */

import type { Plugin } from 'vite'
import type { PluginContext as RollupPluginContext } from 'rollup'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ──────────────────────────────────────────────────────────────────────────────
// Шляхи
// ──────────────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../')
const SRC_THEMES_DIR = path.join(ROOT, 'src/themes')
const OUT_BASE = 'themes'

// ──────────────────────────────────────────────────────────────────────────────
/** Необов'язковий SASS для SCSS → CSS (theme.scss/styles.scss) */
let sass: typeof import('sass') | null = null
try {
  const mod: typeof import('sass') = await import('sass')
  sass = mod
} catch {
  // немає sass — просто пропустимо SCSS і шукатимемо .css
}

/** esbuild для читання src/themes/<id>/config.ts у DEV/BUILD */
let esbuild: typeof import('esbuild') | null = null
try {
  const mod: typeof import('esbuild') = await import('esbuild')
  esbuild = mod
} catch {
  // якщо конфіги лише у JSON — залежність не обов'язкова
}

// ──────────────────────────────────────────────────────────────────────────────
/** Структура даних конфігу теми (без функцій, тільки дані) */
export type ThemeConfig = {
  name: string
  styleId: number
  project: string
  isProjectDefault: boolean
  timings: { spinDuration: number; timeToPopup: number; winAnimationOffset: number }
  logic: { numberOfSpins: number; winSection: number }
  fontSizes?: {
    sum: {
      short: string
      medium: string
      long: string
      veryLong: string
      extraLong: string
      max: string
    }
    currency: { short: string; long: string }
    bonus: { default: string; short: string; medium: string; long: string }
  }
}

/** Розширена тема у реєстрі (додаємо id та список явних URL зображень) */
type RegistryTheme = ThemeConfig & { id: string; images: string[] }

/** Формат реєстру, який віддаємо у /themes/themes-config.js */
type Registry = { themes: RegistryTheme[]; abTests?: Record<string, unknown> }

/** Мінімальна карта MIME — достатньо для наших типів файлів */
const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
}

// ──────────────────────────────────────────────────────────────────────────────
// Допоміжні утиліти
// ──────────────────────────────────────────────────────────────────────────────

/** Директорія виглядає як тема, якщо знайдено хоч щось із переліку */
function isThemeDir(dir: string): boolean {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false
  return (
    fs.existsSync(path.join(dir, 'config.ts')) ||
    fs.existsSync(path.join(dir, 'theme.scss')) ||
    fs.existsSync(path.join(dir, 'styles.scss')) ||
    fs.existsSync(path.join(dir, 'theme.css')) ||
    fs.existsSync(path.join(dir, 'styles.css')) ||
    fs.existsSync(path.join(dir, 'images'))
  )
}

/** Перевірити чи є у темі config.ts (обов'язково) */
function hasTsConfig(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'config.ts'))
}

/** Рекурсивно обійти файли (без прихованих/службових) і повернути відносні шляхи */
function walkFiles(dir: string, root: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir)) {
    const abs = path.join(dir, e)
    const rel = path.relative(root, abs).split(path.sep).join('/')
    const st = fs.statSync(abs)
    if (st.isDirectory()) walkFiles(abs, root, acc)
    else if (!e.startsWith('.') && !e.startsWith('_')) acc.push(rel)
  }
  return acc
}

/** Легка runtime‑перевірка форми конфігу (страховка від «битих» даних) */
function assertThemeConfig(cfg: any, themeId: string): asserts cfg is ThemeConfig {
  const fail = (m: string) => {
    throw new Error(`[themes] ${themeId}/config: ${m}`)
  }
  if (!cfg || typeof cfg !== 'object') fail('config must be an object')
  if (typeof cfg.name !== 'string') fail('field "name" must be string')
  if (typeof cfg.styleId !== 'number') fail('field "styleId" must be number')
  if (!cfg.timings || typeof cfg.timings !== 'object') fail('"timings" missing/invalid')
  if (!cfg.logic || typeof cfg.logic !== 'object') fail('"logic" missing/invalid')
  const t = cfg.timings,
    l = cfg.logic
  if (typeof t.spinDuration !== 'number') fail('timings.spinDuration must be number')
  if (typeof t.timeToPopup !== 'number') fail('timings.timeToPopup must be number')
  if (typeof t.winAnimationOffset !== 'number') fail('timings.winAnimationOffset must be number')
  if (typeof l.numberOfSpins !== 'number') fail('logic.numberOfSpins must be number')
  if (typeof l.winSection !== 'number') fail('logic.winSection must be number')
}

/** Компіляція TypeScript конфігу в JavaScript через esbuild */
async function compileTypeScriptConfig(tsPath: string, themeId: string): Promise<any> {
  if (!esbuild) {
    throw new Error(`[themes] esbuild is required to read ${themeId}/config.ts (npm i -D esbuild)`)
  }

  // Швидкий однофайловий бандл → тимчасовий .mjs → dynamic import
  // Додаємо timestamp для унікальності та уникнення кешу Node.js
  const timestamp = Date.now()
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-config-'))
  const tmpFile = path.join(tmpDir, `config-${themeId}-${timestamp}.mjs`)

  await esbuild.build({
    entryPoints: [tsPath],
    bundle: true,
    format: 'esm',
    outfile: tmpFile,
    write: true,
    platform: 'node',
    target: 'es2020',
    external: ['vue', 'react'], // на випадок імпортів типів
    tsconfig: path.resolve(ROOT, 'tsconfig.json'),
  })

  // Додаємо query параметр для cache-busting
  return import(`${pathToFileURL(tmpFile).href}?t=${timestamp}`)
}

/** Імпорт скомпільованого конфігу з модуля */
function importCompiledConfig(module: any): any {
  return (module.config ?? module.default) as any
}

/** Прочитати конфіг теми з config.ts */
async function readThemeConfig(themeId: string): Promise<ThemeConfig> {
  const dir = path.join(SRC_THEMES_DIR, themeId)
  const tsPath = path.join(dir, 'config.ts')

  if (!fs.existsSync(tsPath)) {
    throw new Error(`No config.ts in theme "${themeId}"`)
  }

  const mod = await compileTypeScriptConfig(tsPath, themeId)
  const cfg = importCompiledConfig(mod)
  assertThemeConfig(cfg, themeId)
  return cfg
}

/** Зібрати CSS теми: SCSS → CSS або читати .css як є */
function compileCss(themeId: string): string | null {
  const dir = path.join(SRC_THEMES_DIR, themeId)
  const scssA = path.join(dir, 'theme.scss')
  const scssB = path.join(dir, 'styles.scss')
  const cssA = path.join(dir, 'theme.css')
  const cssB = path.join(dir, 'styles.css')
  if (fs.existsSync(scssA) && sass) return sass.compile(scssA, { style: 'compressed' as any }).css
  if (fs.existsSync(scssB) && sass) return sass.compile(scssB, { style: 'compressed' as any }).css
  if (fs.existsSync(cssA)) return fs.readFileSync(cssA, 'utf-8')
  if (fs.existsSync(cssB)) return fs.readFileSync(cssB, 'utf-8')
  return null
}

/** Повернути список зображень теми: відносні шляхи та публічні URL */
function collectImages(themeId: string): {
  rels: string[]
  urls: string[]
  map: Record<string, string>
} {
  const imgDir = path.join(SRC_THEMES_DIR, themeId, 'images')
  const rels = walkFiles(imgDir, imgDir).sort()
  const urls = rels.map(rel => `${OUT_BASE}/${themeId}/images/${rel}`)
  const map: Record<string, string> = {}
  for (const rel of rels) {
    const base = rel.split('/').pop()!
    const key = base.replace(/\.[^.]+$/, '')
    map[key] = `${OUT_BASE}/${themeId}/images/${rel}`
  }
  return { rels, urls, map }
}

/** Прочитати конфіг A/B-тестів з src/ab/config.ts */
async function readABTestsConfig(): Promise<Record<string, unknown> | null> {
  const abConfigPath = path.join(ROOT, 'src/ab/config.ts')
  if (!fs.existsSync(abConfigPath) || !esbuild) return null

  try {
    const timestamp = Date.now()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-config-'))
    const tmpFile = path.join(tmpDir, `ab-config-${timestamp}.mjs`)

    await esbuild.build({
      entryPoints: [abConfigPath],
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      write: true,
      platform: 'node',
      target: 'es2020',
      tsconfig: path.resolve(ROOT, 'tsconfig.json'),
    })

    const mod = await import(`${pathToFileURL(tmpFile).href}?t=${timestamp}`)
    return (mod.abTests ?? null) as Record<string, unknown> | null
  } catch (e: any) {
    console.warn(`[themes] Failed to read A/B config: ${e.message}`)
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DEV handlers
// ──────────────────────────────────────────────────────────────────────────────

/** Обслуговування /themes/themes-config.js — реєстр тем */
async function handleRegistry(res: any): Promise<void> {
  const ids = fs
    .readdirSync(SRC_THEMES_DIR)
    .filter(d => isThemeDir(path.join(SRC_THEMES_DIR, d)))
    .filter(d => hasTsConfig(path.join(SRC_THEMES_DIR, d))) // ← тільки з config.ts

  const themes: RegistryTheme[] = []
  for (const id of ids) {
    const cfg = await readThemeConfig(id)
    const { urls } = collectImages(id)
    themes.push({ id, ...cfg, images: urls })
  }
  themes.sort((a, b) => a.styleId - b.styleId)

  const abTests = await readABTestsConfig()
  const reg: Registry = { themes, ...(abTests ? { abTests } : {}) }
  res.setHeader('Content-Type', MIME['.js'])
  res.end(`window.THEMES_CONFIG = ${JSON.stringify(reg, null, 2)};`)
}

/** Обслуговування /themes/<id>/theme.css — CSS файли */
function handleThemeCss(url: string, res: any): void {
  const mCss = url.match(/^\/themes\/([^/]+)\/theme\.css$/)
  if (!mCss) return

  const css = compileCss(mCss[1])
  if (!css) {
    res.statusCode = 404
    res.end('CSS not found')
    return
  }
  res.setHeader('Content-Type', MIME['.css'])
  res.end(css)
}

/** Обслуговування /themes/<id>/images/** — зображення */
function handleThemeImage(url: string, res: any): void {
  const mImg = url.match(/^\/themes\/([^/]+)\/images\/(.+)$/)
  if (!mImg) return

  const abs = path.join(SRC_THEMES_DIR, mImg[1], 'images', mImg[2].split('/').join(path.sep))
  if (!fs.existsSync(abs)) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  const ext = path.extname(abs).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  res.setHeader('Content-Type', type)
  fs.createReadStream(abs).pipe(res)
}

/** Підключення watcher для full-reload при змінах тем */
function attachWatcher(server: any): void {
  const reload = (file: string) => {
    if (file.includes(`${path.sep}src${path.sep}themes${path.sep}`)) {
      server.ws.send({ type: 'full-reload' })
    }
  }
  server.watcher.on('add', reload)
  server.watcher.on('change', reload)
  server.watcher.on('unlink', reload)
}

// ──────────────────────────────────────────────────────────────────────────────
// Основний експорт плагіна
// ──────────────────────────────────────────────────────────────────────────────
export function themesPlugin(): Plugin {
  return {
    name: 'vite-plugin-themes',

    // ───── DEV (vite dev)
    configureServer(server) {
      // Мінімальний middleware під /themes/**
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = req.url || ''
          if (!url.startsWith('/themes/')) return next()

          // Роутинг запитів до відповідних handler'ів
          if (url === '/themes/themes-config.js') {
            return await handleRegistry(res)
          }

          if (/^\/themes\/[^/]+\/theme\.css$/.test(url)) {
            return handleThemeCss(url, res)
          }

          if (/^\/themes\/[^/]+\/images\/.+$/.test(url)) {
            return handleThemeImage(url, res)
          }

          return next()
        } catch (e: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(String(e?.message || e))
        }
      })

      // Підключаємо watcher для тем
      attachWatcher(server)
    },

    // ───── BUILD (vite build)
    async generateBundle(this: RollupPluginContext) {
      if (!fs.existsSync(SRC_THEMES_DIR)) return

      const ids = fs
        .readdirSync(SRC_THEMES_DIR)
        .filter(d => isThemeDir(path.join(SRC_THEMES_DIR, d)))

      const reg: Registry = { themes: [] }

      for (const id of ids) {
        // 1) CSS → dist/themes/<id>/theme.css
        const css = compileCss(id)
        if (css) {
          this.emitFile({ type: 'asset', fileName: `${OUT_BASE}/${id}/theme.css`, source: css })
        }

        // 2) images/** → dist/themes/<id>/images/**
        const imgDir = path.join(SRC_THEMES_DIR, id, 'images')
        const rels = walkFiles(imgDir, imgDir)
        for (const rel of rels) {
          const abs = path.join(imgDir, rel)
          this.emitFile({
            type: 'asset',
            fileName: `${OUT_BASE}/${id}/images/${rel}`,
            source: fs.readFileSync(abs),
          })
        }

        // 3) Конфіг (TS) + images → у реєстр
        const cfg = await readThemeConfig(id)
        const { urls } = collectImages(id)
        reg.themes.push({ id, ...cfg, images: urls })
      }

      // 4) Один реєстр на всі теми + A/B конфіг
      reg.themes.sort((a, b) => a.styleId - b.styleId)
      const abTests = await readABTestsConfig()
      if (abTests) reg.abTests = abTests
      this.emitFile({
        type: 'asset',
        fileName: `${OUT_BASE}/themes-config.js`,
        source: `window.THEMES_CONFIG = ${JSON.stringify(reg, null, 2)};`,
      })
    },
  }
}
