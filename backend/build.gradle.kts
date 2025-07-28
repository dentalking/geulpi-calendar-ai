plugins {
    java
    id("org.springframework.boot") version "3.2.5"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.geulpi"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
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
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-graphql")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    
    // Kafka
    implementation("org.springframework.kafka:spring-kafka")
    
    // Database
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.liquibase:liquibase-core")
    
    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    
    // Google APIs
    implementation("com.google.api-client:google-api-client:2.2.0")
    implementation("com.google.apis:google-api-services-calendar:v3-rev20231215-2.0.0")
    implementation("com.google.oauth-client:google-oauth-client-jetty:1.34.1")
    implementation("com.google.maps:google-maps-services:2.2.0")
    implementation("com.google.cloud:google-cloud-speech:4.15.0")
    implementation("com.google.cloud:google-cloud-vision:3.39.0")
    
    // OpenAI
    implementation("com.theokanning.openai-gpt3-java:service:0.18.2")
    
    // Utils
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    implementation("org.apache.commons:commons-lang3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    
    // Rate limiting
    implementation("com.github.vladimir-bukhtoyarov:bucket4j-core:7.6.0")
    
    // GraphQL scalar types
    implementation("com.graphql-java:graphql-java-extended-scalars:20.2")
    
    // Configuration processor
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    
    // Development only
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    
    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.graphql:spring-graphql-test")
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("org.testcontainers:testcontainers")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:kafka")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testRuntimeOnly("com.h2database:h2")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

springBoot {
    mainClass.set("com.geulpi.calendar.GeulpiCalendarApplication")
}