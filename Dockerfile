# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# GITHUB_PAGES is intentionally unset here: self-hosted deployments serve
# from the domain root, not the /blog-astro GitHub Pages subpath.
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runner

COPY --from=build /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
