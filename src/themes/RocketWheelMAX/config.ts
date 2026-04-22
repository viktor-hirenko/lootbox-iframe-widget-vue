import type { ThemeConfig } from '../../types/theme'

/**
 * RocketWheelMAX — нова скіна для проекту Rocket.
 *
 * ⚠️ ТИМЧАСОВО: assets/styles повністю продубльовані з RocketWheelPro
 * як placeholder до приходу фінальних дизайн-матеріалів для MAX.
 * Коли надійдуть фінальні ассети — просто замінити вміст
 * `src/themes/RocketWheelMAX/images/` та `src/themes/RocketWheelMAX/theme.scss`
 * без правок логіки/конфігів/реєстрів.
 */
export const config: ThemeConfig = {
  name: 'RocketWheelMAX',
  styleId: 6,
  project: 'rocket',
  isProjectDefault: false,
  backgroundColor: '#000a12',
  timings: {
    spinDuration: 8000,
    timeToPopup: 9000,
    winAnimationOffset: 0, // Стандартна поведінка (0 = показати після зупинки колеса)
  },
  logic: {
    numberOfSpins: 1,
    winSection: 0,
  },
}
