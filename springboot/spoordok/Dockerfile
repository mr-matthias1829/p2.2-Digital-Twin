# ---------- build stage ----------
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# Only copy pom.xml first to leverage dependency caching
COPY pom.xml .

# Download dependencies only (cached if pom.xml didn't change)
RUN mvn dependency:go-offline -B

# Now copy sources
COPY src ./src

# Build jar
RUN mvn -B -DskipTests package

# ---------- runtime stage ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
