import sqlite3
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app


ADMINS = [
    ("admin", "Administrator admin", "main_admin", "admin123"),
    ("dobrkola", "Dobrkola", "admin", "dobrkola2005"),
    ("bobur", "Bobur", "admin", "bobur123"),
]


def main():
    app.init_db()
    connection = sqlite3.connect(app.DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    now = app.utc_now()

    for username, full_name, role, password in ADMINS:
        salt, password_hash = app.password_hash(password)
        row = connection.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if row:
            connection.execute(
                """
                UPDATE users
                SET full_name = ?, password_salt = ?, password_hash = ?, role = ?,
                    active = 1, account_type = 'qalqon', updated_at = ?
                WHERE username = ?
                """,
                (full_name, salt, password_hash, role, now, username),
            )
        else:
            connection.execute(
                """
                INSERT INTO users(
                    id, username, full_name, password_salt, password_hash, role,
                    active, created_at, updated_at, account_type
                ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'qalqon')
                """,
                (
                    secrets.token_hex(16),
                    username,
                    full_name,
                    salt,
                    password_hash,
                    role,
                    now,
                    now,
                ),
            )

    connection.commit()
    rows = connection.execute(
        "SELECT username, role, active FROM users "
        "WHERE username IN ('admin', 'dobrkola', 'bobur') "
        "ORDER BY username"
    ).fetchall()
    connection.close()

    for row in rows:
        print(f"{row[0]}: role={row[1]}, active={row[2]}")


if __name__ == "__main__":
    main()
