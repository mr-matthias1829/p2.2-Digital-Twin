# ---------- build stage ----------
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# copy only pom first (speeds up rebuilds when only source changes)
COPY pom.xml .

# download dependencies SEPARATELY (huge cache win!)
RUN mvn dependency:go-offline -B

# now copy source
COPY src ./src

# build the fat jar (skip tests for faster build; remove -DskipTests to run tests)
RUN mvn -B -DskipTests package

# ---------- runtime stage ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# copy the jar produced by the build stage (wildcard to support any artifact name)
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]