# Build stage
FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# Copy gradle files
COPY build.gradle.kts settings.gradle.kts ./

# Download dependencies
RUN gradle build -x test --no-daemon || true

# Copy source code
COPY src ./src

# Build application
RUN gradle clean bootJar -x test --no-daemon

# Runtime stage
FROM bellsoft/liberica-openjre-debian:17 AS runtime
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy JAR from build stage
ARG JAR_FILE=build/libs/*.jar
COPY --from=build /app/${JAR_FILE} app.jar

# Create non-root user
RUN groupadd -r -g 1001 appuser && \
    useradd -r -u 1001 -g appuser -m -s /bin/bash appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8080

# JVM options for container environment
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Start the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]