@echo off
mvn clean package -DskipTests
docker build -t tictactoe:latest .
docker rm -f tictactoe 2>nul || rem
docker run -d --name tictactoe -p 8080:8080 --restart unless-stopped tictactoe:latest
echo App running at http://localhost:8080
