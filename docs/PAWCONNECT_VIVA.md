# PawConnect Viva Questions and Answers

A study guide for the PawConnect Community Animal Care project. Questions progress from the project idea to implementation and deployment.

## Beginner

### 1. What is PawConnect?
A: PawConnect is a web application that helps a community coordinate animal-feeding visits, find feeding spots, and share animal welfare reports.

### 2. What problem does the project address?
A: Volunteer information can be scattered across messages and informal groups. PawConnect puts locations, schedules, participation, and report status in one shared application.

### 3. Who uses PawConnect?
A: Community volunteers browse spots and visits, register, join activities, and submit reports. An administrator can manage spots and report status.

### 4. What are the main features?
A: Account registration and sign-in, dashboard counts, searchable feeding spots, scheduled visits, task participation, visit completion, and welfare reports.

### 5. What technologies does the project use?
A: React and Vite build the frontend; Java and Spring Boot provide the API; Spring Data JPA and Hibernate access the database; Neon PostgreSQL stores hosted data.

### 6. What happens when a visitor opens the home page?
A: Spring's PageController forwards the root route to the built React index. React loads its JavaScript and CSS, then requests dashboard data from the same server's API.

### 7. What does the dashboard show?
A: It shows counts of registered volunteers, feeding spots, visits, and reports still pending.

### 8. Why does the project include sample records?
A: Sample spots, visits, and a report make the main screens demonstrable on a new database. The seeder does not create an account with a shared password.

### 9. What is an API?
A: An API is a defined interface that lets the React frontend send requests to Spring and receive structured data, usually as JSON.

### 10. What does responsive design mean here?
A: The layout adjusts to different screen widths so forms, navigation, statistics, and lists remain usable on mobile and desktop.

## Intermediate

### 11. What is React responsible for?
A: React renders the interactive interface. App.jsx owns UI state and responds to user actions such as searching, signing in, and submitting forms.

### 12. What is Vite responsible for?
A: Vite runs the frontend development/build tools. Its production build creates static files under Spring's static/react-build directory.

### 13. Why is the frontend served by Spring?
A: Serving both parts from one origin simplifies deployment and lets the browser call the API without a separate cross-origin configuration.

### 14. What is a REST endpoint?
A: It is an HTTP route representing an operation or resource. For example, GET /api/spots reads spots and POST /api/spots creates one.

### 15. What does ApiController do?
A: ApiController maps API routes to Java methods, checks request data and session permissions, calls repositories, and returns JSON or an HTTP error status.

### 16. What is a JPA entity?
A: An entity is a Java class that represents a database table. PawConnect has entities for users, feeding spots, feeding tasks, participants, and animal reports.

### 17. What is a repository?
A: A Spring Data repository provides database operations for an entity, such as finding a user by email or saving a report, without handwritten SQL for each basic operation.

### 18. What does Hibernate do?
A: Hibernate is the JPA implementation that maps entity objects to SQL statements and database rows.

### 19. How is a feeding spot created?
A: React validates required form fields and sends JSON to POST /api/spots. Spring checks the signed-in user and field lengths, assigns the creator, and saves the entity using the repository.

### 20. How does a volunteer join a visit?
A: React sends POST /api/tasks/{id}/join. Spring reads the volunteer identity from the session, checks that the visit exists, and records the participant.

### 21. How does report tracking work?
A: A signed-in volunteer submits the animal, location, and description. The report starts as PENDING; an administrator can change it to IN_PROGRESS or RESOLVED.

### 22. How are form errors presented?
A: The browser marks required fields, while the API independently validates requests. Spring returns a useful status and message, and React shows that message in an alert.

### 23. What is an HTTP session?
A: A server-side session stores the signed-in user identity. The browser receives an HTTP-only session cookie and automatically sends it with same-origin requests.

### 24. Why use BCrypt for passwords?
A: BCrypt is a one-way password hashing function designed to make password guessing more expensive. PawConnect never needs to store a new account's raw password.

### 25. How are administrator accounts selected?
A: The server compares an account email with the ADMIN_EMAIL environment variable. A matching account receives the ADMIN role; other accounts are VOLUNTEER.

### 26. What is Neon?
A: Neon is a hosted PostgreSQL service. PawConnect connects to it through the PostgreSQL JDBC driver using server-side environment variables and TLS.

### 27. Why keep H2 in the project?
A: H2 is a lightweight local database that lets a student run the project without first creating a cloud database. The Neon profile is used for hosted deployment.

### 28. How does Spring choose the database?
A: The default application.properties configures local H2. Setting SPRING_PROFILES_ACTIVE=neon loads application-neon.properties and the Neon JDBC environment variables.

### 29. What is DemoDataSeeder?
A: It inserts example spots, visits, and a report when those tables are empty. It does not insert a user with a known password.

### 30. What does the PageController do?
A: It maps / and /index to the built React entry page so the application opens at the user interface.

## Advanced

### 31. What is the purpose of the ADMIN role?
A: It keeps destructive actions and report-status management on the server behind an explicit permission check. Hiding a button in React is not used as the only access control.

### 32. What happens if an older local account has a plain-text password?
A: After a successful legacy sign-in, the backend replaces that stored value with a BCrypt hash. Newly registered accounts are hashed immediately.

### 33. How are secrets kept out of the repository?
A: The application reads Neon credentials from environment variables. .env files are ignored by Git, and the example file contains placeholders only.

### 34. What is Docker doing for deployment?
A: The first image stage installs Node packages and builds React. The second stage packages the Java application with Maven, and the final stage runs the smaller Java runtime image.

### 35. How does Render use render.yaml?
A: The blueprint describes the Docker web service, health-check route, Neon profile, and names of secret values that must be supplied through Render.

### 36. What does the health check verify?
A: Render requests GET /api/stats. A successful response shows that Spring is serving requests; database connectivity is exercised by the repository-backed counts.

### 37. Why is sslmode=require in the Neon JDBC URL?
A: It requires an encrypted connection between the Spring server and the hosted PostgreSQL database.

### 38. What if Neon is unavailable?
A: Database-backed requests can fail until connectivity returns. The API returns a readable error and logs diagnostic details on the server; verify the URL, credentials, network, and Neon service status.

### 39. What are current limitations?
A: The API loads lists without pagination, has no rate limiting, and does not yet include automated integration tests. A larger public service should add those controls and monitoring before expansion.

### 40. How would you improve the project next?
A: Add automated API and browser tests, pagination, rate limiting, audit history for administrator changes, and monitoring for database and application health.

### 41. How do you run the project locally?
A: Install JDK 17, Maven, and Node.js; run npm ci and npm run build in frontend; then run mvn spring-boot:run from the project root and open http://localhost:8080.

### 42. What should be checked before a viva demonstration?
A: Confirm the app starts, registration and sign-in work, the session persists after refresh, a volunteer can create and join a visit, an administrator can update a report, and hosted data remains after redeployment.
