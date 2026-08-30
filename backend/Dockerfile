# ---- Этап 1: сборка ----
FROM eclipse-temurin:25-jdk AS builder

WORKDIR /app

# Копируем Gradle-обёртку и конфиги
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle

# Зависимости качаются отдельным слоем: пока build.gradle.kts не менялся,
# Docker переиспользует кэш вместо повторной загрузки. Ошибка здесь валит
# сборку намеренно — иначе она всплывёт позже, на шаге bootJar, и сообщение
# будет уже про другое.
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

# Копируем исходники и собираем
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ---- Этап 2: запуск ----
FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

# Приложение только читает jar и слушает порт выше 1024 — root ему не нужен.
# Пробой в приложении под root даёт root внутри контейнера, а дальше остаётся
# только выбраться наружу.
RUN groupadd --system uits && useradd --system --gid uits uits
USER uits

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
