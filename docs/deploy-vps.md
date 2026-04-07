# Деплой MoviePlatform на VPS (Docker Compose)

Ниже — самый прямой путь поднять проект на VPS через готовые прод-конфиги: docker-compose и скрипт деплоя.

## 0) Что потребуется

- VPS (рекомендовано: 2–4 vCPU, 4+ GB RAM, 30+ GB SSD). Если RAM мало — добавьте swap.
- Домен (или хотя бы публичный IP).
- Доступ по SSH.

## 1) DNS и порты

1. В DNS заведите `A`-запись домена на IP VPS (например `example.com -> 1.2.3.4`).
2. Откройте порты на сервере:
   - обязательно: `22` (SSH), `80` (HTTP)
   - желательно: `443` (HTTPS)
   - если поднимаете вторую версию параллельно: откройте выбранный порт, например `8080`

## 2) Подготовка VPS (Ubuntu/Debian)

Подключитесь по SSH и выполните:

```bash
sudo apt-get update
sudo apt-get -y upgrade

# Базовые утилиты
sudo apt-get install -y ca-certificates curl git

# Docker + compose plugin (официальный репозиторий Docker)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (опционально) запуск docker без sudo
sudo usermod -aG docker $USER
# перелогиньтесь, чтобы группа применилась
```

Проверка:

```bash
docker --version
docker compose version
```

## 3) Загрузка проекта на сервер

Самый удобный способ — через Git.

```bash
# выберите директорию, где будет лежать проект
mkdir -p ~/apps
cd ~/apps

# если репозиторий приватный — используйте SSH-ключи или токен
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> movieplatform
cd movieplatform
```

Если Git недоступен — альтернатива: залить архив/rsync, но Git обычно проще.

## 4) Настройка переменных окружения для production

Проект в production ожидает env-файл, который читает скрипт `scripts/deploy.sh`.

1. На сервере создайте env-файл на основе шаблона:

```bash
cp .env.example .env.production
```

2. Откройте и заполните значения:

```bash
nano .env.production
```

Минимально важные поля (самые частые причины, почему не стартует):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET` (должен быть длинным и случайным)
- `APP_URL` (публичный URL сайта, например `https://example.com`)
- `CORS_ORIGINS` (минимум ваш публичный домен)
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `MINIO_PUBLIC_ENDPOINT` (должен быть доступен из браузера)
- `NEXT_PUBLIC_API_URL` (публичный API URL)
- `NEXT_PUBLIC_APP_URL` (публичный URL фронта)
- `NEXT_PUBLIC_MINIO_URL` (если хотите раздавать MinIO через reverse proxy)

Рекомендованные production-значения для URL при использовании встроенного Nginx из compose:

- `NEXT_PUBLIC_APP_URL=https://example.com`
- `NEXT_PUBLIC_API_URL=https://example.com/api/v1`
- `MINIO_PUBLIC_ENDPOINT=https://example.com/minio`
- `NEXT_PUBLIC_MINIO_URL=https://example.com/minio`

Секреты:

- Сгенерируйте `JWT_SECRET`, например:

```bash
openssl rand -hex 32
```

Почта (SMTP): в prod-compose по умолчанию поднимается Mailpit (как «ловушка писем»). Для реальной отправки замените `SMTP_HOST/PORT/USER/PASSWORD` на реальный SMTP.

## 5) Первый запуск (production)

В репозитории уже есть готовый скрипт деплоя.

```bash
chmod +x ./scripts/deploy.sh
./scripts/deploy.sh
```

Скрипт:
- подтянет последние изменения (git pull)
- соберёт Docker-образы
- поднимет сервисы
- выполнит `prisma migrate deploy`

Проверка статуса:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Проверка health:

- `http://<ваш-домен>/nginx-health`
- `http://<ваш-домен>/api/v1/health`

## 5.1) Параллельный деплой второй версии (v2) рядом со старой

Если на сервере уже крутится старая версия на `http://89.108.66.37` (порт 80) и вы не хотите её трогать, поднимайте новую **в другой папке** и на **другом внешнем порту**.

Почему так: в старом [docker-compose.prod.yml](docker-compose.prod.yml) зафиксированы `container_name` и имя сети — из‑за этого второй стек будет конфликтовать. Для параллельного запуска в репозитории добавлен отдельный compose: [docker-compose.prod.v2.yml](docker-compose.prod.v2.yml).

### Шаги на VPS

1) Создайте отдельную папку и склонируйте репозиторий:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> movieplatform-v2
cd movieplatform-v2
```

2) Создайте production env:

```bash
cp .env.example .env.production
nano .env.production
```

3) Для теста по IP на порту 8080 выставьте минимум такие URL:

- `APP_URL=http://89.108.66.37:8080`
- `NEXT_PUBLIC_APP_URL=http://89.108.66.37:8080`
- `NEXT_PUBLIC_API_URL=http://89.108.66.37:8080/api/v1`
- `MINIO_PUBLIC_ENDPOINT=http://89.108.66.37:8080/minio`
- `NEXT_PUBLIC_MINIO_URL=http://89.108.66.37:8080/minio`

И обязательно:

- `JWT_SECRET` — уникальный секрет (не как в dev)
- `CORS_ORIGINS=http://89.108.66.37:8080` (и/или другие разрешённые origin)

4) Запустите v2-деплой:

```bash
chmod +x ./scripts/deploy-v2.sh
./scripts/deploy-v2.sh
```

По умолчанию [docker-compose.prod.v2.yml](docker-compose.prod.v2.yml) публикует Nginx на `8080:80`. Если порт 8080 занят — можно изменить переменной окружения при запуске:

```bash
MP_V2_HTTP_PORT=8082 ./scripts/deploy-v2.sh
```

5) Проверка:

- `http://89.108.66.37:8080/nginx-health`
- `http://89.108.66.37:8080/api/v1/health`

Когда убедитесь, что всё ок, дальше обычно делают нормальный домен + HTTPS и уже переключают трафик на новую версию.

## 6) Про HTTPS (важно)

Текущий production compose публикует только порт 80. Для нормального продакшена обычно нужен HTTPS.

Простые варианты:

1) **Быстро для теста:** оставить HTTP на 80.

2) **Рекомендовано:** поставить Nginx/Caddy на хосте для TLS (certbot/Let’s Encrypt) и проксировать на Docker.
   - Для этого удобно изменить публикацию порта контейнерного Nginx на `127.0.0.1:8080:80`, а хостовый Nginx слушает `80/443`.

Если хотите — скажите, какой у вас домен/ОС на VPS и хотите ли HTTPS через Let’s Encrypt, я дам точный конфиг (Nginx или Caddy) под ваш случай.
