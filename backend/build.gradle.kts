plugins {
	java
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "ru.stankin"
version = "0.0.1-SNAPSHOT"
description = "Project for Uits"

// Spring Boot 4.1.1 приносит Tomcat 11.0.24 с тремя критическими CVE
// (CVE-2026-68525, CVE-2026-65905, CVE-2026-65182), закрытыми в 11.0.25.
// Удалить строку вместе с обновлением Spring Boot до версии с 11.0.25+,
// иначе она начнёт удерживать Tomcat ниже BOM.
extra["tomcat.version"] = "11.0.25"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-liquibase")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-restclient")
	
	compileOnly("org.projectlombok:lombok")
	runtimeOnly("org.postgresql:postgresql")
	annotationProcessor("org.projectlombok:lombok")
	
	implementation("io.jsonwebtoken:jjwt:0.13.0")
	implementation("org.mapstruct:mapstruct:1.6.3")
	annotationProcessor("org.mapstruct:mapstruct-processor:1.6.3")
	annotationProcessor("org.projectlombok:lombok-mapstruct-binding:0.2.0")
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.0")
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.jsoup:jsoup:1.23.2")
	implementation("net.coobird:thumbnailator:0.4.21")
	implementation("com.bucket4j:bucket4j_jdk17-core:8.19.0")

	// Тесты
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:junit-jupiter:1.21.4")
	testImplementation("org.testcontainers:postgresql:1.21.4")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testImplementation("org.springframework.boot:spring-boot-starter-restclient-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("com.tngtech.archunit:archunit-junit5:1.5.0")

}

tasks.withType<Test> {
	useJUnitPlatform()
}
