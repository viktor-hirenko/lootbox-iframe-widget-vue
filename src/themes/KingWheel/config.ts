import type { ThemeConfig } from '../../types/theme'

export const config: ThemeConfig = {
  name: 'KingWheel',
  styleId: 3,
  project: 'king',
  isProjectDefault: true,
  backgroundColor: '#F8F7FA',
  timings: {
    spinDuration: 8000,
    timeToPopup: 9000,
    winAnimationOffset: 2000, // Показувати win-анімацію на 2 сек раніше
  },
  logic: {
    numberOfSpins: 1,
    winSection: 0,
  },
  /** Літнє промо: автоматичний сезонний дизайн (див. bootstrap.js + styles/_promo.scss) */
  promoPeriod: {
    start: '2026-05-15T10:00:00+03:00',
    end: '2026-05-29T18:00:00+03:00',
  },
  // Custom font sizes for KingWheel theme (adjust as needed)
  fontSizes: {
    sum: {
      short: '8',
      medium: '7',
      long: '6',
      veryLong: '5.5',
      extraLong: '4',
      max: '3',
    },
    currency: {
      short: '3.3',
      long: '2',
    },
    bonus: {
      default: '3.7',
      short: '3.7',
      medium: '3',
      long: '2',
    },
  },
}
