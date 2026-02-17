# lootbox-iframe-widget-vue

Незалежний Vue 3 iframe-віджет лутбокса з модульною системою тем, A/B тестуванням та аналітикою.

## Основні можливості

- **Мультипроектність** — підтримка проектів Rocket, King, Thor з окремими темами
- **A/B тестування** — автоматичний розподіл користувачів між варіантами тем
- **Аналітика** — інтеграція з FullStory та Google Analytics 4
- **PostMessage API** — двостороння комунікація з батьківським сайтом
- **Оптимізована анімація** — requestAnimationFrame без GSAP

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Documentation

**[Повна документація проекту](DOCUMENTATION.md)** - детальний опис архітектури, системи тем, API, анімації та тестування
