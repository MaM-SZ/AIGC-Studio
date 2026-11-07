FROM maven:3.9.11-eclipse-temurin-21 AS builder
WORKDIR /app
COPY deploy/railway/maven-settings.xml /opt/maven/settings.xml
COPY server/pom.xml ./pom.xml
COPY server/.mvn ./.mvn
COPY server/src ./src
# Railway does not accept the upstream's custom BuildKit cache IDs.
RUN mvn -B -ntp -s /opt/maven/settings.xml -DskipTests package

FROM eclipse-temurin:21-jre
ENV TZ=Asia/Shanghai
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/server-0.0.1-SNAPSHOT.jar /app/server.jar
# Compose mounts these files; Railway needs them inside the image.
COPY server/config/prompts ./server/config/prompts
ARG RAILWAY_GIT_COMMIT_SHA=unknown
LABEL org.opencontainers.image.source="https://github.com/MaM-SZ/AIGC-Studio" \
      org.opencontainers.image.revision=${RAILWAY_GIT_COMMIT_SHA}
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/server.jar"]
