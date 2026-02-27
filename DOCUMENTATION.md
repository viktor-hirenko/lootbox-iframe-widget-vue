# Документація проекту: Lootbox iFrame Widget

**Lootbox iFrame Widget** - незалежний Vue 3 компонент для інтеграції в iframe, який дозволяє легко кастомізувати та модифікувати лутбокс під різні активності та сегменти гравців.

- **Незалежний iframe лутбокс** - ізольований компонент
- **Двостороння комунікація** через PostMessage API
- **Конфігурація через query-параметри** - динамічна налаштування
- **Vue 3 + Composition API + TypeScript** - сучасний стек
- **Оптимізована анімація** без GSAP (requestAnimationFrame)
- **Модульна система тем** - легке додавання нових дизайнів

## 📋 Архітектура проекту

### Структура директорій

```
Projects/lootbox-iframe-widget-vue/
├── public/                  # Статичні файли (копіюються в dist)
│   └── js/
│       └── bootstrap.js     # Ранній рантайм + A/B тестування
├── src/
│   ├── ab/                   # A/B тестування
│   │   └── config.ts         # Конфігурація A/B тестів
│   ├── composables/          # Перевикористовувана логіка
│   │   ├── useWheelAnimation.ts    # Анімація колеса
│   │   ├── usePostMessageBus.ts    # PostMessage комунікація
│   │   ├── useAnalytics.ts         # Аналітика (FullStory, GA4)
│   │   ├── useImagePreloader.ts    # Попереднє завантаження зображень
│   │   └── useWinAnimationPreloader.ts # Прелоад win-анімації
│   ├── types/               # TypeScript типи
│   ├── utils/               # Утиліти (парсинг секторів)
│   ├── themes/              # Теми дизайну
│   │   ├── RocketWheelLite/ # Тема Rocket Lite (дефолт для rocket)
│   │   │   ├── config.ts
│   │   │   ├── theme.scss
│   │   │   ├── images/
│   │   │   └── styles/
│   │   ├── RocketWheelPro/  # Тема Rocket Pro
│   │   │   ├── config.ts
│   │   │   ├── theme.scss
│   │   │   ├── images/
│   │   │   └── styles/
│   │   ├── KingWheel/       # Тема King (дефолт для king)
│   │   │   ├── config.ts
│   │   │   ├── theme.scss
│   │   │   ├── images/
│   │   │   └── styles/
│   │   └── ThorWheel/       # Тема Thor (дефолт для thor)
│   │       ├── config.ts
│   │       ├── theme.scss
│   │       ├── images/
│   │       └── styles/
│   └── App.vue              # Головний компонент
├── vite/                    # Конфігурація збірки
│   └── plugins/
│       └── vite-plugin-themes.ts
├── dist/                    # Зібрані файли
│   ├── js/
│   │   └── bootstrap.js     # Копія з public/js/
│   └── themes/              # Генеровані файли тем (з src/themes/)
│       ├── themes-config.js # Конфігурація всіх тем + A/B тести
│       ├── RocketWheelLite/
│       │   ├── theme.css
│       │   └── images/
│       ├── RocketWheelPro/
│       │   ├── theme.css
│       │   └── images/
│       ├── KingWheel/
│       │   ├── theme.css
│       │   └── images/
│       └── ThorWheel/
│           ├── theme.css
│           └── images/
└── test-lootbox.html        # Тестовий прототип
```

### Архітектурні принципи

**Поточна архітектура:**

- Динамічна генерація конфігурацій
- Модульна структура
- Легка кастомізація через query-параметри

### Система збірки та розподілу ресурсів

**Vite Plugin System** (`vite-plugin-themes.ts`) автоматично:

- Генерує `themes-config.js` з конфігурацією всіх тем
- Компілює SCSS файли в CSS для кожної теми
- Копіює зображення в `dist/themes/`
- Створює готову структуру для розподілу

**Bootstrap.js** (`public/js/bootstrap.js`):

- **Ранній рантайм** - виконується ДО main.ts
- **Парсинг URL параметрів** для вибору теми
- **Динамічне завантаження** CSS стилів теми
- **Попереднє завантаження** всіх зображень теми
- **Запобігання FOUC** (Flash of Unstyled Content)
- **Підготовка середовища** для Vue додатку
- **Встановлення** `window.currentTheme` з готовими ресурсами

## 📋 Система тем

### Мультипроектна архітектура

Віджет підтримує роботу з **кількома проектами** (Rocket, King, Thor тощо). Кожен проект може мати свої теми з різним дизайном.

**Ключові концепції:**

- **Проект (`project`)** — логічна група тем (наприклад, `rocket`, `king`, `thor`)
- **Тема** — конкретний дизайн колеса (наприклад, `RocketWheelLite`, `KingWheel`, `ThorWheel`)
- **Дефолтна тема проекту** — тема, яка застосовується якщо не вказано конкретну тему

**Приклад структури:**

```
Проект Rocket:
├── RocketWheelLite (дефолт для Rocket)
└── RocketWheelPro

Проект King:
└── KingWheel (дефолт для King)

Проект Thor:
└── ThorWheel (дефолт для Thor)
```

### Розміщення тем у src/, а не в public/

Усі конфіги, стилі та зображення тем зберігаються в `src/themes`. Це забезпечує:

- **Типобезпеку**: `config.ts` проходить перевірку TypeScript
- **Єдиний збірочний пайплайн**: SCSS компілюється, зображення оптимізуються, ресурси автоматично копіюються у `dist/`
- **Керованість та версіонування**: теми версіонуються разом із кодом, зміни легко відслідковуються та відкочуються
- **Автоматизацію**: спеціальний Vite-плагін генерує `themes-config.js` без ручного втручання

### Структура теми

```
src/themes/
├── RocketWheelLite/
│   ├── config.ts
│   ├── theme.scss
│   ├── images/
│   └── styles/
│       ├── _animations.scss
│       └── _tokens.scss
├── RocketWheelPro/
│   ├── config.ts
│   ├── theme.scss
│   ├── images/
│   └── styles/
│       ├── _animations.scss
│       └── _tokens.scss
├── KingWheel/
│   ├── config.ts
│   ├── theme.scss
│   ├── images/
│   └── styles/
│       ├── _animations.scss
│       └── _tokens.scss
└── ThorWheel/
    ├── config.ts
    ├── theme.scss
    ├── images/
    └── styles/
        ├── _animations.scss
        └── _tokens.scss
```

### Динамічне завантаження

- **Query-параметри**:
  - `?style=1` - вибір теми за ID (default, crown, тощо)
  - `?sectors=100%20FS;50%20USD` - налаштування секторів
  - `?sectors_type=Free%20Spins;USD` - типи призів для секторів
- **Автоматична компіляція** SCSS в CSS
- **Попереднє завантаження** зображень теми
- **Запобігання FOUC** (Flash of Unstyled Content)

### Життєвий цикл завантаження приложения

**Послідовність виконання:**

1. **index.html** завантажується
2. **bootstrap.js** (`public/js/bootstrap.js`) виконується ДО main.ts
3. **main.ts** чекає готовності теми (`window.currentTheme.ready`)
4. **Vue додаток** ініціалізується тільки після повного завантаження ресурсів

### Система попереднього завантаження ресурсів

**Архітектура завантаження**: Реалізована двоетапна система для запобігання FOUC (Flash of Unstyled Content) та забезпечення миттєвого відображення теми.

**Етап 1: Bootstrap (bootstrap.js)**

- Парсинг URL параметрів та вибір теми
- Завантаження CSS стилів теми
- Попереднє завантаження всіх зображень теми
- Встановлення `window.currentTheme` з готовими ресурсами

**Етап 2: Vue ініціалізація (main.ts)**

- Очікування готовності теми (`window.currentTheme.ready`)
- Запуск Vue додатку тільки після повного завантаження ресурсів
- Fallback механізм з таймаутом (6 сек)

```javascript
// bootstrap.js - завантаження ресурсів теми
const cssReady = loadThemeStylesheet(selectedTheme)
await waitForAllImages(selectedTheme.images, IMAGE_LOAD_TIMEOUT_MS)
await cssReady

// main.ts - синхронізація з готовністю теми
async function waitThemeReady(): Promise<void> {
  while (!window.currentTheme?.ready) {
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS))
  }
}
await waitThemeReady() // Vue ініціалізація
```

**Переваги:**

- Запобігання FOUC (Flash of Unstyled Content)
- Попереднє завантаження CSS стилів теми
- Попереднє завантаження всіх зображень теми в кеш браузера
- Оптимізоване завантаження зображень з `fetchPriority: 'high'`
- Асинхронне декодування зображень без блокування UI
- Гарантована готовність теми перед рендерингом
- Синхронізація завантаження ресурсів з ініціалізацією Vue

### Приклад конфігурації теми

```typescript
// src/themes/RocketWheelLite/config.ts
import type { ThemeConfig } from '../../types/theme'

export const config: ThemeConfig = {
  name: 'RocketWheelLite',
  styleId: 1,
  project: 'rocket', // Належність до проекту
  isProjectDefault: true, // Дефолтна тема для проекту Rocket
  timings: {
    spinDuration: 8000,
    timeToPopup: 9000,
    winAnimationOffset: 0,
  },
  logic: {
    numberOfSpins: 1,
    winSection: 0,
  },
}
```

```typescript
// src/themes/KingWheel/config.ts
import type { ThemeConfig } from '../../types/theme'

export const config: ThemeConfig = {
  name: 'KingWheel',
  styleId: 3,
  project: 'king', // Належність до проекту King
  isProjectDefault: true, // Дефолтна тема для проекту King
  timings: {
    spinDuration: 8000,
    timeToPopup: 9000,
    winAnimationOffset: 2000, // На скільки мс раніше показувати win-анімацію
  },
  logic: {
    numberOfSpins: 1,
    winSection: 0,
  },
  // Кастомні розміри шрифтів (опціонально)
  fontSizes: {
    sum: { short: '8', medium: '7', long: '6', veryLong: '5.5', extraLong: '4', max: '3' },
    currency: { short: '3.3', long: '2' },
    bonus: { default: '3.7', short: '3.7', medium: '3', long: '2' },
  },
}
```

**Обов'язкові поля конфігурації:**

| Поле               | Тип     | Опис                               |
| ------------------ | ------- | ---------------------------------- |
| `name`             | string  | Унікальна назва теми               |
| `styleId`          | number  | Унікальний числовий ID             |
| `project`          | string  | Назва проекту (rocket, king, тощо) |
| `isProjectDefault` | boolean | Чи є ця тема дефолтною для проекту |
| `timings`          | object  | Налаштування часу анімацій         |
| `logic`            | object  | Логіка гри                         |

**Опціональні поля:**

| Поле        | Тип    | Опис                                  |
| ----------- | ------ | ------------------------------------- |
| `fontSizes` | object | Кастомні розміри шрифтів для секторів |

### Створення нової теми

#### Крок 1: Створіть папку теми

```
src/themes/YourThemeName/
├── config.ts           # Конфігурація теми
├── theme.scss          # Головний файл стилів
├── images/             # Зображення теми
│   ├── preloader.svg   # Обов'язково!
│   ├── wheelpointer.webp
│   └── ...
└── styles/
    ├── _animations.scss
    └── _tokens.scss
```

#### Крок 2: Створіть config.ts

```typescript
import type { ThemeConfig } from '../../types/theme'

export const config: ThemeConfig = {
  // === ІДЕНТИФІКАЦІЯ ===
  name: 'YourThemeName', // Унікальна назва теми (PascalCase)
  styleId: 4, // Унікальний числовий ID (не повторюється)

  // === НАЛЕЖНІСТЬ ДО ПРОЕКТУ ===
  project: 'yourproject', // Назва проекту (lowercase)
  isProjectDefault: true, // true = ця тема буде застосована якщо
  // передано ?project=yourproject без ?style=

  // === НАЛАШТУВАННЯ АНІМАЦІЇ ===
  timings: {
    spinDuration: 8000, // Тривалість обертання (мс)
    timeToPopup: 9000, // Час до показу попапу (мс)
    winAnimationOffset: 0, // На скільки мс раніше показувати win-анімацію (0 = стандартно)
  },

  // === ЛОГІКА ГРИ ===
  logic: {
    numberOfSpins: 1, // Кількість обертів
    winSection: 0, // Дефолтний виграшний сектор
  },

  // === ОПЦІОНАЛЬНО: кастомні розміри шрифтів ===
  // fontSizes: { ... }
}
```

**Пояснення полів project та isProjectDefault:**

| Поле               | Призначення                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`          | Визначає до якого проекту належить тема. Використовується для валідації: якщо передано `?project=rocket&style=KingWheel`, віджет проігнорує тему King (бо вона належить проекту `king`, а не `rocket`) і застосує дефолтну тему для Rocket. |
| `isProjectDefault` | Якщо `true`, ця тема буде застосована коли передано тільки `?project=yourproject` без вказання конкретної теми. **Важливо:** Лише одна тема проекту може мати `isProjectDefault: true`.                                                     |

#### Крок 3: Оновіть index.html

Якщо це **новий проект** (не нова тема для існуючого проекту), потрібно:

**3.1. Додати preload для прелоадера:**

```html
<!-- Preload preloader SVGs for all themes -->
<link rel="preload" as="image" href="themes/RocketWheelLite/images/preloader.svg" />
<link rel="preload" as="image" href="themes/RocketWheelPro/images/preloader.svg" />
<link rel="preload" as="image" href="themes/KingWheel/images/preloader.svg" />
<link rel="preload" as="image" href="themes/ThorWheel/images/preloader.svg" />
<link rel="preload" as="image" href="themes/YourThemeName/images/preloader.svg" />
<!-- ← Додати -->
```

**3.2. Додати маппінг в projectDefaults:**

```javascript
var projectDefaults = {
  rocket: 'RocketWheelLite',
  king: 'KingWheel',
  thor: 'ThorWheel',
  yourproject: 'YourThemeName', // ← Додати новий проект
}
```

> **Навіщо projectDefaults?** Inline-скрипт в index.html виконується ДО завантаження themes-config.js, тому він не знає яка тема дефолтна для якого проекту. Цей маппінг дозволяє показати правильний прелоадер одразу.

#### Крок 4: Оновіть test-lootbox.html (опціонально)

Додайте новий проект в селект для тестування:

```html
<select id="projectSelect" class="theme-select">
  <option value="">— Без проекту —</option>
  <option value="rocket">Rocket</option>
  <option value="king">King</option>
  <option value="thor">Thor</option>
  <option value="yourproject">YourProject</option>
  <!-- ← Додати -->
</select>
```

І нову тему:

```html
<select id="themeSelect" class="theme-select">
  <option value="">— Дефолт проекту —</option>
  <option value="RocketWheelLite" data-project="rocket">RocketWheelLite (Rocket)</option>
  <option value="RocketWheelPro" data-project="rocket">RocketWheelPro (Rocket)</option>
  <option value="KingWheel" data-project="king">KingWheel (King)</option>
  <option value="ThorWheel" data-project="thor">ThorWheel (Thor)</option>
  <option value="YourThemeName" data-project="yourproject">YourThemeName (YourProject)</option>
  <!-- ← Додати -->
</select>
```

---

### Додавання теми до існуючого проекту

Якщо потрібно додати ще одну тему для вже існуючого проекту (наприклад, `RocketWheelDark` для проекту Rocket):

1. Створіть тему як описано вище
2. В `config.ts` вкажіть `project: 'rocket'` та `isProjectDefault: false`
3. В `index.html` додайте тільки preload (projectDefaults оновлювати НЕ потрібно)
4. Для використання вказуйте явно: `?project=rocket&style=RocketWheelDark`

---

### Чеклист створення теми

- [ ] Створено папку `src/themes/YourThemeName/`
- [ ] Створено `config.ts` з усіма обов'язковими полями
- [ ] Вказано правильний `project` (lowercase)
- [ ] Встановлено `isProjectDefault: true` якщо це єдина або дефолтна тема проекту
- [ ] Створено `theme.scss`
- [ ] Додано `preloader.svg` в `images/`
- [ ] Оновлено `index.html` (preload + projectDefaults якщо новий проект)
- [ ] Протестовано на `test-lootbox.html`

### SCSS структура

```scss
// theme.scss
@import './styles/tokens';
@import './styles/animations';

.lootbox-theme {
  // Основні стилі теми
}
```

```scss
// _tokens.scss
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --border-radius: 4px;
}
```

```scss
// _animations.scss
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

## 📋 Конфігурація через URL

### Підтримувані параметри

Проект підтримує 8 основних параметрів:

- **`project`** - назва проекту (string, наприклад: `rocket`, `king`)
- **`style`** - назва теми (string, наприклад: `RocketWheelLite`, `KingWheel`)
- **`ab`** - активація A/B тестування (boolean, `true` для активації)
- **`sectors`** - список секторів з призами
- **`sectors_type`** - типи призів для кожного сектора
- **`active`** - активність лутбокса (boolean, за замовчуванням true)
- **`vip_level`** - VIP рівень гравця (число від 0 до максимального рівня на проекті, за замовчуванням 0)
- **`fs_org`** - FullStory Org ID для відстеження взаємодій в iframe (string, опціонально)
- **`user_id`** - ID користувача для передачі в Google Analytics (string, опціонально)

> **Примітка:** Параметр `vip_level` зарезервований для майбутнього використання. Наразі він не впливає на відображення колеса, але в майбутніх версіях може використовуватись для кастомізації дизайну залежно від VIP статусу гравця.

> **FullStory:** Параметр `fs_org` активує запис сесій FullStory всередині iframe. Якщо параметр не передано — FullStory не завантажується.

### Логіка вибору теми

Пріоритети вибору теми:

1. **`?style=` без `?project=`** — використовується вказана тема (зворотна сумісність), A/B вимкнено
2. **`?project=` + `?style=`** — валідація належності теми до проекту, A/B вимкнено:
   - Якщо тема належить проекту — використовується вказана тема
   - Якщо тема **НЕ належить** проекту — ігнорується `style`, використовується дефолт проекту + console.warn
3. **`?project=` + `?ab=true`** (без `?style=`) — A/B тестування:
   - Якщо для проекту налаштовано A/B тест — тема обирається автоматично на основі варіанту користувача
   - Якщо A/B тест не налаштовано — використовується дефолтна тема проекту
4. **`?project=` без `?style=` та без `?ab=true`** — використовується дефолтна тема проекту, A/B вимкнено
5. **Fallback** — перша тема в списку

**Приклад валідації:**

```
?project=rocket&style=KingWheel
// ⚠️ KingWheel належить проекту "king", не "rocket"
// Результат: RocketWheelLite (дефолт для rocket) + warning в консоль
```

### Приклади використання

```
# Використання дефолтної теми проекту (без A/B)
?project=king&sectors=100%20FS;5,000%20USD

# Використання конкретної теми проекту (A/B вимкнено)
?project=rocket&style=RocketWheelPro&sectors=500%20USD

# Зворотна сумісність (без project)
?style=RocketWheelLite&sectors=100%20FS

# A/B тестування (тема обирається автоматично)
?project=rocket&ab=true&sectors=500%20USD;1,000%20USD

# Повний приклад з A/B тестуванням та user_id
?project=rocket&ab=true&user_id=12345&sectors=500%20USD;1,000%20USD&sectors_type=Bonus%20Prize;Bonus%20Prize

# Приклад з FullStory інтеграцією
?project=alpa&fs_org=FWWXX&sectors=500%20USD;1,000%20USD&sectors_type=Bonus%20Prize;Bonus%20Prize
```

## 📋 A/B тестування

Віджет підтримує A/B тестування для порівняння різних тем в межах одного проекту. Система автоматично призначає користувачам варіант теми та відстежує конверсії через аналітику.

### Принцип роботи

1. **Стабільна ідентифікація користувача**: При першому завантаженні генерується унікальний `ab_user_id` (UUID) і зберігається в `localStorage`
2. **Детерміністичне хешування**: Комбінація `userId + testId` хешується алгоритмом FNV-1a для отримання стабільного числа
3. **Розподіл за вагою**: Хеш використовується для вибору варіанту згідно з налаштованими вагами (наприклад, 50/50)
4. **Прозорість**: Результат A/B тесту доступний в `window.currentTheme.abTest` та автоматично додається до всіх аналітичних подій

### Конфігурація A/B тестів

Конфігурація знаходиться в `src/ab/config.ts`:

```typescript
// src/ab/config.ts
export interface ABVariant {
  id: string      // Ідентифікатор варіанту (A, B, C...)
  theme: string   // Назва теми для цього варіанту
  weight: number  // Вага (відсоток користувачів)
}

export interface ABTest {
  testId: string           // Унікальний ID тесту
  variants: ABVariant[]    // Масив варіантів
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
}
```

### Як працює вибір варіанту

```javascript
// bootstrap.js - спрощена логіка
function resolveABVariant(themesConfig, project) {
  const test = themesConfig.abTests[project]
  if (!test) return null

  const userId = getOrCreateABUserId()  // з localStorage або новий UUID
  const hash = fnv1aHash(userId + ':' + test.testId)  // детерміністичний хеш
  const variant = pickVariant(test.variants, hash % 100)  // вибір за вагою

  return {
    testId: test.testId,
    variantId: variant.id,
    theme: findTheme(variant.theme)
  }
}
```

### Коли A/B тест застосовується

A/B тестування **вмикається** тільки якщо:

- Явно передано параметр `?ab=true`
- Вказано `?project=` (назва проекту)
- НЕ вказано `?style=` (конкретна тема)
- Для проекту налаштовано A/B тест в `config.ts`

**Приклад URL з A/B тестуванням:**
```
?project=rocket&ab=true&sectors=500%20USD;1000%20USD
```

### Коли A/B тест НЕ застосовується

A/B тестування **вимикається** якщо:

- Не передано параметр `?ab=true`
- Явно вказано параметр `?style=` — користувач/розробник обрав конкретну тему (навіть якщо передано `?ab=true`)
- Для проекту не налаштовано A/B тест в `config.ts`
- Тема з варіанту не знайдена в реєстрі тем

### Доступ до результату A/B тесту

```javascript
// В консолі браузера
window.currentTheme.abTest
// { testId: 'rocket_theme_v1', variantId: 'A' } або null
```

### Додавання нового A/B тесту

1. Відкрийте `src/ab/config.ts`
2. Додайте новий тест для потрібного проекту:

```typescript
export const abTests: ABTestsConfig = {
  rocket: {
    testId: 'rocket_theme_v1',
    variants: [
      { id: 'A', theme: 'RocketWheelLite', weight: 50 },
      { id: 'B', theme: 'RocketWheelPro', weight: 50 },
    ],
  },
  // Новий тест для проекту king
  king: {
    testId: 'king_theme_v1',
    variants: [
      { id: 'control', theme: 'KingWheel', weight: 80 },
      { id: 'experiment', theme: 'KingWheelNew', weight: 20 },
    ],
  },
}
```

3. Переконайтеся, що всі теми з варіантів існують в `src/themes/`
4. Перезапустіть dev-сервер для оновлення `themes-config.js`

### Тестування A/B функціоналу

```javascript
// Перевірити поточний варіант
console.log(window.currentTheme.abTest)

// Перевірити user ID
console.log(localStorage.getItem('ab_user_id'))

// Скинути user ID для отримання нового варіанту
localStorage.removeItem('ab_user_id')
location.reload()
```

## 📋 Аналітика

Віджет інтегрований з FullStory та Google Analytics 4 для відстеження взаємодій користувачів та аналізу конверсій A/B тестів.

### Провайдери аналітики

| Провайдер | Призначення | Активація |
|-----------|-------------|-----------|
| **FullStory** | Запис сесій, heatmaps | Параметр `?fs_org=XXXXX` |
| **Google Analytics 4** | Конверсії, A/B аналіз | Завжди активний |

### Відстежувані події

| Подія | Коли відправляється | Параметри |
|-------|---------------------|-----------|
| `Widget Loaded` | Після завантаження всіх зображень | `theme`, `project` |
| `Lootbox View` | При монтуванні компонента | `theme`, `project` |
| `Spin Started` | При отриманні `startSpin` від батьківського сайту | `theme`, `project` |
| `Spin Ended` | Після зупинки колеса (за 3 сек до приховання win-анімації) | `prize`, `sector`, `theme`, `project`, `prize_type`, `prize_value`, `prize_currency` |

### Автоматичні параметри

До кожної події автоматично додаються:

```typescript
{
  session_id: string,      // UUID сесії (sessionStorage)
  host: string,            // Домен батьківського сайту (document.referrer)
  env: 'dev' | 'prod',     // Середовище
  ab_test_id?: string,     // ID A/B тесту (якщо активний)
  ab_variant?: string,     // Варіант A/B тесту (якщо активний)
}
```

### GA4 інтеграція

Google Analytics 4 інтегрований через Cloudflare Worker проксі для обходу блокувальників реклами:

```typescript
// src/composables/useAnalytics.ts
const GA4_ENDPOINT = 'https://still-band-a01d.upstars-marbella.workers.dev'
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'
```

### Аналіз A/B конверсій в GA4

1. Відкрийте **Google Analytics** → **Explore** → **Free Form**
2. Додайте вимір: `ab_variant`
3. Додайте метрики: `Event count` для подій `lootbox_view`, `spin_started`, `spin_ended`
4. Порівняйте конверсію між варіантами A та B

### Використання в коді

```typescript
import { useAnalytics } from '@/composables/useAnalytics'

const { track } = useAnalytics()

// Відправка події
track('Custom Event', {
  custom_param: 'value'
})
// A/B параметри додаються автоматично
```

## 📋 Оптимізації

### Vue 3 + Composition API

**Переваги:**

- Краща продуктивність
- Tree-shaking
- TypeScript підтримка
- Модульна архітектура з винесенням важкої логіки в composables

## 📋 Система анімації

### Технічна реалізація

**requestAnimationFrame замість GSAP:**

```typescript
const handleAnimationFrame = (start: number, startAngle: number) => {
  const now = performance.now()
  const t = Math.min(1, (now - start) / duration)
  // Плавна анімація з easing
}
```

**Переваги:**

- Менший розмір бандла (без GSAP)
- Краща продуктивність на мобільних пристроях
- Повний контроль над анімацією
- Асинхронне декодування зображень

### Двофазна логіка роботи

1. **Фаза 1**: Звичайне обертання (3s, linear) - запускається по команді з батьківського сайту
2. **Фаза 2**: Spin to win (14s, ease-out) - при отриманні winnerSection з бекенда

**Динамічне переключення**: Анімація може переключатися між фазами в реальному часі без перезапуску.

### Константи анімації

```typescript
const SPIN_WITHOUT_WIN_DURATION = 3000 // 3 секунди
const SPIN_WITH_WIN_DURATION = 14000 // 14 секунд
const SWITCH_EFFECTS_THRESHOLD = 0.7 // 70% прогресу
```

### Easing функції

```typescript
// Лінійна анімація для звичайного обертання
t = t

// Ease-out для виграшної анімації
t = 1 - Math.pow(1 - t, 4)
```

### Оптимізація продуктивності

- **requestAnimationFrame** для плавної анімації
- **Динамічне переключення** ефектів
- **Асинхронне декодування** зображень
- **Оптимізовані easing** функції

## 📋 PostMessage API

### Вхідні повідомлення

```typescript
// Від батьківського сайту
{
  type: 'startSpin'
}
{
  type: 'winSector',
  data: 5 // номер сектора (0-7)
}
```

### Вихідні повідомлення

```typescript
// До батьківського сайту
{
  type: 'lootboxReady'
}
{
  type: 'winSector',
  data: { sector: 5, timestamp: 1234567890 }
}
{
  type: 'spinEnd',
  data: { prize: '1000 USD', timestamp: 1234567890 }
}
```

### Інтеграція для розробників

#### 1. Підключення iframe

```html
<iframe
  src="https://lootbox.example.com/?sectors=100%20FS&style=default&vip_level=5"
  id="lootbox-iframe"
>
</iframe>
```

> **Примітка:** Параметр `vip_level` можна передати при підключенні iframe для майбутньої кастомізації досвіду залежно від VIP статусу гравця.

#### 2. Запуск анімації

```javascript
const iframe = document.getElementById('lootbox-iframe')
iframe.contentWindow.postMessage({ type: 'startSpin' }, '*')
```

#### 3. Встановлення виграшного сектора

```javascript
// Встановлюємо сектор після запуску анімації
iframe.contentWindow.postMessage(
  {
    type: 'winSector',
    data: 5, // номер сектора (0-7)
  },
  '*'
)
```

#### 4. Обробка результатів

```javascript
window.addEventListener('message', event => {
  if (event.data.type === 'spinEnd') {
    console.log('Приз:', event.data.data.prize)
  }
})
```

### Типи повідомлень

**lootboxReady** - відправляється коли лутбокс готовий до роботи.

**startSpin** - запускає анімацію обертання колеса.

**winSector** - встановлює виграшний сектор (відправляється з батьківського сайту).

**spinEnd** - повідомляє про завершення анімації з результатом.

## 📋 Тестування

### Прототип інтеграції

`test-lootbox.html` демонструє:

- Запуск анімації з батьківського сайту
- Встановлення виграшного сектора через dropdown
- Отримання результатів
- Динамічну зміну конфігурації
- Управління активністю лутбокса
- Логування з префіксами [WIDGET]/[PARENT]

### Запуск тестування

#### 1. Запустити dev сервер

```bash
npm run dev
```

#### 2. Відкрити тестовий файл

```
http://localhost:5173/test-lootbox.html
```

## 📋 Збірка та деплой

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
```

- `dist/` містить готові файли
- `themes-config.js` з конфігураціями всіх тем
- Зображення та стилі

### Розміщення на статичному хостингу

Проект адаптований для роботи як в корені сайту, так і в підпапках:

- **Корінь сайту**: `https://example.com/` - працює без змін
- **Підпапка**: `https://example.com/subfolder/` - працює без змін

Всі ресурси (CSS, зображення, скрипти) використовують відносні шляхи завдяки:

- `base: './'` у `vite.config.ts`
- Відносні шляхи у `bootstrap.js` та генерованих конфігураціях
- Відносні шляхи у `index.html`

Просто завантажте вміст папки `dist/` на ваш статичний хостинг в будь-яку директорію.
