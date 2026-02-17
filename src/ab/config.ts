/**
 * Конфігурація A/B-тестів лутбоксів
 *
 * Визначає варіанти тем для кожного проекту.
 * Розподіл користувачів відбувається в bootstrap.js на основі хешу userId.
 * Зміни iframe URL не потрібні — A/B працює прозоро.
 *
 * Щоб додати новий тест:
 * 1. Додай запис з ключем = назва проекту
 * 2. Вкажи унікальний testId (для аналітики)
 * 3. Опиши варіанти з темами та вагами (сума ваг = 100)
 */

export interface ABVariant {
  id: string
  theme: string
  weight: number
}

export interface ABTest {
  testId: string
  variants: ABVariant[]
}

export type ABTestsConfig = Record<string, ABTest>

export const abTests: ABTestsConfig = {
  rocket: {
    testId: 'rocket_theme_v1',
    variants: [
      { id: 'A', theme: 'RocketWheelLite', weight: 50 },
      { id: 'B', theme: 'RocketWheelPro', weight: 50 },
    ],
  },
  // Приклад для іншого проекту:
  // king: {
  //   testId: 'king_theme_v1',
  //   variants: [
  //     { id: 'A', theme: 'KingWheel', weight: 70 },
  //     { id: 'B', theme: 'KingWheelV2', weight: 30 },
  //   ],
  // },
}
