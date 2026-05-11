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
    // ?promo=force|disable — QA-override сезонного промо (KingWheel).
    // Дозволяє перевірити обидва стани без зміни системної дати/конфігу.
    // Будь-яке інше значення → null → працює дата з theme.promoPeriod.
    const promoRaw = searchParams.get('promo')
    const promo = promoRaw === 'force' || promoRaw === 'disable' ? promoRaw : null
    return {
      themeName: searchParams.get('style') || null,
      project: searchParams.get('project') || null,
      sectors: searchParams.get('sectors') || null,
      sectorsType: searchParams.get('sectors_type') || null,
      active: activeParam !== 'false', // true за замовчуванням, false тільки якщо явно вказано
      userId: searchParams.get('user_id') || null,
      ab: searchParams.get('ab') === 'true',
      promo, // 'force' | 'disable' | null — override промо, див. isPromoActive()
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

  /** Ключ зображення без розширення з URL (basename → ключ для мапи images) */
  function imageKeyFromUrl(url) {
    const base = (url.split('/').pop() || '').trim()
    if (!base) return ''
    return base.replace(/\.[^.]+$/, '')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Сезонне промо (KingWheel — "Літнє промо")
  //
  // Ідея: одна тема (KingWheel) має два візуальні стани — класика та промо.
  // У period (theme.promoPeriod) на колесі автоматично з'являється літній
  // дизайн + анімація овечки в момент виграшу. Поза періодом — класика.
  // Жодних змін на батьківському сайті чи редеплою не треба: при кожному
  // завантаженні iframe bootstrap.js перераховує isPromoActive і:
  //   1) виставляє/знімає <html data-king-promo="active"> → стилі _promo.scss
  //   2) підмінює мапу зображень promo-X → X → Vue не знає про режим
  //   3) кладе isPromoActive у window.currentTheme → App.vue вмикає овечку
  //
  // Хардкод 'KingWheel' навмисний: промо запитували саме під цю тему. Якщо
  // знадобиться промо для іншої теми — узагальнити через флаг у config.ts
  // (напр. theme.promo.enabled) і свій data-attribute / partial.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Чи активне сезонне промо KingWheel.
   *
   * Пріоритети:
   *   1. ?promo=force   → завжди true  (QA: перевірити промо поза датами)
   *   2. ?promo=disable → завжди false (QA: класика всередині дат)
   *   3. promoPeriod з config.ts → true, якщо Date.now() ∈ [start, end]
   *
   * Інші теми завжди отримують false — це навмисно (див. блок-коментар вище).
   */
  function isPromoActive(theme, params) {
    if (!theme || theme.name !== 'KingWheel') return false
    if (params.promo === 'force') return true
    if (params.promo === 'disable') return false
    const p = theme.promoPeriod
    if (!p || typeof p.start !== 'string' || typeof p.end !== 'string') return false
    const start = Date.parse(p.start)
    const end = Date.parse(p.end)
    if (Number.isNaN(start) || Number.isNaN(end)) return false
    const now = Date.now()
    return now >= start && now <= end
  }

  /**
   * Список зображень для критичного прелоаду (запобігає FOUC).
   *
   * winanimation завжди виключаємо — вона важка і завантажується у фоні
   * вже після появи колеса (див. useWinAnimationPreloader.ts).
   *
   * Поза промо: викидаємо ВСІ promo-* (зайвий трафік на ~500 KB).
   * У промо: тягнемо тільки promo-* + ті класичні, у яких немає promo-аналога,
   * щоб не качати парами одне і те саме (наприклад, center.webp і
   * promo-center.webp — у промо потрібен лише другий).
   */
  function pickPreloadImages(imageUrls, isPromo) {
    let urls = (imageUrls || []).filter(u => !u.includes('winanimation'))
    if (!isPromo) {
      return urls.filter(u => {
        const k = imageKeyFromUrl(u)
        return !k.startsWith('promo-')
      })
    }
    const promoOverrides = new Set()
    for (const u of urls) {
      const k = imageKeyFromUrl(u)
      if (k.startsWith('promo-')) {
        promoOverrides.add(k.replace(/^promo-/, ''))
      }
    }
    return urls.filter(u => {
      const k = imageKeyFromUrl(u)
      if (k.startsWith('promo-')) return true
      if (promoOverrides.has(k)) return false
      return true
    })
  }

  /**
   * Побудувати мапу зображень для Vue компонентів.
   *
   * Input:  ["themes/default/images/bg.webp", "themes/default/images/logo.svg"]
   * Output: { "bg": "themes/default/images/bg.webp", "logo": "themes/default/images/logo.svg" }
   *
   * Vue звертається до зображень по basename: <img :src="themeImages.bg" />
   *
   * Промо (isPromo=true): для кожного ключа promo-X записуємо його URL під
   * ключем X, тож Vue без жодних умов отримує літню версію того самого
   * зображення (center → promo-center.webp і т.д.) — без розгалуження логіки
   * у шаблонах.
   *
   * ВИНЯТОК: promo-center-anim — це УНІКАЛЬНИЙ промо-асет (анімація овечки),
   * у класики аналога нема. Якщо його теж "розпакувати" → з'явиться ключ
   * "center-anim", якого ніхто не очікує, а App.vue все одно бере його під
   * повним ім'ям themeImages['promo-center-anim']. Тому виключаємо.
   * Аналогічно треба буде робити з будь-яким новим promo-only ассетом.
   *
   * @param {string[]} imageUrls
   * @param {boolean} isPromo
   */
  function buildImageMap(imageUrls, isPromo) {
    const map = {}
    for (const url of imageUrls || []) {
      const key = imageKeyFromUrl(url)
      if (!key) continue
      map[key] = url
    }
    if (isPromo) {
      for (const key of Object.keys(map)) {
        // promo-only асети залишаємо тільки під promo-ключем — див. JSDoc вище
        if (key.startsWith('promo-') && key !== 'promo-center-anim') {
          const target = key.replace(/^promo-/, '')
          map[target] = map[key]
        }
      }
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
   * @param {object} themesConfig - Конфігурація тем з abTests
   * @param {string} project - Назва проекту
   * @param {string|null} urlUserId - user_id з URL (реальний користувач з проду)
   * @returns {{ testId: string, variantId: string, theme: object } | null}
   */
  function resolveABVariant(themesConfig, project, urlUserId) {
    var abTests = themesConfig.abTests
    if (!abTests || !project || !abTests[project]) return null

    var test = abTests[project]
    if (!test.variants || !test.variants.length) return null

    var userId = urlUserId || getOrCreateABUserId()
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
  function exposeThemeRuntime(theme, params, imagesMap, abResult, isPromo) {
    window.currentTheme = {
      styleId: theme.styleId,
      name: theme.name,
      project: theme.project || null,
      isProjectDefault: theme.isProjectDefault || false,
      backgroundColor: theme.backgroundColor || null,
      isPromoActive: !!isPromo,
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
    abResult = resolveABVariant(themesConfig, urlParams.project, urlParams.userId)
    if (abResult) {
      selectedTheme = abResult.theme
    }
  }

  setThemeDataAttribute(selectedTheme)

  // Промо-режим (KingWheel "Літнє промо"): обчислюємо ОДИН раз при ініціалізації.
  // Атрибут на <html> керує промо-стилями (themes/KingWheel/styles/_promo.scss),
  // а сам прапорець isPromo передається у buildImageMap/exposeThemeRuntime,
  // щоб Vue (App.vue) теж знав про режим (для overlay овечки на win-стані).
  const isPromo = isPromoActive(selectedTheme, urlParams)
  if (isPromo) {
    document.documentElement.setAttribute('data-king-promo', 'active')
  } else {
    document.documentElement.removeAttribute('data-king-promo')
  }

  const cssReady = loadThemeStylesheet(selectedTheme)
  // Прелоад без winanimation і з урахуванням промо (див. pickPreloadImages)
  const criticalImages = pickPreloadImages(selectedTheme.images, isPromo)
  await waitForAllImages(criticalImages, IMAGE_LOAD_TIMEOUT_MS)
  await cssReady

  const imageMap = buildImageMap(selectedTheme.images, isPromo)
  exposeThemeRuntime(selectedTheme, urlParams, imageMap, abResult, isPromo) // window.currentTheme = { ... }
})()
