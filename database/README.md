# Database - SkillSwap Data Storage

This directory contains the Alembic migration history managed by Flask-Migrate. The application does not require manual database setup because `db.create_all()` is called automatically on every server startup.

---

## Current Database

The application uses Neon PostgreSQL as its primary database. Neon is a serverless PostgreSQL service hosted on AWS. The connection is configured via the `DATABASE_URL` environment variable in `backend/.env`.

Connection string format:

```
postgresql+psycopg2://username:password@host/database?sslmode=require
```

The backend automatically converts a plain `postgresql://` prefix to `postgresql+psycopg2://` at startup for SQLAlchemy 2.x compatibility.

A local SQLite fallback is used if `DATABASE_URL` is not set, creating a file at `backend/instance/skilstation_v2.db`.

---

## Directory Structure

```
database/
  migrations/
    env.py              Alembic environment file (reads from Flask app engine)
    alembic.ini         Alembic configuration
    script.py.mako      Migration script template
    versions/           Individual migration files (auto-generated)
  README.md             This file
```

---

## Tables

The following tables are defined in `backend/models.py` and created automatically at startup:

| Table | Purpose |
|---|---|
| users | User accounts, hashed passwords, Skill Coin balances, profile photos |
| skills | Skill listings published to the Marketplace |
| user_skills | Individual skill tags on a user profile |
| matches | Session requests linking a learner to a teacher via a skill |
| messages | Direct messages sent between users |
| reviews | Star ratings and written feedback for completed sessions |
| credits | Audit log of every Skill Coin transaction |
| validations | AI-generated quality scores for session assessments |

Full column definitions for each table are documented in the main [README.md](../README.md).

---

## Schema Management with Flask-Migrate

Flask-Migrate wraps Alembic and connects it to the Flask application context. The migration directory is at `database/migrations`. The `env.py` file reads the database URL directly from the running Flask app so no separate Alembic configuration is needed.

### Generating a Migration After a Model Change

Run these commands from inside the `backend` directory with the virtual environment activated:

```
flask db migrate -m "Description of what changed"
flask db upgrade
```

`flask db migrate` compares the current ORM models against the database schema and generates a new migration file in `database/migrations/versions/`. `flask db upgrade` applies all pending migrations to the connected database.

### Checking Current Migration Status

```
flask db current
flask db history
```

### Rolling Back a Migration

```
flask db downgrade
```

This reverts the most recently applied migration.

---

## Connection Pool Settings

The following pool settings are applied when the application connects to PostgreSQL. They are defined in `backend/app.py`:

| Setting | Value | Reason |
|---|---|---|
| pool_pre_ping | True | Detects and discards broken connections before use |
| pool_recycle | 300 seconds | Prevents connections from becoming stale during idle periods |
| pool_timeout | 10 seconds | Stops the server from hanging indefinitely if Neon is slow |
| connect_timeout | 10 seconds | Passed directly to psycopg2 for the initial TCP connection |
| sslmode | require | Neon requires SSL for all connections |

---

## Gitignore Rules

The following patterns are excluded from version control:

```
*.db
*.sqlite
*.db-journal
/backups/
```

The Neon database stores all persistent data in the cloud. Local SQLite files are only created if `DATABASE_URL` is not configured and are not needed for the production environment.
