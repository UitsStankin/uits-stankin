# ---- Этап 1: сборка ----
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Копируем Gradle-обёртку и конфиги
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle

# Скачиваем зависимости (кэшируется Docker-ом, если build.gradle не менялся)
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# Копируем исходники и собираем
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ---- Этап 2: запуск ----
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]