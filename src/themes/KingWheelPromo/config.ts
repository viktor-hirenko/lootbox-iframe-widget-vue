import type { ThemeConfig } from '../../types/theme'

export const config: ThemeConfig = {
  name: 'KingWheelPromo',
  styleId: 5,
  project: 'king',
  isProjectDefault: false,
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
