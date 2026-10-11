
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend ./frontend
COPY src/main/resources/static/css/style.css ./src/main/resources/static/css/style.css
RUN npm --prefix frontend run build

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
COPY --from=frontend /app/src/main/resources/static/react-build ./src/main/resources/static/react-build
RUN mvn clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
