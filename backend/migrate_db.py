import os
import sqlite3
import psycopg2
from dotenv import load_dotenv

# Load env variables
load_dotenv('backend/.env')

def run_migration():
    # 1. Update Neon Postgres (production)
    postgres_url = os.getenv('DATABASE_URL')
    if postgres_url:
        # Use postgresql standard dialect for psycopg2 connection
        postgres_url = postgres_url.replace('postgresql+psycopg2://', 'postgresql://')
        try:
            print("Connecting to Neon PostgreSQL...")
            conn = psycopg2.connect(postgres_url)
            cur = conn.cursor()
            
            # Check if columns already exist
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified'")
            row = cur.fetchone()
            if not row:
                print("Adding columns to Neon Postgres...")
                cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL")
                cur.execute("ALTER TABLE users ADD COLUMN verification_code VARCHAR(10)")
                cur.execute("ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMP")
                # Mark existing users as verified
                cur.execute("UPDATE users SET is_verified = TRUE")
                conn.commit()
                print("Postgres migration completed.")
            else:
                print("Postgres columns already exist.")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Postgres migration error: {e}")
    else:
        print("DATABASE_URL not found. Skipping Postgres migration.")

    # 2. Update SQLite (local development)
    sqlite_path = 'instance/skilstation_dev.db'
    if os.path.exists(sqlite_path):
        try:
            print("Connecting to local SQLite database...")
            conn = sqlite3.connect(sqlite_path)
            cur = conn.cursor()
            
            cur.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cur.fetchall()]
            if 'is_verified' not in columns:
                print("Adding columns to SQLite...")
                cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0 NOT NULL")
                cur.execute("ALTER TABLE users ADD COLUMN verification_code VARCHAR(10)")
                cur.execute("ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMP")
                cur.execute("UPDATE users SET is_verified = 1")
                conn.commit()
                print("SQLite migration completed.")
            else:
                print("SQLite columns already exist.")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"SQLite migration error: {e}")
    else:
        print(f"SQLite database file {sqlite_path} not found.")

if __name__ == '__main__':
    run_migration()
