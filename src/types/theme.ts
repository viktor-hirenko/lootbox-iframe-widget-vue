/**
 * FontSizes — налаштування розмірів шрифтів для текстів у секторах колеса
 */
export interface FontSizesConfig {
  sum: {
    short: string
    medium: string
    long: string
    veryLong: string
    extraLong: string
    max: string
  }
  currency: {
    short: string
    long: string
  }
  bonus: {
    default: string
    short: string
    medium: string
    long: string
  }
}

/**
 * ThemeConfig — конфігурація теми для lootbox колеса:
 * - name/styleId: ідентифікація теми
 * - project: назва проекту (king, rocket, winspirits тощо)
 * - isProjectDefault: чи є ця тема дефолтною для проекту
 * - timings: тривалість анімацій (обертання, показ результату, прелоадер)
 * - logic: логіка гри (кількість обертів, виграшний сектор)
 * - fontSizes: налаштування розмірів шрифтів (опціонально)
 */
export interface ThemeConfig {
  name: string
  styleId: number
  project: string
  isProjectDefault: boolean
  timings: {
    spinDuration: number
    timeToPopup: number
    winAnimationOffset: number // Час (мс) на скільки раніше показувати win-анімацію (0 = стандартно)
  }
  logic: {
    numberOfSpins: number
    winSection: number
  }
  fontSizes?: FontSizesConfig
  backgroundColor?: string // Колір фону для теми (опціонально)
  /** Опціональний період сезонного промо (ISO-8601 з offset) */
  promoPeriod?: { start: string; end: string }
}
