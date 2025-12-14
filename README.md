# Tic Tac Toe — Run instructions

Prerequisites:
- Docker installed OR Java 17 + Maven.

Run with Docker (recommended):
1. Copy project to target machine (git clone or scp).
2. In project root run:
   - Linux/macOS: ./run.sh
   - Windows: run.bat
3. Open: http://<device-ip>:8080

Run with docker-compose:
1. docker-compose up -d
2. Open: http://<device-ip>:8080

Run JAR (no Docker):
1. Build: mvn clean package
2. Run: java -jar target/tictactoe-1.0.0.jar
3. Open: http://<device-ip>:8080

Firewall:
- Ensure port 8080 is open (ufw, firewall rules, cloud security group).

Troubleshooting:
- Check container logs: docker logs -f tictactoe
- Check app health: curl http://localhost:8080/api/health
