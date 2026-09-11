# ---- Этап 1: сборка ----
FROM node:24-alpine AS builder

WORKDIR /app

# Зависимости отдельным слоем: пока package-lock.json не менялся, Docker
# переиспользует кэш вместо повторной установки. ci, а не install: ставится
# ровно то, что в lock-файле, а расхождение с package.json валит сборку
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# На проде фронт и API стоят за одним nginx, поэтому базовый адрес пуст
# и запросы уходят относительными путями. Задать его нужно обязательно:
# frontend/.env с dev-значением http://localhost:8080 лежит в репозитории,
# и без .dockerignore vite запёк бы этот адрес в прод-бандл
ENV VITE_API_BASE_URL=""
RUN npm run build

# Service worker моков нужен только в разработке, а Vite копирует public в dist
# как есть. Регистрировать его в прод-бандле некому, раздавать чужой воркер
# с боевого домена незачем
RUN rm -f dist/mockServiceWorker.js

# ---- Этап 2: раздача ----
# Unprivileged-вариант официального образа: мастер-процесс не под root,
# внутри слушается 8080, наружу порт публикует compose. Обычный nginx:alpine
# держит мастер под root ради порта 80 — правило «контейнеры не под root»
# (ARCHITECTURE §7.1) это нарушает
FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
