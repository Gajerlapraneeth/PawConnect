# 🐾 PawConnect — Community Animal Feeding & Welfare Platform

PawConnect is a Full Stack Java student project that helps volunteers coordinate community animal feeding visits and track animal welfare reports.

## Technology stack

- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend:** Java 17+, Spring Boot 3.5.6, REST APIs
- **Persistence:** Spring Data JPA + Hibernate
- **Local database (runs immediately):** H2 file database
- **Cloud database option:** TiDB Cloud using the MySQL-compatible JDBC driver
- **Build:** Maven

## Features

- Volunteer registration and sign-in
- Dashboard statistics
- Browse/search community feeding spots
- Add and remove feeding spots
- Create feeding tasks with a spot, date and time
- Join a feeding task and see the participant count
- Mark feeding visits completed
- Submit animal welfare reports
- View reports and update their status (Pending / In progress / Resolved)
- H2 stores local data in `./data/pawconnectdb`
- TiDB configuration profile for a cloud database

> **Demo/security note:** Authentication is simplified for a classroom demo. Passwords are currently stored as plain text and the browser stores a lightweight signed-in user object. Do not use real passwords, real sensitive information, or deploy this version publicly. Add Spring Security, password hashing, server-side sessions/authorization, and privacy controls before production use.

## Run locally (no database account needed)

1. Install JDK 17 or newer and IntelliJ IDEA (or VS Code with the Java Extension Pack).
2. Open the folder containing `pom.xml` as a project.
3. Wait for Maven to download dependencies.
4. Run `src/main/java/com/pawconnect/PawConnectApplication.java`.
5. Open <http://localhost:8080>.

Spring Boot creates the H2 database tables from the JPA entities. On the first run, demo spots, tasks, a report, and a demo volunteer are inserted if the database is empty.

**Demo login**

- Email: `demo@pawconnect.local`
- Password: `demo1234`

You can also register a new account from the website. Demo spots/reports are examples; verify real-world safety and permission before feeding animals.

## Where the database is used

The database is not just a display. Spring Data JPA saves and reads data through these entity/repository pairs:

| Database table/entity | Java model | Repository | Used for |
|---|---|---|---|
| `app_users` | `AppUser` | `AppUserRepository` | Volunteer accounts and login lookup |
| `feeding_spot` | `FeedingSpot` | `FeedingSpotRepository` | Create/list/delete feeding spots |
| `feeding_task` | `FeedingTask` | `FeedingTaskRepository` | Schedule and complete visits |
| `task_participant` | `TaskParticipant` | `TaskParticipantRepository` | Track volunteers who join a task |
| `animal_report` | `AnimalReport` | `AnimalReportRepository` | Submit reports and update status |

The REST controller calls the repositories; JPA/Hibernate writes records into the configured database. With the default profile, the file database is `./data/pawconnectdb`. The H2 console is available at <http://localhost:8080/h2-console> while running (JDBC URL: `jdbc:h2:file:./data/pawconnectdb;AUTO_SERVER=TRUE`, username `sa`, blank password).

## Connect to TiDB Cloud (for the database requirement)

This project includes `application-tidb.properties` and the MySQL JDBC driver. TiDB Cloud is MySQL-compatible. You need your own TiDB cluster and credentials; they must not be guessed or committed to Git.

1. Create/open your TiDB Cloud cluster.
2. In the TiDB Cloud console, open your cluster and click **Connect**. Choose a public connection and the general connection method for your operating system. Generate or copy the database password, and ensure your current IP is allowed if the console requires it.
3. Copy the actual JDBC host, database name, username, and password from the Connect dialog. For TiDB Cloud Starter/Serverless, use TLS as directed by TiDB. Do not use the placeholder values below as real credentials.
4. In IntelliJ, open **Run → Edit Configurations → PawConnectApplication → Environment variables** and add these variables (replace all placeholders with your actual values):

   ```text
   SPRING_PROFILES_ACTIVE=tidb
   TIDB_JDBC_URL=jdbc:mysql://YOUR_HOST:4000/test?sslMode=VERIFY_IDENTITY
   TIDB_USER=YOUR_TIDB_USERNAME
   TIDB_PASSWORD=YOUR_TIDB_PASSWORD
   ```

   Use the exact host, username, database and TLS options shown by your TiDB Connect dialog. If its JDBC URL differs, use that actual URL. Keep these credentials out of GitHub.
5. Run the app again. In this profile, Hibernate creates/updates the tables in the selected TiDB database (`ddl-auto=update`).

Official TiDB Spring Boot guide: <https://docs.pingcap.com/tidb/dev/dev-guide-sample-application-spring-boot/>

**Important:** The app runs locally with H2 by default so it can be demonstrated immediately. To prove that TiDB is the active database, run with `SPRING_PROFILES_ACTIVE=tidb` and valid TiDB environment variables. Do not claim the cloud connection works until you have connected your own cluster and tested it.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register volunteer |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/users` | List volunteer accounts (demo endpoint) |
| GET / POST | `/api/spots` | List/add feeding spots |
| DELETE | `/api/spots/{id}` | Delete a feeding spot |
| GET / POST | `/api/tasks` | List/create feeding tasks |
| POST | `/api/tasks/{id}/join` | Join a task |
| PATCH | `/api/tasks/{id}/complete` | Mark a task completed |
| GET / POST | `/api/reports` | List/submit animal reports |
| PATCH | `/api/reports/{id}/status` | Update report status |
| DELETE | `/api/reports/{id}` | Delete a report |
| GET | `/api/stats` | Dashboard counts |

## Push to GitHub

Open a terminal in the project root (the folder that contains `pom.xml`):

```bash
git init
git add .
git commit -m "Build PawConnect animal welfare platform"
git branch -M main
```

Create an **empty** repository on GitHub named `PawConnect` (do not add a README/license there because this project already has a README). Then copy the repository URL GitHub shows and run:

```bash
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/PawConnect.git
git push -u origin main
```

Replace `YOUR-GITHUB-USERNAME` with your username. Never commit a real `.env`, TiDB password, or personal data. This project's `.gitignore` excludes `.env`, database files, `target`, and IDE files.

## Suggested demo flow for your professor

1. Show the dashboard and preloaded feeding spots/tasks.
2. Sign in using the demo account or register a test volunteer.
3. Add a feeding spot and show it in the spot list.
4. Create a feeding task and join it.
5. Submit a welfare report, change its status, and show the dashboard updates.
6. Explain that JPA entities and repositories persist records to H2 locally or TiDB when the `tidb` profile is configured.
