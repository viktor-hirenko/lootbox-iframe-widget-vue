<template>
  <div class="loot-box-spin-wheel-container">
    <img :src="themeImages.wheelouterglow" class="wheel-outer-glow" alt="" />
    <div class="lamps">
      <img
        :src="themeImages.lampsstate1"
        class="lamp"
        :class="[
          running ? 'lamp-spin-animation-1' : 'lamp-waiting-animation-1',
          active ? 'will-change-opacity' : '',
        ]"
        alt=""
      />
      <img
        :src="themeImages.lampsstate2"
        class="lamp"
        :class="[
          running ? 'lamp-spin-animation-2' : 'lamp-waiting-animation-2',
          active ? 'will-change-opacity' : '',
        ]"
        alt=""
      />
      <img :src="themeImages.lampsholders" class="lamp-holders" alt="" />
    </div>
    <img :src="themeImages.wheelframe" class="wheel-frame" alt="" />
    <div class="wheel-sectors-mask">
      <div
        class="wheel-sectors"
        :style="wheelSectorsStyles"
        id="wheel_sectors"
        :class="{
          'waiting-spin-animation': !running && !winAnimationStarted,
          'will-change-transform': running || (!running && !winAnimationStarted && active),
        }"
      >
        <img :src="themeImages.wheelsectorsbg" class="wheel-bg" alt="" />
        <svg class="bonus-type" viewBox="0 0 100 100" width="100" height="100">
          <defs>
            <path id="circle" d=" M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
          </defs>
          <g
            v-for="(section, index) in sectionsData"
            :key="index"
            class="sector"
            :style="sectorTransform(index)"
            :class="{
              ...winnerClass(index),
              'will-change-transform': running && active,
            }"
          >
            <text class="loot-box-prize-type" :font-size="getFontSize(section.type, 'bonus')">
              <textPath xlink:href="#circle" startOffset="50%" text-anchor="middle">
                {{ section.type }}
              </textPath>
            </text>
            <text
              class="loot-box-sum"
              :x="SUM_PRIZE_POSITION_X"
              :y="SUM_PRIZE_POSITION_Y"
              :font-size="getFontSize(section.prizeText, 'sum')"
              text-anchor="end"
            >
              {{ section.prizeText }}
            </text>
            <text
              class="loot-box-currency"
              :x="CURRENCY_POSITION_X"
              :y="CURRENCY_POSITION_Y"
              :font-size="getFontSize(section.prizeText, 'currency')"
              text-anchor="end"
            >
              {{ section.prizeCurrency }}
            </text>
          </g>
        </svg>
        <img
          :src="themeImages.wheelsectorsblurred"
          class="wheel-bg wheel-blurred"
          alt=""
          :style="{ opacity: `${motionBlurOpacity}` }"
        />
        <img :src="themeImages.sectorborder" class="sector-border" alt="" />
      </div>
      <img
        :src="themeImages.wheelmask"
        class="wheel-mask"
        :class="{ 'will-change-transform': running && active }"
        alt=""
        :style="{
          opacity: `${maskOpacity}`,
          transform: `rotate(${randomAngle}deg)`,
        }"
      />
    </div>
    <img :src="themeImages.pointerShadow" class="wheel-pointer-shadow" alt="" />
    <img :src="themeImages.wheelpointer" class="wheel-pointer" alt="" />
    <img
      :src="themeImages.center"
      class="wheel-center"
      :class="{ 'wheel-center--hidden': isPromoActive && showWinAnimation && isSheepReady }"
      alt=""
    />
    <!--
      Літнє промо KingWheel: анімація овечки поверх центру колеса лише під час win-стану.
      Прив'язано до showWinAnimation, тому зникає одночасно з win-frame/winanimation
      (≈ timeToPopup = 9с, ~4 цикли SVG-анімації 2.15с — без правок самого SVG).
      isPromoActive виставляється у bootstrap.js (window.currentTheme.isPromoActive).
    -->
    <img
      v-if="isPromoActive && showWinAnimation"
      :src="themeImages['promo-center-anim']"
      class="wheel-center-sheep"
      alt=""
      @load="isSheepReady = true"
    />
    <div class="center-frame">
      <img
        :src="themeImages.centerbg"
        class="center-bg"
        :class="{
          'center-bg-animation-pause': maskOpacity > CENTER_BG_PAUSE_THRESHOLD,
          'will-change-transform': maskOpacity <= CENTER_BG_PAUSE_THRESHOLD && active,
        }"
        :style="{ opacity: `${1 - maskOpacity + OPACITY_OFFSET}` }"
        alt=""
      />
      <img
        v-if="!running && !winAnimationStarted"
        :src="themeImages.centerflashes"
        class="center-flashes"
        alt=""
      />
    </div>
    <img
      v-if="showWinAnimation"
      :src="themeImages.winframe"
      class="win-frame"
      alt=""
      :style="{ transform: `rotate(${randomAngle}deg)` }"
    />
    <img
      v-if="showWinAnimation && winAnimationSrc"
      :src="winAnimationSrc"
      class="win-animation"
      alt=""
      :style="{ opacity: winAnimationOpacity }"
    />
    <img
      v-if="!running && !winAnimationStarted"
      :src="themeImages.purplewave"
      class="purple-wave"
      alt=""
    />
    <div class="preload">
      <img v-if="running" :src="themeImages.winframe" alt="" />
      <img v-if="running" :src="themeImages.wheelmask" alt="" />
    </div>
  </div>
  <FpsMonitor />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useAnalytics } from './composables/useAnalytics'
import { useImagePreloader } from './composables/useImagePreloader'
import { usePostMessageBus } from './composables/usePostMessageBus'
import { useWheelAnimation } from './composables/useWheelAnimation'
import { useWinAnimationPreloader } from './composables/useWinAnimationPreloader'
import FpsMonitor from './components/FpsMonitor.vue'

import type { LootboxMessages, Sector } from './types'
import { processSectorsFromUrl } from './utils/sectors-parser'

// Позиціонування тексту в секторах (SVG координати)
const SUM_PRIZE_POSITION_X = 89
const SUM_PRIZE_POSITION_Y = 52
const CURRENCY_POSITION_X = 88.7
const CURRENCY_POSITION_Y = 56
const SECTOR_ANGLE: number = 45

// Пороги для анімаційних ефектів
const CENTER_BG_PAUSE_THRESHOLD: number = 0.3
const OPACITY_OFFSET: number = 0.4
const PRELOADER_FADE_DELAY: number = 500

// Дефолтні розміри шрифтів (fallback якщо тема не має fontSizes)
const DEFAULT_FONT_SIZES = {
  sum: {
    short: '10',
    medium: '8',
    long: '7',
    veryLong: '6',
    extraLong: '4',
    max: '3',
  },
  currency: {
    short: '3',
    long: '2',
  },
  bonus: {
    default: '3.7',
    short: '3.7',
    medium: '3',
    long: '2',
  },
} as const

// Адаптивні розміри шрифтів — беремо з теми або використовуємо дефолтні
const FONT_SIZES = window.currentTheme?.fontSizes ?? DEFAULT_FONT_SIZES

// Конфігурація теми з bootstrap.js (завантажується динамічно)
const themeTimings = window.currentTheme?.timings

// Аналітика — відправка подій напряму в FullStory з iframe
const { track } = useAnalytics()
const currentTheme = window.currentTheme?.name ?? 'unknown'
const currentProject = window.currentTheme?.project ?? 'unknown'

// Стан анімації колеса
const running = ref<boolean>(false)
const winAnimationStarted = ref<boolean>(false)
const showWinAnimation = ref<boolean>(false)
const angle = ref<number>(0)
const randomAngle = ref<number>(0)
const motionBlurOpacity = ref<number>(0)
const maskOpacity = ref<number>(0)
const winAnimationOpacity = ref<number>(1)
const animationId = ref<number | null>(null)

// Готовність промо-овечки до показу: true тільки після @load <img> анімації.
// Поки false — статичну овечку (.wheel-center) НЕ ховаємо, інакше між
// створенням <img> і відмалюванням першого кадру animated WebP виникає
// порожній кадр (блік). Скидається разом із showWinAnimation.
const isSheepReady = ref<boolean>(false)

// URL для win-анімації (створюється через Blob URL для перезапуску @keyframes)
const winAnimationSrc = ref<string>('')

// Таймінги анімації (можуть бути перевизначені з теми)
const spinDuration = ref<number>(8000)
const timeToPopup = ref<number>(4000)
const winAnimationOffset = ref<number>(0) // На скільки мс раніше показувати win-анімацію

// Переможний сектор (встановлюється ззовні через postMessage)
const winnerSection = ref<number | null>(null)
const hasWinSection = computed(() => winnerSection.value !== null)

// Зображення теми (завантажуються динамічно)
const themeImages = window.currentTheme?.images ?? {}

// Активність лутбокса з URL параметрів
const active = window.currentTheme?.isActive ?? true

// Сезонне промо KingWheel — обчислюється у bootstrap.js (theme.promoPeriod або ?promo=force/disable).
// Тут потрібно лише для overlay овечки в win-стані; решта (стилі/ассети) уже підмінена ззовні.
const isPromoActive = window.currentTheme?.isPromoActive ?? false

// Парсинг секторів з URL параметрів з валідацією
// Виконується один раз при ініціалізації для оптимізації продуктивності
const sectionsData = ((): Sector[] => {
  if (!window.currentTheme?.sectors || !window.currentTheme?.sectorsType) return []

  // Обробляємо сектори з URL параметрів після маунту компонента:
  // парсинг, валідація кількості, створення структурованих об'єктів
  const sectors = processSectorsFromUrl(
    window.currentTheme.sectors,
    window.currentTheme.sectorsType
  )
  if (sectors && sectors.isValid) {
    return sectors.sectors
  }
  return []
})()

// Класи для переможного сектора
const winnerClass = computed(() => {
  return (index: number) => ({
    winSector:
      winnerSection.value !== null && index === winnerSection.value && winAnimationStarted.value,
  })
})

// Стилі обертання колеса
const wheelSectorsStyles = computed(() => ({
  transform: `rotate(${angle.value}deg)`,
}))

// Розрахунок позиції сектора в градусах
const sectorTransform = (index: number): { transform: string } => {
  return {
    transform: `rotate(${index * SECTOR_ANGLE}deg)`,
  }
}

/**
 * Адаптивний розмір шрифту залежно від довжини тексту
 * Запобігає переповненню тексту в секторах
 * Використовує розміри з конфігурації теми або дефолтні
 */
const getFontSize = (text: string | undefined, type: 'sum' | 'currency' | 'bonus'): string => {
  if (!text) return FONT_SIZES.bonus.default

  const length = text.length

  switch (type) {
    case 'sum':
      if (length < 3) return FONT_SIZES.sum.short
      if (length < 5) return FONT_SIZES.sum.medium
      if (length < 8) return FONT_SIZES.sum.long
      if (length < 10) return FONT_SIZES.sum.veryLong
      if (length < 12) return FONT_SIZES.sum.extraLong
      return FONT_SIZES.sum.max

    case 'currency':
      return length < 9 ? FONT_SIZES.currency.short : FONT_SIZES.currency.long

    case 'bonus':
      if (length < 15) return FONT_SIZES.bonus.short
      if (length < 20) return FONT_SIZES.bonus.medium
      return FONT_SIZES.bonus.long
  }
}

/**
 * Валідація переможного сектора від бекенда
 * Захист від некорректних даних та fallback на сектор 0
 */
const validateWinnerSection = (value: number): number => {
  if (value >= 0 && value <= 7 && Number.isInteger(value)) {
    return value
  }
  console.error('Невірний winnerSection від бекенда:', value)
  return 0
}

// Комунікація з батьківським вікном через postMessage
const { postToParent } = usePostMessageBus<LootboxMessages>(
  {
    // Слухаємо: команда запуску колеса від сайту
    startSpin: () => {
      runWheel()
      // Аналітика: відправляємо подію напряму в FullStory
      track('Spin Started', { theme: currentTheme, project: currentProject })
    },

    // Слухаємо: команда відправки виграшного сектора
    winSector: sector => {
      winnerSection.value = validateWinnerSection(sector)
    },
  },
  {
    onlyParent: true, // Безпека: приймаємо тільки від батьківського вікна
  }
)

// Анімація колеса з двофазною логікою
const { runWheel, setSpinEndCallback } = useWheelAnimation(
  {
    running,
    winAnimationStarted,
    showWinAnimation,
    angle,
    randomAngle,
    motionBlurOpacity,
    maskOpacity,
    winAnimationOpacity,
    animationId,
    winnerSection,
    hasWinSection,
  },
  spinDuration,
  timeToPopup,
  winAnimationOffset,
  sectionsData
)

// Callback після завершення анімації
setSpinEndCallback(prize => {
  // Старий спосіб: відправляємо у parent сайт (залишаємо для зворотної сумісності)
  postToParent('spinEnd', { prize, timestamp: Date.now() })

  // Отримуємо дані виграшного сектора для розширеної аналітики
  const winningSector = winnerSection.value ?? 0
  const sectorData = sectionsData[winningSector]

  // Новий спосіб: аналітика напряму в FullStory/GA4 з iframe
  track('Spin Ended', {
    prize,
    sector: winningSector,
    theme: currentTheme,
    project: currentProject,
    // Розширені параметри для аналітики призів
    prize_type: sectorData?.type ?? 'unknown',
    prize_value: sectorData?.prizeText ?? '',
    prize_currency: sectorData?.prizeCurrency ?? '',
  })
})

// Передзавантаження win-анімації через Blob URL
// SVG завантажується один раз у пам'ять, при кожному показі створюється унікальний Blob URL
// Це вирішує проблему: @keyframes перезапускаються БЕЗ мережевого запиту
const {
  preload: preloadWinAnimation,
  createFreshUrl: createWinAnimationUrl,
  revokeUrl: revokeWinAnimationUrl,
} = useWinAnimationPreloader(themeImages.winanimation)

// Створюємо Blob URL при показі win-анімації, звільняємо при приховуванні.
// Також скидаємо isSheepReady на старті win-стану — щоб при повторному
// спіні статична овечка не ховалася до того, як animated WebP знов
// відмалює перший кадр (інакше повернеться блік між кадрами).
watch(showWinAnimation, show => {
  if (show) {
    winAnimationSrc.value = createWinAnimationUrl()
    isSheepReady.value = false
  } else if (winAnimationSrc.value) {
    revokeWinAnimationUrl(winAnimationSrc.value)
    winAnimationSrc.value = ''
  }
})

// Composable для відстеження реального завантаження зображень
const { waitForImages } = useImagePreloader()

/**
 * Плавно ховає прелоадер з fade-out анімацією
 */
const hidePreloader = (): void => {
  const preloaderBg = document.querySelector('#preloader-bg') as HTMLElement
  if (preloaderBg) {
    preloaderBg.style.opacity = '0'
    setTimeout(() => {
      preloaderBg.style.display = 'none'
    }, PRELOADER_FADE_DELAY)
  }
}

// Ініціалізація компонента
onMounted(async () => {
  // Завантаження конфігурації теми (якщо доступна)
  if (themeTimings) {
    spinDuration.value = themeTimings.spinDuration
    timeToPopup.value = themeTimings.timeToPopup
    winAnimationOffset.value = themeTimings.winAnimationOffset
  }

  running.value = false

  // Чекаємо РЕАЛЬНОГО завантаження всіх зображень колеса
  // Це вирішує проблему: прелоадер ховався по таймеру, а не по факту завантаження
  // Fallback таймаут 15 секунд — на випадок якщо якесь зображення зламане
  await waitForImages('.loot-box-spin-wheel-container img', 15000)

  // Тільки ПІСЛЯ завантаження — ховаємо прелоадер
  hidePreloader()

  // Тільки ПІСЛЯ завантаження — повідомляємо батьківське вікно
  postToParent('lootboxReady')

  // Аналітика: подія завантаження віджета
  track('Widget Loaded', { theme: currentTheme, project: currentProject })

  // Подія для воронки конверсій A/B-тестування: view → start → complete
  track('Lootbox View', { theme: currentTheme, project: currentProject })

  // Передзавантаження win-анімації у фоні ПІСЛЯ критичних асетів
  // Не блокує UI — завантаження йде паралельно
  // Спін триває 14 секунд — SVG точно встигне завантажитись
  preloadWinAnimation()

  // Warm-up HTTP-кешу для овечки (animated WebP, ~380 KB).
  // Виключена з критичного прелоаду в bootstrap.js (DEFERRED_IMAGE_KEYS),
  // бо потрібна лише в момент перемоги в промо-режимі. Тут тихо «прогріваємо»
  // кеш браузера у фоні з низьким пріоритетом — коли спрацює v-if на
  // .wheel-center-sheep, <img> візьме файл уже з кешу без мережевого запиту.
  if (isPromoActive && themeImages['promo-center-anim']) {
    const sheepImg = new Image()
    sheepImg.decoding = 'async'
    sheepImg.fetchPriority = 'low'
    sheepImg.src = themeImages['promo-center-anim']
  }
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})
</script>

<style>
/*
  Стилі завантажуються динамічно з теми (з URL параметрів ?style=N) через bootstrap.js для запобігання FOUC
  Архітектура:
  - index.html (базові)
  - bootstrap.js (завантаження) → themes/{theme}/theme.css
*/
</style>
