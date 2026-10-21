---
name: MongoDB URI database default
description: The database selected when this project's MongoDB URI has no database path.
---

The current `MONGODB_URI` does not name a database. `MongoClient.db()` therefore selects MongoDB's default database, `test`; the API and the PostgreSQL migration use that same database.

**Why:** the supplied connection string has no database path, and the migration has already copied application data there.

**How to apply:** keep API and migration database selection shared. If the user later chooses a named database, update the shared connector and migrate before switching; do not delete the existing copy without approval.
