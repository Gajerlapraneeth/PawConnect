PawConnect quick start: see README.md for full setup, features, database explanation, TiDB Cloud profile, and GitHub push commands.

1. Open this folder in IntelliJ IDEA.
2. Wait for Maven to finish downloading dependencies.
3. Run src/main/java/com/pawconnect/PawConnectApplication.java.
4. Open http://localhost:8080.

Local demo login:
Email: demo@pawconnect.local
Password: demo1234

The default database is H2 file storage in ./data/pawconnectdb. To use TiDB Cloud, follow the TiDB section in README.md and set SPRING_PROFILES_ACTIVE=tidb plus your own TIDB_JDBC_URL, TIDB_USER, and TIDB_PASSWORD environment variables. Never commit actual credentials.
