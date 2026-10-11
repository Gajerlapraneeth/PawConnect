PawConnect quick start: see README.md for the project overview, Neon setup, deployment instructions, and API details.

1. Install JDK 17+, Maven 3.9+, and Node.js 20.19+.
2. Open a terminal in this project folder and build the React frontend:
	cd frontend
	npm ci
	npm run build
3. Return to the project folder and start Spring Boot:
	cd ..
	mvn spring-boot:run
4. Open http://localhost:8080.

The default database is local H2 file storage in ./data/pawconnectdb. Register an account in the app. For Neon, configure the server environment variables described in README.md; never commit database credentials.
