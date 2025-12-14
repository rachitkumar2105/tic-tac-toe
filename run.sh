#!/usr/bin/env sh
set -e
mvn clean package -DskipTests
docker build -t tictactoe:latest .
docker rm -f tictactoe || true
docker run -d --name tictactoe -p 8080:8080 --restart unless-stopped tictactoe:latest
echo "App running at http://localhost:8080"
