# Astro AI — Блог

Блог для [aiastro.ru](https://aiastro.ru), собранный в единой визуальной системе с основным
сайтом: тёмный фон, золотой акцент `#b8844c`, шрифты Anticva (заголовки) и Involve (текст),
арочные карточки-«окна» в духе церковной готики.

Next.js (App Router) со статическим экспортом (`output: "export"`) — сайт полностью
статический и деплоится на GitHub Pages через Actions.

## Разработка

```bash
npm install
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

## Как добавить новую статью

Каждая статья — markdown-файл в `src/content/posts/*.md` с frontmatter:

```md
---
title: "Заголовок статьи"
excerpt: "Короткое описание для карточки и меты."
date: "2026-07-22"
category: "Прогнозы" # Натальная карта / Совместимость / Прогнозы / Общее (или новая)
cover: "/images/prediction.png" # путь к обложке из /public
---

Текст статьи в Markdown.
```

Сборка сама подхватит новый файл — отдельный слаг генерируется из имени файла
(`retrogradny-merkuriy.md` → `/blog/retrogradny-merkuriy/`).

## Сборка и локальный статический предпросмотр

```bash
npm run build       # создаёт статический сайт в ./out
npx serve out        # или любой статический сервер
```

## Деплой

### GitHub Pages

Пуш в `main` автоматически собирает и публикует сайт на GitHub Pages через
`.github/workflows/deploy.yml`. Убедитесь, что в настройках репозитория
(Settings → Pages → Source) выбрано **GitHub Actions**.

`next.config.ts` подставляет `basePath: "/blog-astro"` только когда в окружении есть
`GITHUB_PAGES=true` (workflow выставляет её сам) — локальный `npm run dev`/`npm run build`
работает без basePath.

### Docker (self-hosted / VPS)

Multi-stage сборка: статический экспорт Next.js собирается в node-контейнере, а
раздаётся через `nginx:alpine`. `GITHUB_PAGES` внутри Docker-сборки не выставляется,
поэтому сайт раздаётся с корня домена (без `/blog-astro`).

```bash
docker compose up -d --build
```

Сайт поднимется на [http://localhost:8080](http://localhost:8080) (порт задаётся в
`docker-compose.yml`). Либо вручную:

```bash
docker build -t astro-ai-blog .
docker run -d -p 8080:80 --name astro-ai-blog astro-ai-blog
```

## Шрифты и изображения

Шрифты `Involve` и `Anticva`, а также обложки (`/public/images`) — фирменные активы
Astro AI, скопированные с основного сайта для визуальной консистентности блога.
