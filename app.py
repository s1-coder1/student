import base64
import hashlib
import json
import os
import secrets
import sqlite3
import sys
import threading
import time
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8080"))
DB_PATH = os.environ.get(
    "DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "registry.db")
)
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
COOKIE_NAME = "student_registry_session"
PASSWORD_ITERATIONS = 260_000
MAX_REQUEST_SIZE = 20 * 1024 * 1024
_POSTGRES_POOL = None
_POSTGRES_POOL_LOCK = threading.Lock()


class PostgresCompatConnection:
    def __init__(self, connection):
        self.connection = connection

    @staticmethod
    def _query(query):
        ignore_conflicts = query.lstrip().upper().startswith("INSERT OR IGNORE INTO")
        if ignore_conflicts:
            query = query.replace("INSERT OR IGNORE INTO", "INSERT INTO", 1).rstrip().rstrip(";")
            query += " ON CONFLICT DO NOTHING"
        return query.replace("?", "%s")

    def execute(self, query, parameters=()):
        return self.connection.execute(self._query(query), parameters)

    def executemany(self, query, parameters):
        cursor = self.connection.cursor()
        return cursor.executemany(self._query(query), parameters)

    def __getattr__(self, name):
        return getattr(self.connection, name)


def db():
    global _POSTGRES_POOL
    if DATABASE_URL:
        if _POSTGRES_POOL is None:
            with _POSTGRES_POOL_LOCK:
                if _POSTGRES_POOL is None:
                    from psycopg.rows import dict_row
                    from psycopg_pool import ConnectionPool

                    _POSTGRES_POOL = ConnectionPool(
                        DATABASE_URL,
                        kwargs={"row_factory": dict_row, "prepare_threshold": None},
                        min_size=1,
                        max_size=5,
                        timeout=10,
                        close_returns=True,
                    )
        return PostgresCompatConnection(_POSTGRES_POOL.getconn())
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_postgres_db(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('main_admin', 'admin', 'user')),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'qalqon'
                CHECK(account_type IN ('tutor', 'qalqon'))
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS tutor_groups (
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            faculty TEXT NOT NULL,
            group_name TEXT NOT NULL,
            PRIMARY KEY(user_id, faculty, group_name)
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS faculties (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            groups_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS violations (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
            reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            description TEXT NOT NULL,
            attachment_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS violations_student_created_idx
        ON violations(student_id, created_at DESC)
        """
    )


def migrate_legacy_student_violations(connection):
    for row in connection.execute("SELECT id, data FROM students").fetchall():
        student = json.loads(row["data"])
        has_legacy_violations = "violations" in student
        legacy_violations = student.pop("violations", [])
        if not isinstance(legacy_violations, list):
            raise ValueError("Невозможно перенести старые нарушения студента.")
        for violation in legacy_violations:
            if not isinstance(violation, dict) or not str(violation.get("description", "")).strip():
                raise ValueError("Невозможно перенести старое нарушение студента.")
            attachment = violation.get("attachment")
            created_at = str(violation.get("createdAt") or utc_now())
            connection.execute(
                """
                INSERT OR IGNORE INTO violations
                    (id, student_id, description, attachment_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(violation.get("id") or secrets.token_hex(16)),
                    row["id"],
                    str(violation["description"]).strip(),
                    json.dumps(attachment, ensure_ascii=False) if isinstance(attachment, dict) else None,
                    created_at,
                    created_at,
                ),
            )
        if has_legacy_violations:
            connection.execute(
                "UPDATE students SET data = ? WHERE id = ?",
                (json.dumps(student, ensure_ascii=False), row["id"]),
            )


def init_db():
    connection = db()
    if DATABASE_URL:
        init_postgres_db(connection)
        user_columns = {
            row["column_name"]
            for row in connection.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name = 'users'
                """
            ).fetchall()
        }
    else:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('main_admin', 'admin', 'user')),
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tutor_groups (
                user_id TEXT NOT NULL,
                faculty TEXT NOT NULL,
                group_name TEXT NOT NULL,
                PRIMARY KEY(user_id, faculty, group_name),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS faculties (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                groups_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS violations (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                reporter_id TEXT,
                description TEXT NOT NULL,
                attachment_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE RESTRICT,
                FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS violations_student_created_idx
                ON violations(student_id, created_at DESC);
            """
        )
        user_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
    if "account_type" not in user_columns:
        connection.execute(
            "ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'qalqon' "
            "CHECK(account_type IN ('tutor', 'qalqon'))"
        )
    migrate_legacy_student_violations(connection)
    connection.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
    connection.commit()
    connection.close()


def password_hash(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_ITERATIONS
    )
    return salt, base64.b64encode(digest).decode("ascii")


def password_matches(password, salt, stored_hash):
    _, candidate = password_hash(password, salt)
    return secrets.compare_digest(candidate, stored_hash)


def integrity_error_types():
    if DATABASE_URL:
        import psycopg

        return (psycopg.IntegrityError,)
    return (sqlite3.IntegrityError,)


def user_dict(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "fullName": row["full_name"],
        "role": row["account_type"] if row["role"] == "user" else row["role"],
        "active": bool(row["active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def account_role(row):
    return row["account_type"] if row["role"] == "user" else row["role"]


def violation_dict(row):
    student = json.loads(row["student_data"])
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "studentName": (student.get("lastName", "") + " " + student.get("firstName", "")).strip(),
        "faculty": student.get("faculty", ""),
        "group": student.get("group", ""),
        "description": row["description"],
        "reporterName": row["reporter_name"] or "Автор не указан",
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "attachment": json.loads(row["attachment_json"]) if row["attachment_json"] else None,
    }


def normalize_violation_attachment(attachment):
    if attachment is None:
        return None
    if not isinstance(attachment, dict):
        raise ValueError("Некорректное вложение.")
    name = str(attachment.get("name", "")).strip()
    media_type = str(attachment.get("type", ""))
    data = attachment.get("data")
    size = attachment.get("size")
    allowed_types = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
    if (
        not name
        or len(name) > 255
        or media_type not in allowed_types
        or type(size) is not int
        or size < 0
        or size > 2 * 1024 * 1024
        or not isinstance(data, str)
        or len(data) > 3 * 1024 * 1024
        or not data.startswith("data:" + media_type + ";base64,")
    ):
        raise ValueError("Вложение должно быть PDF, DOC, DOCX, JPG, PNG или WebP размером до 2 МБ.")
    return json.dumps(attachment, ensure_ascii=False)


def utc_now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def json_bytes(payload, status=200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return status, body


class RegistryHandler(BaseHTTPRequestHandler):
    server_version = "StudentRegistry/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (
            self.address_string(),
            self.log_date_time_string(),
            fmt % args,
        ))

    def send_response_bytes(self, status, body, content_type="application/json; charset=utf-8", extra_headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for key, value in extra_headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, payload, status=200):
        status, body = json_bytes(payload, status)
        self.send_response_bytes(status, body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        if length > MAX_REQUEST_SIZE:
            raise ValueError("Размер запроса превышает допустимый предел.")
        body = self.rfile.read(length)
        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            raise ValueError("Некорректный JSON.")

    def cookies(self):
        raw = self.headers.get("Cookie", "")
        parsed = cookies.SimpleCookie()
        try:
            parsed.load(raw)
        except cookies.CookieError:
            return {}
        return parsed

    def current_user(self):
        parsed = self.cookies()
        if COOKIE_NAME not in parsed:
            return None
        token = parsed[COOKIE_NAME].value
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        connection = db()
        row = connection.execute(
            """
            SELECT u.* FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
            """,
            (token_hash, int(time.time())),
        ).fetchone()
        connection.close()
        return row

    def require_admin(self):
        user = self.current_user()
        if user is None:
            return None, ({"error": "Требуется вход в систему."}, 401)
        if user["role"] not in ("admin", "main_admin"):
            return None, ({"error": "Недостаточно прав."}, 403)
        return user, None

    def require_main_admin(self):
        user = self.current_user()
        if user is None:
            return None, ({"error": "Требуется вход в систему."}, 401)
        if user["role"] != "main_admin":
            return None, ({"error": "Только главный администратор может выполнить это действие."}, 403)
        return user, None

    def set_session(self, user_id):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        expires_at = int(time.time()) + 12 * 60 * 60
        connection = db()
        connection.execute(
            "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at),
        )
        connection.commit()
        connection.close()
        cookie = cookies.SimpleCookie()
        cookie[COOKIE_NAME] = token
        cookie[COOKIE_NAME]["httponly"] = True
        cookie[COOKIE_NAME]["samesite"] = "Strict"
        cookie[COOKIE_NAME]["path"] = "/"
        cookie[COOKIE_NAME]["max-age"] = str(12 * 60 * 60)
        if os.environ.get("COOKIE_SECURE", "").lower() == "true":
            cookie[COOKIE_NAME]["secure"] = True
        return cookie[COOKIE_NAME].OutputString()

    def clear_session(self):
        parsed = self.cookies()
        if COOKIE_NAME in parsed:
            token_hash = hashlib.sha256(parsed[COOKIE_NAME].value.encode("utf-8")).hexdigest()
            connection = db()
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
            connection.commit()
            connection.close()
        cookie = cookies.SimpleCookie()
        cookie[COOKIE_NAME] = ""
        cookie[COOKIE_NAME]["httponly"] = True
        cookie[COOKIE_NAME]["samesite"] = "Strict"
        cookie[COOKIE_NAME]["path"] = "/"
        cookie[COOKIE_NAME]["max-age"] = "0"
        if os.environ.get("COOKIE_SECURE", "").lower() == "true":
            cookie[COOKIE_NAME]["secure"] = True
        return cookie[COOKIE_NAME].OutputString()

    def check_mutation_origin(self):
        if self.command not in ("POST", "PUT", "DELETE", "PATCH"):
            return True
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = self.headers.get("Host")
        allowed_origins = {
            value.strip().rstrip("/")
            for value in os.environ.get("ALLOWED_ORIGINS", "").split(",")
            if value.strip()
        }
        return origin in allowed_origins or origin in (
            "http://%s" % host,
            "https://%s" % host,
        )

    def do_HEAD(self):
        path = urlparse(self.path).path
        body = b""
        content_type = "text/plain; charset=utf-8"
        if path in ("/", "/index.html"):
            content_type = "text/html; charset=utf-8"
        elif path == "/app.js":
            content_type = "application/javascript; charset=utf-8"
        self.send_response_bytes(200, body, content_type)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/healthz":
            connection = db()
            connection.execute("SELECT 1")
            connection.close()
            self.send_json({"status": "ok"})
            return
        if path == "/" or path == "/index.html":
            self.serve_index()
            return
        if path == "/app.js":
            self.serve_app_js()
            return
        if path == "/api/bootstrap-status":
            connection = db()
            count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
            connection.close()
            self.send_json({"needsBootstrap": count == 0})
            return
        if path == "/api/me":
            user = self.current_user()
            if user is None:
                self.send_json({"authenticated": False}, 200)
            else:
                self.send_json({"authenticated": True, "user": user_dict(user)})
            return
        if path == "/api/reportable-students":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            if account_role(user) == "tutor":
                self.send_json({"error": "Тьюторам недоступен список для отправки нарушений."}, 403)
                return
            connection = db()
            rows = connection.execute("SELECT id, data FROM students ORDER BY id").fetchall()
            connection.close()
            reportable_students = []
            for row in rows:
                student = json.loads(row["data"])
                reportable_students.append({
                    "id": row["id"],
                    "firstName": student.get("firstName", ""),
                    "lastName": student.get("lastName", ""),
                    "faculty": student.get("faculty", ""),
                    "group": student.get("group", ""),
                })
            self.send_json({"students": reportable_students})
            return
        if path == "/api/violations":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            role = account_role(user)
            if role == "tutor":
                self.send_json({"error": "Тьюторам недоступен список нарушений."}, 403)
                return
            connection = db()
            where = "WHERE v.reporter_id = ?" if role == "qalqon" else ""
            parameters = (user["id"],) if where else ()
            rows = connection.execute(
                """
                SELECT v.*, s.data AS student_data, u.full_name AS reporter_name
                FROM violations v
                JOIN students s ON s.id = v.student_id
                LEFT JOIN users u ON u.id = v.reporter_id
                %s
                ORDER BY v.created_at DESC
                """ % where,
                parameters,
            ).fetchall()
            connection.close()
            self.send_json({"violations": [violation_dict(row) for row in rows]})
            return
        if path == "/api/students":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            role = account_role(user)
            if role not in ("admin", "main_admin"):
                self.send_json({"error": "Недостаточно прав."}, 403)
                return
            connection = db()
            rows = connection.execute(
                """
                SELECT s.id, s.data,
                    (SELECT COUNT(*) FROM violations v WHERE v.student_id = s.id) AS violation_count
                FROM students s
                ORDER BY s.updated_at DESC
                """
            ).fetchall()
            connection.close()
            student_list = []
            for row in rows:
                student = json.loads(row["data"])
                student.pop("violations", None)
                student["id"] = row["id"]
                student["violationCount"] = row["violation_count"]
                student_list.append(student)
            self.send_json({"students": student_list})
            return
        if path == "/api/tutor/groups":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            if account_role(user) != "tutor":
                self.send_json({"error": "Недостаточно прав."}, 403)
                return
            connection = db()
            assigned_groups = connection.execute(
                """
                SELECT faculty, group_name FROM tutor_groups
                WHERE user_id = ? ORDER BY faculty, group_name
                """,
                (user["id"],),
            ).fetchall()
            students = connection.execute("SELECT data FROM students").fetchall()
            connection.close()
            group_list = []
            for assigned in assigned_groups:
                student_count = sum(
                    1 for row in students
                    if json.loads(row["data"]).get("faculty") == assigned["faculty"]
                    and json.loads(row["data"]).get("group") == assigned["group_name"]
                )
                group_list.append({
                    "faculty": assigned["faculty"],
                    "group": assigned["group_name"],
                    "studentCount": student_count,
                })
            self.send_json({"groups": group_list})
            return
        if path == "/api/tutor/students":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            if account_role(user) != "tutor":
                self.send_json({"error": "Недостаточно прав."}, 403)
                return
            query = parse_qs(urlparse(self.path).query)
            faculty = query.get("faculty", [""])[0]
            group_name = query.get("group", [""])[0]
            connection = db()
            assigned = connection.execute(
                """
                SELECT 1 FROM tutor_groups
                WHERE user_id = ? AND faculty = ? AND group_name = ?
                """,
                (user["id"], faculty, group_name),
            ).fetchone()
            if assigned is None:
                connection.close()
                self.send_json({"error": "Эта группа не назначена вам."}, 403)
                return
            rows = connection.execute(
                """
                SELECT s.id, s.data,
                    (SELECT COUNT(*) FROM violations v WHERE v.student_id = s.id) AS violation_count
                FROM students s ORDER BY s.updated_at DESC
                """
            ).fetchall()
            connection.close()
            group_students = []
            for row in rows:
                student = json.loads(row["data"])
                if student.get("faculty") == faculty and student.get("group") == group_name:
                    group_students.append({
                        "id": row["id"],
                        "firstName": student.get("firstName", ""),
                        "lastName": student.get("lastName", ""),
                        "faculty": faculty,
                        "group": group_name,
                        "violationCount": row["violation_count"],
                    })
            self.send_json({"students": group_students})
            return
        if path.startswith("/api/tutor/students/") and path.endswith("/violations"):
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            if account_role(user) != "tutor":
                self.send_json({"error": "Недостаточно прав."}, 403)
                return
            parts = path.strip("/").split("/")
            if len(parts) != 5:
                self.send_json({"error": "Маршрут не найден."}, 404)
                return
            student_id = parts[3]
            connection = db()
            student_row = connection.execute(
                "SELECT id, data FROM students WHERE id = ?", (student_id,)
            ).fetchone()
            if student_row is None:
                connection.close()
                self.send_json({"error": "Студент не найден."}, 404)
                return
            student = json.loads(student_row["data"])
            assigned = connection.execute(
                """
                SELECT 1 FROM tutor_groups
                WHERE user_id = ? AND faculty = ? AND group_name = ?
                """,
                (user["id"], student.get("faculty", ""), student.get("group", "")),
            ).fetchone()
            if assigned is None:
                connection.close()
                self.send_json({"error": "Этот студент не относится к вашим группам."}, 403)
                return
            rows = connection.execute(
                """
                SELECT v.*, s.data AS student_data, u.full_name AS reporter_name
                FROM violations v
                JOIN students s ON s.id = v.student_id
                LEFT JOIN users u ON u.id = v.reporter_id
                WHERE v.student_id = ?
                ORDER BY v.created_at DESC
                """,
                (student_id,),
            ).fetchall()
            connection.close()
            self.send_json({
                "student": {
                    "id": student_id,
                    "firstName": student.get("firstName", ""),
                    "lastName": student.get("lastName", ""),
                    "faculty": student.get("faculty", ""),
                    "group": student.get("group", ""),
                    "photo": student.get("photo") or "",
                },
                "violations": [violation_dict(row) for row in rows],
            })
            return
        if path == "/api/faculties":
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            connection = db()
            rows = connection.execute("SELECT id, name, groups_json FROM faculties ORDER BY name").fetchall()
            connection.close()
            self.send_json({
                "faculties": [{
                    "id": row["id"],
                    "name": row["name"],
                    "groups": json.loads(row["groups_json"]),
                } for row in rows]
            })
            return
        if path == "/api/admin/users":
            user, error = self.require_main_admin()
            if error:
                self.send_json(*error)
                return
            connection = db()
            rows = connection.execute(
                "SELECT * FROM users ORDER BY created_at DESC"
            ).fetchall()
            user_groups = connection.execute(
                "SELECT user_id, faculty, group_name FROM tutor_groups ORDER BY faculty, group_name"
            ).fetchall()
            connection.close()
            groups_by_user = {}
            for group in user_groups:
                groups_by_user.setdefault(group["user_id"], []).append({
                    "faculty": group["faculty"],
                    "group": group["group_name"],
                })
            users = []
            for row in rows:
                user = user_dict(row)
                user["groups"] = groups_by_user.get(row["id"], [])
                users.append(user)
            self.send_json({"users": users})
            return
        self.send_json({"error": "Маршрут не найден."}, 404)

    def serve_index(self):
        index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
        try:
            with open(index_path, "rb") as index_file:
                body = index_file.read()
        except FileNotFoundError:
            self.send_json({"error": "Файл интерфейса не найден."}, 500)
            return
        self.send_response_bytes(200, body, "text/html; charset=utf-8")

    def serve_app_js(self):
        js_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.js")
        try:
            with open(js_path, "rb") as js_file:
                body = js_file.read()
        except FileNotFoundError:
            self.send_json({"error": "Файл интерфейса не найден."}, 500)
            return
        self.send_response_bytes(200, body, "application/javascript; charset=utf-8")

    def do_POST(self):
        path = urlparse(self.path).path
        if not self.check_mutation_origin():
            self.send_json({"error": "Некорректный источник запроса."}, 403)
            return
        try:
            payload = self.read_json()
        except ValueError as error:
            self.send_json({"error": str(error)}, 400)
            return

        if path == "/api/bootstrap":
            connection = db()
            count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
            if count != 0:
                connection.close()
                self.send_json({"error": "Главный администратор уже создан."}, 409)
                return
            username = str(payload.get("username", "")).strip().lower()
            full_name = str(payload.get("fullName", "")).strip()
            password = str(payload.get("password", ""))
            if len(username) < 3 or len(full_name) < 2 or len(password) < 8:
                connection.close()
                self.send_json({"error": "Логин от 3 символов, имя от 2, пароль от 8 символов."}, 400)
                return
            user_id = secrets.token_hex(16)
            salt, hashed = password_hash(password)
            now = utc_now()
            connection.execute(
                "INSERT INTO users(id, username, full_name, password_salt, password_hash, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'main_admin', 1, ?, ?)",
                (user_id, username, full_name, salt, hashed, now, now),
            )
            connection.commit()
            connection.close()
            session_cookie = self.set_session(user_id)
            self.send_json({"authenticated": True}, 200, session_cookie)
            return

        if path == "/api/register":
            username = str(payload.get("username", "")).strip().lower()
            full_name = str(payload.get("fullName", "")).strip()
            password = str(payload.get("password", ""))
            account_type = str(payload.get("accountType", ""))
            if len(username) < 3 or len(full_name) < 2 or len(password) < 8:
                self.send_json({"error": "Логин от 3 символов, имя от 2, пароль от 8 символов."}, 400)
                return
            if account_type not in ("tutor", "qalqon"):
                self.send_json({"error": "Выберите роль: тьютор или Qalqon."}, 400)
                return
            connection = db()
            existing = connection.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if existing:
                connection.close()
                self.send_json({"error": "Пользователь с таким логином уже зарегистрирован."}, 409)
                return
            user_id = secrets.token_hex(16)
            salt, hashed = password_hash(password)
            now = utc_now()
            connection.execute(
                "INSERT INTO users(id, username, full_name, password_salt, password_hash, role, active, created_at, updated_at, account_type) VALUES (?, ?, ?, ?, ?, 'user', 0, ?, ?, ?)",
                (user_id, username, full_name, salt, hashed, now, now, account_type),
            )
            connection.commit()
            connection.close()
            self.send_json({"message": "Заявка на регистрацию отправлена. Дождитесь подтверждения администратора."})
            return

        if path == "/api/login":
            username = str(payload.get("username", "")).strip().lower()
            password = str(payload.get("password", ""))
            connection = db()
            row = connection.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            connection.close()
            if row is None or not password_matches(password, row["password_salt"], row["password_hash"]):
                self.send_json({"error": "Неверный логин или пароль."}, 401)
                return
            if not row["active"]:
                self.send_json({"error": "Аккаунт ожидает подтверждения администратора."}, 403)
                return
            session_cookie = self.set_session(row["id"])
            self.send_json({"authenticated": True, "user": user_dict(row)}, 200, session_cookie)
            return

        if path == "/api/logout":
            clear_cookie = self.clear_session()
            self.send_response_bytes(200, json.dumps({"authenticated": False}).encode("utf-8"), extra_headers=[("Set-Cookie", clear_cookie)])
            return

        if path == "/api/violations":
            user = self.current_user()
            if user is None:
                self.send_json({"error": "Требуется вход в систему."}, 401)
                return
            if account_role(user) != "qalqon":
                self.send_json({"error": "Отправлять нарушения может только Qalqon."}, 403)
                return
            student_id = str(payload.get("studentId", "")).strip()
            description = str(payload.get("description", "")).strip()
            if not student_id or not description or len(description) > 1000:
                self.send_json({"error": "Выберите студента и введите описание до 1000 символов."}, 400)
                return
            attachment_json = None
            if "attachment" in payload:
                try:
                    attachment_json = normalize_violation_attachment(payload["attachment"])
                except ValueError as error:
                    self.send_json({"error": str(error)}, 400)
                    return
            violation_id = secrets.token_hex(16)
            now = utc_now()
            connection = db()
            student_exists = connection.execute(
                "SELECT id FROM students WHERE id = ?", (student_id,)
            ).fetchone()
            if student_exists is None:
                connection.close()
                self.send_json({"error": "Студент не найден."}, 404)
                return
            connection.execute(
                """
                INSERT INTO violations
                    (id, student_id, reporter_id, description, attachment_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (violation_id, student_id, user["id"], description, attachment_json, now, now),
            )
            connection.commit()
            row = connection.execute(
                """
                SELECT v.*, s.data AS student_data, u.full_name AS reporter_name
                FROM violations v
                JOIN students s ON s.id = v.student_id
                LEFT JOIN users u ON u.id = v.reporter_id
                WHERE v.id = ?
                """,
                (violation_id,),
            ).fetchone()
            connection.close()
            self.send_json({"violation": violation_dict(row)}, 201)
            return

        if path == "/api/students":
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            student = payload
            student.pop("violations", None)
            student_id = secrets.token_hex(16)
            now = utc_now()
            connection = db()
            connection.execute(
                "INSERT INTO students(id, data, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (student_id, json.dumps(student, ensure_ascii=False), now, now),
            )
            connection.commit()
            connection.close()
            student["id"] = student_id
            self.send_json({"student": student}, 201)
            return

        if path == "/api/faculties":
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            name = str(payload.get("name", "")).strip()
            if len(name) < 2:
                self.send_json({"error": "Введите название факультета."}, 400)
                return
            faculty_id = secrets.token_hex(16)
            now = utc_now()
            connection = db()
            try:
                connection.execute(
                    "INSERT INTO faculties(id, name, groups_json, created_at, updated_at) VALUES (?, ?, '[]', ?, ?)",
                    (faculty_id, name, now, now),
                )
                connection.commit()
            except integrity_error_types():
                connection.close()
                self.send_json({"error": "Факультет с таким названием уже существует."}, 409)
                return
            connection.close()
            self.send_json({"faculty": {"id": faculty_id, "name": name, "groups": []}}, 201)
            return

        self.send_json({"error": "Маршрут не найден."}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if not self.check_mutation_origin():
            self.send_json({"error": "Некорректный источник запроса."}, 403)
            return
        try:
            payload = self.read_json()
        except ValueError as error:
            self.send_json({"error": str(error)}, 400)
            return

        if path.startswith("/api/violations/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            violation_id = path.rsplit("/", 1)[1]
            student_id = str(payload.get("studentId", "")).strip()
            description = str(payload.get("description", "")).strip()
            if not student_id or not description or len(description) > 1000:
                self.send_json({"error": "Выберите студента и введите описание до 1000 символов."}, 400)
                return
            try:
                attachment_json = normalize_violation_attachment(payload.get("attachment"))
            except ValueError as error:
                self.send_json({"error": str(error)}, 400)
                return
            connection = db()
            existing = connection.execute(
                "SELECT id FROM violations WHERE id = ?", (violation_id,)
            ).fetchone()
            if existing is None:
                connection.close()
                self.send_json({"error": "Нарушение не найдено."}, 404)
                return
            student_exists = connection.execute(
                "SELECT id FROM students WHERE id = ?", (student_id,)
            ).fetchone()
            if student_exists is None:
                connection.close()
                self.send_json({"error": "Студент не найден."}, 404)
                return
            if "attachment" in payload:
                connection.execute(
                    """
                    UPDATE violations
                    SET student_id = ?, description = ?, attachment_json = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (student_id, description, attachment_json, utc_now(), violation_id),
                )
            else:
                connection.execute(
                    """
                    UPDATE violations
                    SET student_id = ?, description = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (student_id, description, utc_now(), violation_id),
                )
            connection.commit()
            row = connection.execute(
                """
                SELECT v.*, s.data AS student_data, u.full_name AS reporter_name
                FROM violations v
                JOIN students s ON s.id = v.student_id
                LEFT JOIN users u ON u.id = v.reporter_id
                WHERE v.id = ?
                """,
                (violation_id,),
            ).fetchone()
            connection.close()
            self.send_json({"violation": violation_dict(row)})
            return

        if path.startswith("/api/students/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            student_id = path.rsplit("/", 1)[1]
            connection = db()
            existing = connection.execute("SELECT id FROM students WHERE id = ?", (student_id,)).fetchone()
            if existing is None:
                connection.close()
                self.send_json({"error": "Студент не найден."}, 404)
                return
            payload.pop("violations", None)
            payload["id"] = student_id
            connection.execute(
                "UPDATE students SET data = ?, updated_at = ? WHERE id = ?",
                (json.dumps(payload, ensure_ascii=False), utc_now(), student_id),
            )
            connection.commit()
            connection.close()
            self.send_json({"student": payload})
            return

        if path.startswith("/api/faculties/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            faculty_id = path.rsplit("/", 1)[1]
            connection = db()
            row = connection.execute("SELECT * FROM faculties WHERE id = ?", (faculty_id,)).fetchone()
            if row is None:
                connection.close()
                self.send_json({"error": "Факультет не найден."}, 404)
                return
            groups = payload.get("groups")
            if not isinstance(groups, list):
                connection.close()
                self.send_json({"error": "Некорректный список групп."}, 400)
                return
            connection.execute(
                "UPDATE faculties SET groups_json = ?, updated_at = ? WHERE id = ?",
                (json.dumps(groups, ensure_ascii=False), utc_now(), faculty_id),
            )
            group_names = {
                str(group.get("name", "")).strip()
                for group in groups
                if isinstance(group, dict)
            }
            assigned_groups = connection.execute(
                "SELECT user_id, group_name FROM tutor_groups WHERE faculty = ?",
                (row["name"],),
            ).fetchall()
            for assigned in assigned_groups:
                if assigned["group_name"] not in group_names:
                    connection.execute(
                        "DELETE FROM tutor_groups WHERE user_id = ? AND faculty = ? AND group_name = ?",
                        (assigned["user_id"], row["name"], assigned["group_name"]),
                    )
            connection.commit()
            connection.close()
            self.send_json({"faculty": {"id": faculty_id, "name": row["name"], "groups": groups}})
            return

        if path.startswith("/api/admin/users/"):
            user, error = self.require_main_admin()
            if error:
                self.send_json(*error)
                return
            parts = path.strip("/").split("/")
            if len(parts) != 5:
                self.send_json({"error": "Маршрут не найден."}, 404)
                return
            user_id = parts[3]
            action = parts[4]
            connection = db()
            target = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if target is None:
                connection.close()
                self.send_json({"error": "Пользователь не найден."}, 404)
                return
            if action == "grant":
                password = str(payload.get("password", ""))
                if len(password) < 8:
                    connection.close()
                    self.send_json({"error": "Пароль должен содержать не менее 8 символов."}, 400)
                    return
                salt, hashed = password_hash(password)
                now = utc_now()
                connection.execute(
                    "UPDATE users SET role = 'admin', account_type = 'qalqon', password_salt = ?, password_hash = ?, active = 1, updated_at = ? WHERE id = ?",
                    (salt, hashed, now, user_id),
                )
                connection.execute("DELETE FROM tutor_groups WHERE user_id = ?", (user_id,))
                connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
                connection.commit()
                connection.close()
                self.send_json({"message": "Права администратора выданы, пароль установлен."})
                return
            if action == "revoke":
                if target["role"] == "main_admin":
                    connection.close()
                    self.send_json({"error": "Нельзя отозвать права главного администратора."}, 403)
                    return
                now = utc_now()
                connection.execute(
                    "UPDATE users SET role = 'user', account_type = 'qalqon', updated_at = ? WHERE id = ?",
                    (now, user_id),
                )
                connection.execute("DELETE FROM tutor_groups WHERE user_id = ?", (user_id,))
                connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
                connection.commit()
                connection.close()
                self.send_json({"message": "Права администратора отозваны."})
                return
            if action == "approve":
                if target["role"] != "user":
                    connection.close()
                    self.send_json({"error": "Подтвердить можно только обычный аккаунт."}, 400)
                    return
                connection.execute(
                    "UPDATE users SET active = 1, updated_at = ? WHERE id = ?",
                    (utc_now(), user_id),
                )
                connection.commit()
                connection.close()
                self.send_json({"message": "Аккаунт подтверждён."})
                return
            if action == "groups":
                if target["role"] != "user" or target["account_type"] != "tutor":
                    connection.close()
                    self.send_json({"error": "Группы можно назначить только тьютору."}, 400)
                    return
                groups = payload.get("groups")
                if not isinstance(groups, list):
                    connection.close()
                    self.send_json({"error": "Некорректный список групп."}, 400)
                    return
                normalized_groups = []
                available_faculties = connection.execute(
                    "SELECT name, groups_json FROM faculties"
                ).fetchall()
                available = {
                    (faculty["name"], group["name"])
                    for faculty in available_faculties
                    for group in json.loads(faculty["groups_json"])
                }
                for group in groups:
                    if not isinstance(group, dict):
                        connection.close()
                        self.send_json({"error": "Некорректная группа."}, 400)
                        return
                    faculty = str(group.get("faculty", "")).strip()
                    group_name = str(group.get("group", "")).strip()
                    if (faculty, group_name) not in available:
                        connection.close()
                        self.send_json({"error": "Выбрана несуществующая группа."}, 400)
                        return
                    if (faculty, group_name) not in normalized_groups:
                        normalized_groups.append((faculty, group_name))
                connection.execute("DELETE FROM tutor_groups WHERE user_id = ?", (user_id,))
                connection.executemany(
                    "INSERT INTO tutor_groups(user_id, faculty, group_name) VALUES (?, ?, ?)",
                    [(user_id, faculty, group_name) for faculty, group_name in normalized_groups],
                )
                connection.commit()
                connection.close()
                self.send_json({"message": "Группы тьютору назначены."})
                return
            if action == "password":
                password = str(payload.get("password", ""))
                if len(password) < 8:
                    connection.close()
                    self.send_json({"error": "Пароль должен содержать не менее 8 символов."}, 400)
                    return
                salt, hashed = password_hash(password)
                now = utc_now()
                connection.execute(
                    "UPDATE users SET password_salt = ?, password_hash = ?, updated_at = ? WHERE id = ?",
                    (salt, hashed, now, user_id),
                )
                connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
                connection.commit()
                connection.close()
                self.send_json({"message": "Пароль пользователя изменён."})
                return
            connection.close()
            self.send_json({"error": "Неизвестное действие."}, 404)
            return

        self.send_json({"error": "Маршрут не найден."}, 404)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not self.check_mutation_origin():
            self.send_json({"error": "Некорректный источник запроса."}, 403)
            return
        if path.startswith("/api/violations/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            violation_id = path.rsplit("/", 1)[1]
            connection = db()
            result = connection.execute(
                "DELETE FROM violations WHERE id = ?", (violation_id,)
            )
            connection.commit()
            connection.close()
            if result.rowcount == 0:
                self.send_json({"error": "Нарушение не найдено."}, 404)
                return
            self.send_json({"message": "Нарушение удалено."})
            return
        if path.startswith("/api/students/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            student_id = path.rsplit("/", 1)[1]
            connection = db()
            try:
                result = connection.execute("DELETE FROM students WHERE id = ?", (student_id,))
                connection.commit()
            except integrity_error_types():
                connection.close()
                self.send_json({"error": "Сначала удалите нарушения этого студента."}, 409)
                return
            connection.close()
            if result.rowcount == 0:
                self.send_json({"error": "Студент не найден."}, 404)
                return
            self.send_json({"message": "Студент удалён."})
            return
        if path.startswith("/api/faculties/"):
            user, error = self.require_admin()
            if error:
                self.send_json(*error)
                return
            faculty_id = path.rsplit("/", 1)[1]
            connection = db()
            row = connection.execute("SELECT name FROM faculties WHERE id = ?", (faculty_id,)).fetchone()
            if row is None:
                connection.close()
                self.send_json({"error": "Факультет не найден."}, 404)
                return
            student_count = connection.execute("SELECT COUNT(*) AS count FROM students").fetchone()["count"]
            blocked = False
            if student_count:
                for student_row in connection.execute("SELECT data FROM students").fetchall():
                    student_data = json.loads(student_row["data"])
                    if student_data.get("faculty") == row["name"]:
                        blocked = True
                        break
            if blocked:
                connection.close()
                self.send_json({"error": "Нельзя удалить: на факультете числятся студенты."}, 409)
                return
            connection.execute("DELETE FROM tutor_groups WHERE faculty = ?", (row["name"],))
            connection.execute("DELETE FROM faculties WHERE id = ?", (faculty_id,))
            connection.commit()
            connection.close()
            self.send_json({"message": "Факультет удалён."})
            return
        self.send_json({"error": "Маршрут не найден."}, 404)

    def send_json(self, payload, status=200, set_cookie=None):
        status, body = json_bytes(payload, status)
        headers = None
        if set_cookie:
            headers = [("Set-Cookie", set_cookie)]
        self.send_response_bytes(status, body, extra_headers=headers)


def run():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), RegistryHandler)
    print("Student registry running at http://%s:%d" % (HOST, PORT))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
