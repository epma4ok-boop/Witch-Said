# Вселенная говорит — Telegram Mini App

Мистическое приложение-предсказатель с анимированным солнечным затмением на canvas.

## Возможности

- Анимированное неоновое затмение на canvas (без библиотек)
- 300 предсказаний с циничным взрослым юмором — по 100 на категорию:
  - Любовь (красный)
  - Работа (синий)
  - Деньги (зелёный)
- Магическая анимация рун при «вызове»
- Физический эффект тряски при касании (Lissajous tremor)
- Звуковой синтезатор на Web Audio API (без внешних файлов)
- Пульс-кольца при переключении категории
- История предсказаний в localStorage со свайп-открытием
- Поддержка Telegram WebApp API (share, invite, expand)

## Стек

- React + Vite + TypeScript
- Tailwind CSS v4
- Canvas 2D API
- Web Audio API

## Структура

```
artifacts/witch-said/
├── index.html              # Точка входа + Google Fonts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── pages/
│   │   └── Home.tsx        # Главный экран, вся логика UI
│   ├── components/
│   │   ├── EclipseCanvas.tsx   # Весь canvas: затмение, руны, текст
│   │   └── HistoryPanel.tsx    # Панель истории со свайпом
│   ├── data/
│   │   └── predictions.ts  # 300 предсказаний
│   └── hooks/
│       └── useMysticSound.ts   # Web Audio синтезатор
├── package.json
└── vite.config.ts
```

## Запуск локально

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```
