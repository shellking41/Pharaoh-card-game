# 1) build stage - Maven + JDK21
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

# 2) runtime stage - JDK21
FROM openjdk:21-jdk-slim
WORKDIR /app

# Másoljuk át a jar fájlt a build stageről
COPY --from=build /workspace/target/*.jar app.jar

# HTTP + Debug port
EXPOSE 8080
EXPOSE 5005

# Debug környezeti változó
ENV JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"



# Indítás (sleep csak akkor kell, ha adatbázisra várunk)
ENTRYPOINT ["sh", "-c", "sleep 5 && java -jar /app/app.jar"]
