# PawConnect

PawConnect is a community platform for coordinating volunteer animal-feeding visits and following animal welfare reports. The project follows the supplied abstract and uses React, Spring Boot, and Neon PostgreSQL.

## Features

- Volunteer registration and sign-in with server-side sessions
- BCrypt password hashing
- Dashboard statistics for volunteers, spots, visits, and open reports
- Search and create community feeding spots
- Schedule visits, join them, and mark them complete
- Submit welfare reports and follow their status
- Administrator-only report management and spot removal
- Responsive interface, input checks, and readable error messages
- Sample spots, visits, and report seeded without a public demo password

## Technology

- React 19 and Vite for the browser application
- Java 17 and Spring Boot 3.5.6 for the REST API
- Spring Data JPA and Hibernate for persistence
- Neon PostgreSQL for hosted data; local H2 for development
- Docker multi-stage build; Render deployment blueprint

## Run locally

Install JDK 17+, Maven 3.9+, and Node.js 20.19+.

```powershell
cd frontend
npm ci
npm run build
cd ..
mvn spring-boot:run
```

Open <http://localhost:8080>. The default profile uses a local H2 database in `./data/pawconnectdb`; it does not require a cloud account. The first start adds sample community records. Create your own account to add or join activities. No shared demo credentials are configured.

To give a local account administrator access, set the administrator email before registering that account:

```powershell
$env:ADMIN_EMAIL = "you@example.com"
mvn spring-boot:run
```

An existing account matching `ADMIN_EMAIL` is promoted on its next successful sign-in. Remove that environment variable to disable automatic promotion for new registrations.

## Connect Neon

1. Create a PostgreSQL project in Neon and copy its connection details from the Neon dashboard.
2. Set these environment variables in your deployment provider. Do not commit real credentials or put them in frontend code.

```text
SPRING_PROFILES_ACTIVE=neon
NEON_JDBC_URL=jdbc:postgresql://YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require
NEON_USERNAME=YOUR_NEON_USERNAME
NEON_PASSWORD=YOUR_NEON_PASSWORD
ADMIN_EMAIL=your-admin-email@example.com
COOKIE_SECURE=true
```

Use the exact hostname, database, username, and password Neon provides. Keep `sslmode=require`. Set `ADMIN_EMAIL` before the first administrator account is registered. The Neon profile disables the H2 console and uses PostgreSQL; Hibernate initializes/updates tables on startup.

For a local HTTP run against Neon, set `COOKIE_SECURE=false`; use `true` when deployed behind HTTPS. `.env.example` contains placeholders only. Spring reads database credentials only on the server.

## Deploy on Render

The repository includes `render.yaml` and a Dockerfile that builds the React assets and Java application into one web service.

1. Push this repository to GitHub.
2. In Render, create a Blueprint from the GitHub repository and select `render.yaml`.
3. Fill in `NEON_JDBC_URL`, `NEON_USERNAME`, `NEON_PASSWORD`, and `ADMIN_EMAIL` in the Render environment prompt. Use values copied from your Neon dashboard.
4. Deploy and wait for the service health check at `/api/stats` to pass.
5. Open the Render URL, register the email configured as `ADMIN_EMAIL`, then sign in to verify volunteer and administrator workflows.

Render and Neon accounts, credentials, and project ownership are required for a live deployment. Free web services can sleep when idle, so the first request after inactivity may take longer. The database is persisted in Neon, not in the container filesystem.

## Request flow

The React app is served by Spring from `/react-build/` and calls same-origin `/api` endpoints. Spring controllers validate requests, repositories use JPA entities, and Hibernate reads/writes H2 locally or PostgreSQL under the `neon` profile. Login state is held in an HTTP-only session cookie. Registration hashes passwords; older local plain-text demo passwords are upgraded to BCrypt after a successful login.

The first registered account whose email exactly matches `ADMIN_EMAIL` receives the `ADMIN` role. An existing matching account is promoted at its next successful login. Other accounts receive `VOLUNTEER`. Only administrators can remove spots or change/delete welfare reports.

## Project structure

```text
frontend/src/App.jsx                  React screens and user workflows
frontend/src/main.jsx                 React application entry point
frontend/vite.config.js               Production asset output configuration
src/main/java/.../controller          REST endpoints and page routing
src/main/java/.../model               JPA entity classes
src/main/java/.../repository          Spring Data repositories
src/main/java/.../config              Password encoder and sample data
src/main/resources/application*.properties
                                      Local and Neon database profiles
src/main/resources/static/css/style.css
                                      Shared application styles
Dockerfile                            Multi-stage production build
render.yaml                           Render service configuration
```

## Main API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account and sign in |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Read the active session |
| POST | `/api/auth/logout` | Sign out |
| GET / POST | `/api/spots` | List or add feeding spots |
| DELETE | `/api/spots/{id}` | Administrator removes a spot |
| GET / POST | `/api/tasks` | List or schedule visits |
| POST | `/api/tasks/{id}/join` | Join a visit |
| PATCH | `/api/tasks/{id}/complete` | Complete a visit |
| GET / POST | `/api/reports` | List or submit welfare reports |
| PATCH | `/api/reports/{id}/status` | Administrator updates report status |
| DELETE | `/api/reports/{id}` | Administrator removes a report |
| GET | `/api/stats` | Dashboard counts and health check |

## Viva guide

The printable 42-question guide is `PawConnect-Viva-Guide.pdf`. Its editable source is `docs/PAWCONNECT_VIVA.md`; regenerate the PDF by running `npm run generate:viva` from `frontend/`.

## Troubleshooting

- **Frontend files missing:** run `npm ci` and `npm run build` from `frontend/` before starting Spring.
- **Maven command not found:** install Maven 3.9+ and confirm `mvn -v` works in a new terminal.
- **Neon connection fails:** verify the JDBC URL uses `jdbc:postgresql://`, the correct Neon database/role values, and `sslmode=require`.
- **Sign-in cookie is not saved locally:** use `COOKIE_SECURE=false` for `http://localhost`; HTTPS deployments must use `true`.
- **Admin controls are missing:** confirm `ADMIN_EMAIL` exactly matches the signed-in account's email, then sign out and back in.
- **Deploy fails health check:** inspect Render service logs and verify its Neon environment variables; secrets should only be configured in Render.
