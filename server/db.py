import sqlite3
from uuid import uuid4
from datetime import datetime

DB_FILE = "app.db"

def init_db():
    """
    Initializes the database and creates required tables if they do not exist.
    """
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        # Create users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            credits INTEGER NOT NULL DEFAULT 20,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            timestamp TEXT NOT NULL
        )
        """)

        # Create activities table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            email TEXT NOT NULL,
            question TEXT NOT NULL,
            image_path TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)


def get_or_create_user(email):
    """
    Get a user from the database or create them if they don't exist.
    """
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        # Check if the user exists
        cursor.execute("SELECT id, credits FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        if not user:
            # Create a new user
            user_id = str(uuid4())
            timestamp = datetime.now().isoformat()
            cursor.execute(
                "INSERT INTO users (id, email, credits, status, timestamp) VALUES (?, ?, ?, ?, ?)",
                (user_id, email, 20, "ACTIVE", timestamp)
            )
            conn.commit()
            return user_id, 20
        else:
            return user[0], user[1]  # Return user_id and credits


def log_activity(user_id, email, question, image_path):
    """
    Log an activity in the activities table.
    """
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO activities (user_id, email, question, image_path, timestamp) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, question, image_path, timestamp)
        )
        conn.commit()


def deduct_credit(user_id):
    """
    Deduct one credit from the user's account.
    """
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET credits = credits - 1 WHERE id = ?", (user_id,))
        conn.commit()
