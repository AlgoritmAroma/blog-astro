# Astro AI — Блог

Блог для [aiastro.ru](https://aiastro.ru), собранный в единой визуальной системе с основным
сайтом: тёмный фон, золотой акцент `#b8844c`, шрифты Anticva (заголовки) и Involve (текст),
арочные карточки-«окна» в духе церковной готики.

Next.js (App Router), `output: "standalone"` — полноценный Node-сервер (не статический
экспорт): Postgres-БД, авторизация, админ-панель со своим CRUD статей, модерация
комментариев, API-роуты. Деплоится Docker-контейнером на VPS.

## Разработка

Нужен реальный Postgres — проще всего поднять только `db`-сервис из compose:

```bash
npm install
cp .env.production.sample .env.production   # заполнить POSTGRES_PASSWORD (и остальное)
docker compose up -d db                     # postgres на localhost:5432
cp .env.production.sample .env.local        # заполнить ADMIN_PASSWORD_HASH и SESSION_SECRET
npm run db:seed                             # разово: заполнить БД исходными статьями
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000), админка — на `/admin/login`.

Важно про `.env.local`: Next грузит его через `dotenv-expand`, который воспринимает `$`
как начало подстановки переменной. Bcrypt-хэш всегда содержит `$` (`$2b$10$...`) — каждый
`$` в нём нужно экранировать как `\$`, иначе хэш молча обрежется и логин не сработает
никогда (без явной ошибки). Пример — см. закомментированный экземпляр в `.env.local`.
(В `.env.production`, который читает Docker Compose через `env_file:`, экранировать не
нужно — там нет никакой подстановки переменных, значения передаются как есть.)

## Как добавлять статьи

Основной способ — через админку: `/admin/posts/new` (нужен вход через `/admin/login`).
Там же редактирование (`/admin/posts/[id]/edit`) и модерация комментариев
(`/admin/comments`).

`scripts/seed.ts` (`npm run db:seed`) — идемпотентный скрипт миграции: переносит статьи из
`src/content/posts/*.md` в БД (уже существующие slug'и пропускает). Нужен один раз на
свежей БД (локальной или на VPS) — на непустой безопасно перезапускать.

## Деплой (Docker на VPS)

```bash
cp .env.production.sample .env.production   # заполнить реальные значения
docker compose up -d --build
npm run db:seed   # разово, на своей машине с DATABASE_URL, указывающим на прод-БД
                   # (или через `docker compose exec blog npx tsx scripts/seed.ts`)
```

Сайт поднимется на [http://localhost:8080](http://localhost:8080) (порт — в
`docker-compose.yml`). БД (сервис `db`, `postgres:16-alpine`) и `public/uploads/`
(обложки статей) — volume-ы; без них любой передеплой стирал бы данные и загруженные
картинки.

На VPS перед контейнером должен стоять свой реверс-прокси (nginx/Caddy) для TLS — этот
`docker-compose.yml` его не поднимает, только приложение (3000/8080) и БД.

Образ приложения собирается на `node:22-slim` — не Alpine: `sharp` в этом проекте
установлен только с glibc-биндингом (без musl-варианта), на Alpine он не загрузится.
`pg` (драйвер БД) — чистый JS, к выбору базового образа отношения не имеет.

## Шрифты и изображения

Шрифты `Involve` и `Anticva`, а также обложки (`/public/images`) — фирменные активы
Astro AI, скопированные с основного сайта для визуальной консистентности блога.
