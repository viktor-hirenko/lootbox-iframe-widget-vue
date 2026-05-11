// src/types/globals.d.ts
export {}

declare global {
  interface Window {
    /**
     * FullStory SDK (завантажується динамічно якщо передано fs_org параметр)
     */
    FS?: {
      event: (name: string, properties?: Record<string, unknown>) => void
      identify: (uid: string, properties?: Record<string, unknown>) => void
      setUserVars: (properties: Record<string, unknown>) => void
    }
    /**
     * Конфігурація всіх тем (генерується плагіном у themes/themes-config.js)
     */
    THEMES_CONFIG?: {
      themes: Array<{
        id: string
        name: string
        styleId: number
        project: string
        isProjectDefault: boolean
        backgroundColor?: string
        timings: {
          spinDuration: number
          timeToPopup: number
          winAnimationOffset: number
        }
        logic: {
          numberOfSpins: number
          winSection: number
        }
        promoPeriod?: { start: string; end: string }
        images: string[]
      }>
      abTests?: Record<
        string,
        {
          testId: string
          variants: Array<{
            id: string
            theme: string
            weight: number
          }>
        }
      >
    }

    /**
     * Рантайм дані теми (встановлюється в bootstrap.js)
     */
    currentTheme:
      | {
          styleId: number
          name: string
          project: string | null
          isProjectDefault: boolean
          backgroundColor?: string
          stylesReady: boolean
          imagesReady: boolean
          sectors: string | null
          sectorsType: string | null
          isActive: boolean
          userId: string | null
          isPromoActive: boolean
          images: Record<string, string>
          timings: Record<string, number>
          logic: Record<string, unknown>
          fontSizes: {
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
          } | null
          abTest: {
            testId: string
            variantId: string
          } | null
          readonly ready: boolean
        }
      | undefined
  }
}
