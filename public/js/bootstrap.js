/**
 * bootstrap.js
 *
 * Стартовий скрипт iFrame-віджета.
 * Виконується ДО main.ts та відповідає за:
 * - Парсинг URL параметрів
 * - Вибір та завантаження теми (CSS + зображення)
 * - Підготовку середовища для Vue додатку
 */

;(async function () {
  // === КОНСТАНТИ ===9
  const IMAGE_LOAD_TIMEOUT_MS = 6000

  // === ДОПОМІЖНІ ФУНКЦІЇ ===

  /** Отримання параметрів з URL запиту */
  function readUrlParams() {
    const searchParams = new URLSearchParams(location.search)
    const activeParam = searchParams.get('active')
    return {
      themeName: searchParams.get('style') || null,
      project: searchParams.get('project') || null,
      sectors: searchParams.get('sectors') || null,
      sectorsType: searchParams.get('sectors_type') || null,
      active: activeParam !== 'false', // true за замовчуванням, false тільки якщо явно вказано
      userId: searchParams.get('user_id') || null,
      ab: searchParams.get('ab') === 'true',
    }
  }

  /** Отримання конфігурації тем */
  function getThemesConfig() {
    const themesConfig = window.THEMES_CONFIG || { themes: [] }
    // console.log('[bootstrap] Конфігурація тем:', themesConfig)
    return themesConfig
  }

  /**
   * Вибір теми з валідацією належності до проекту.
   *
   * Пріоритети:
   * 1. ?style= без ?project= → використовуємо тему (зворотна сумісність)
   * 2. ?project= без ?style= → дефолтна тема проекту
   * 3. ?project= + ?style= → валідуємо належність теми до проекту
   *    - якщо тема належить проекту → використовуємо її
   *    - якщо ні → ігноруємо style, використовуємо дефолт проекту + console.warn
   * 4. Fallback → перша тема
   */
  function selectTheme(themesConfig, params) {
    const themes = Array.isArray(themesConfig.themes) ? themesConfig.themes : []

    // Допоміжна функція: знайти дефолтну тему проекту
    const findProjectDefault = projectName => {
      // Спочатку шукаємо тему з isProjectDefault: true
      const defaultTheme = themes.find(t => t.project === projectName && t.isProjectDefault)
      if (defaultTheme) return defaultTheme

      // Якщо дефолт не знайдено — беремо будь-яку тему проекту
      return themes.find(t => t.project === projectName) || null
    }

    // Сценарій 1: Передано ТІЛЬКИ ?style= (без ?project=)
    // Зворотна сумісність — використовуємо тему без валідації
    if (params.themeName && !params.project) {
      const byName = themes.find(t => t.name === params.themeName)
      if (byName) return byName
    }

    // Сценарій 2: Передано ТІЛЬКИ ?project= (без ?style=)
    // Використовуємо дефолтну тему проекту
    if (params.project && !params.themeName) {
      const projectDefault = findProjectDefault(params.project)
      if (projectDefault) return projectDefault
    }

    // Сценарій 3: Передано ОБИДВА параметри — валідуємо належність
    if (params.project && params.themeName) {
      const requestedTheme = themes.find(t => t.name === params.themeName)

      if (requestedTheme) {
        // Перевіряємо: чи належить тема до вказаного проекту?
        if (requestedTheme.project === params.project) {
          // ✅ Тема належить проекту — використовуємо її
          return requestedTheme
        } else {
          // ❌ Тема НЕ належить проекту — ігноруємо style
          console.warn(
            `[Lootbox] Theme "${params.themeName}" belongs to project "${requestedTheme.project}", ` +
              `not "${params.project}". Using default theme for "${params.project}" instead.`
          )
          const projectDefault = findProjectDefault(params.project)
          if (projectDefault) return projectDefault
        }
      } else {
        // Тема не знайдена — використовуємо дефолт проекту
        console.warn(
          `[Lootbox] Theme "${params.themeName}" not found. Using default theme for "${params.project}".`
        )
        const projectDefault = findProjectDefault(params.project)
        if (projectDefault) return projectDefault
      }
    }

    // Сценарій 4: Fallback — перша тема
    return themes[0] || null
  }

  /** Встановлення data-theme атрибута */
  function setThemeDataAttribute(theme) {
    document.documentElement.setAttribute('data-theme', theme.name)
  }

  /** Завантаження CSS теми */
  function loadThemeStylesheet(theme) {
    const href = `themes/${theme.name}/theme.css`
    const linkEl = document.createElement('link')
    linkEl.rel = 'stylesheet'
    linkEl.href = href
    // Promise який чекає завантаження CSS файлу
    const ready = new Promise(resolve => linkEl.addEventListener('load', resolve, { once: true }))
    document.head.appendChild(linkEl)
    return ready
  }

  /** Попереднє завантаження зображень теми для запобігання FOUC */
  async function waitForAllImages(imageUrls, timeoutMs) {
    // console.log('[bootstrap] Завантаження зображень:', imageUrls?.length)
    // Функція для завантаження одного зображення
    const waitForOne = src =>
      new Promise(resolve => {
        // Створюємо зображення з оптимізацією для швидкого завантаження
        const img = new Image()
        img.loading = 'eager' // Не чекаємо видимості - завантажуємо одразу
        img.decoding = 'async' // Не блокуємо UI під час декодування
        img.fetchPriority = 'high' // Пріоритет над іншими ресурсами
        img.src = src

        // Сучасний спосіб: використовуємо img.decode() з fallback
        if (img.decode) {
          img
            .decode() // Декодуємо зображення
            .then(resolve) // Успіх → завершуємо Promise
            .catch(() => {
              // Помилка → fallback на старий спосіб
              img.onload = resolve
              img.onerror = resolve
            })
        } else {
          // Fallback для старих браузерів
          img.onload = resolve // Завантаження успішне
          img.onerror = resolve // Помилка завантаження (тоже завершуємо)
        }
      })

    // Чекаємо завантаження з таймаутом - не блокуємо UI довго
    await Promise.race([
      // Завантажуємо всі зображення одночасно для швидкості
      Promise.all((imageUrls || []).map(waitForOne)),
      // Захист від довгого очікування - максимум 6 секунд
      new Promise(r => setTimeout(r, timeoutMs)),
    ])
    // console.log('[bootstrap] Всі зображення завантажені')
  }

  /**
   * Побудувати мапу зображень для Vue компонентів
   *
   * Перетворює список URL зображень у зручну мапу:
   * Input:  ["themes/default/images/bg.webp", "themes/default/images/logo.svg"]
   * Output: { "bg": "themes/default/images/bg.webp", "logo": "themes/default/images/logo.svg" }
   *
   * Це дозволяє Vue компонентам динамічно звертатися до зображень по імені:
   * <img :src="currentTheme.images.bg" /> замість довгих URL
   */
  function buildImageMap(imageUrls) {
    const map = {}
    for (const url of imageUrls || []) {
      const base = (url.split('/').pop() || '').trim()
      if (!base) continue
      map[base.replace(/\.[^.]+$/, '')] = url
    }
    return map
  }

  // === A/B ТЕСТУВАННЯ ===

  /** Детерміністичний хеш рядка (FNV-1a) → число */
  function fnv1aHash(str) {
    var hash = 2166136261
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }
    return hash
  }

  /** Отримати або створити стабільний userId для A/B розподілу */
  function getOrCreateABUserId() {
    var key = 'ab_user_id'
    try {
      var id = localStorage.getItem(key)
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(key, id)
      }
      return id
    } catch {
      return crypto.randomUUID()
    }
  }

  /** Обрати варіант за кумулятивними вагами */
  function pickVariant(variants, hash) {
    var bucket = hash % 100
    var cumulative = 0
    for (var i = 0; i < variants.length; i++) {
      cumulative += variants[i].weight
      if (bucket < cumulative) return variants[i]
    }
    return variants[variants.length - 1]
  }

  /**
   * Визначити A/B варіант для проекту
   *
   * @returns {{ testId: string, variantId: string, theme: object } | null}
   */
  function resolveABVariant(themesConfig, project) {
    var abTests = themesConfig.abTests
    if (!abTests || !project || !abTests[project]) return null

    var test = abTests[project]
    if (!test.variants || !test.variants.length) return null

    var userId = getOrCreateABUserId()
    var hash = fnv1aHash(userId + ':' + test.testId)
    var variant = pickVariant(test.variants, hash)

    var themes = Array.isArray(themesConfig.themes) ? themesConfig.themes : []
    var variantTheme = themes.find(function (t) {
      return t.name === variant.theme
    })

    if (!variantTheme) {
      console.warn('[Lootbox A/B] Theme "' + variant.theme + '" not found for variant ' + variant.id)
      return null
    }

    return {
      testId: test.testId,
      variantId: variant.id,
      theme: variantTheme,
    }
  }

  /** Експорт рантайму теми для Vue */
  function exposeThemeRuntime(theme, params, imagesMap, abResult) {
    window.currentTheme = {
      styleId: theme.styleId,
      name: theme.name,
      project: theme.project || null,
      isProjectDefault: theme.isProjectDefault || false,
      backgroundColor: theme.backgroundColor || null,
      sectors: params.sectors,
      sectorsType: params.sectorsType,
      isActive: params.active,
      userId: params.userId,
      stylesReady: true,
      imagesReady: true,
      get ready() {
        return this.stylesReady && this.imagesReady
      },
      timings: theme.timings || {},
      logic: theme.logic || {},
      fontSizes: theme.fontSizes || null,
      images: imagesMap,
      abTest: abResult
        ? { testId: abResult.testId, variantId: abResult.variantId }
        : null,
    }

    // Застосовуємо CSS клас для відключення анімацій якщо лутбокс неактивний
    if (!params.active) {
      document.getElementById('app').classList.add('lootbox-inactive')
    }

    // Захист від FOUC — сигналізуємо готовність теми для main.ts
    document.documentElement.setAttribute('data-theme-ready', '1')
  }

  // === ГОЛОВНА ЛОГІКА ===

  const urlParams = readUrlParams()
  const themesConfig = getThemesConfig()

  let selectedTheme = selectTheme(themesConfig, urlParams)

  // A/B тестування: спрацьовує ТІЛЬКИ якщо явно передано ?ab=true
  // та НЕ вказано конкретну тему (?style=)
  var abResult = null
  if (urlParams.project && urlParams.ab && !urlParams.themeName) {
    abResult = resolveABVariant(themesConfig, urlParams.project)
    if (abResult) {
      selectedTheme = abResult.theme
    }
  }

  setThemeDataAttribute(selectedTheme)

  const cssReady = loadThemeStylesheet(selectedTheme)
  // Виключаємо winanimation з початкового завантаження — вона завантажиться на фоні після появи колеса
  const criticalImages = (selectedTheme.images || []).filter(url => !url.includes('winanimation'))
  await waitForAllImages(criticalImages, IMAGE_LOAD_TIMEOUT_MS)
  await cssReady

  const imageMap = buildImageMap(selectedTheme.images)
  exposeThemeRuntime(selectedTheme, urlParams, imageMap, abResult) // window.currentTheme = { ... }
})()
