import argparse
import json
import secrets
import sqlite3
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app


TABLES = {
    "users": (
        "id, username, full_name, password_salt, password_hash, role, active, "
        "created_at, updated_at, account_type"
    ),
    "faculties": "id, name, groups_json, created_at, updated_at",
    "students": "id, data, created_at, updated_at",
    "violations": (
        "id, student_id, reporter_id, description, attachment_json, created_at, updated_at"
    ),
    "tutor_groups": "user_id, faculty, group_name",
}


def main():
    parser = argparse.ArgumentParser(
        description="Copy the local registry SQLite data into an empty PostgreSQL database."
    )
    parser.add_argument(
        "--source",
        default=str(ROOT / "registry.db"),
        help="Path to the local registry.db file.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read and validate the SQLite data without connecting to PostgreSQL.",
    )
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        parser.error("SQLite database not found: {}".format(source_path))

    source = sqlite3.connect(
        "{}?mode=ro".format(source_path.as_uri()),
        uri=True,
    )
    source.row_factory = sqlite3.Row
    try:
        source_tables = {
            row["name"]
            for row in source.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        source_data = {}
        for table, columns in TABLES.items():
            if table not in source_tables:
                source_data[table] = []
                continue
            selected_columns = columns
            if table == "users":
                user_columns = {
                    row["name"] for row in source.execute("PRAGMA table_info(users)")
                }
                if "account_type" not in user_columns:
                    selected_columns = columns.rsplit(", ", 1)[0]
            source_data[table] = [
                tuple(row)
                for row in source.execute(
                    "SELECT {} FROM {}".format(selected_columns, table)
                ).fetchall()
            ]
            if table == "users" and selected_columns != columns:
                source_data[table] = [row + ("qalqon",) for row in source_data[table]]

        violation_rows = source_data["violations"]
        known_violation_ids = {row[0] for row in violation_rows}
        migrated_students = []
        for student_id, data, created_at, updated_at in source_data["students"]:
            student = json.loads(data)
            legacy_violations = student.pop("violations", [])
            if not isinstance(legacy_violations, list):
                raise ValueError("Invalid legacy violation list for student {}.".format(student_id))
            for violation in legacy_violations:
                if not isinstance(violation, dict) or not str(
                    violation.get("description", "")
                ).strip():
                    raise ValueError(
                        "Invalid legacy violation for student {}.".format(student_id)
                    )
                violation_id = str(violation.get("id") or secrets.token_hex(16))
                if violation_id in known_violation_ids:
                    continue
                violation_created_at = str(violation.get("createdAt") or app.utc_now())
                attachment = violation.get("attachment")
                violation_rows.append(
                    (
                        violation_id,
                        student_id,
                        None,
                        str(violation["description"]).strip(),
                        json.dumps(attachment, ensure_ascii=False)
                        if isinstance(attachment, dict)
                        else None,
                        violation_created_at,
                        violation_created_at,
                    )
                )
                known_violation_ids.add(violation_id)
            migrated_students.append(
                (student_id, json.dumps(student, ensure_ascii=False), created_at, updated_at)
            )
        source_data["students"] = migrated_students
    finally:
        source.close()

    if args.dry_run:
        print("SQLite data is readable. No PostgreSQL connection was made.")
        for table, rows in source_data.items():
            print("{}: {}".format(table, len(rows)))
        return

    if not app.DATABASE_URL:
        parser.error("Set DATABASE_URL to the Supabase PostgreSQL connection string first.")

    app.init_db()
    destination = app.db()
    try:
        for table in TABLES:
            count = destination.execute(
                "SELECT COUNT(*) AS count FROM {}".format(table)
            ).fetchone()["count"]
            if count:
                raise RuntimeError(
                    "Target database is not empty (table: {}). Stop without importing.".format(
                        table
                    )
                )

        for table, columns in TABLES.items():
            rows = source_data[table]
            if not rows:
                continue
            placeholders = ", ".join("?" for _ in columns.split(", "))
            destination.executemany(
                "INSERT INTO {} ({}) VALUES ({})".format(table, columns, placeholders),
                rows,
            )
        destination.commit()
    finally:
        destination.close()

    print("Migration completed. Imported record counts:")
    for table, rows in source_data.items():
        print("{}: {}".format(table, len(rows)))
    print("Sessions were not copied; all users must sign in again.")


if __name__ == "__main__":
    main()
