import sqlite3
import json
from contextlib import contextmanager

DATABASE = 'tinystories.db'

def get_ts_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_ts_db_context():
    conn = get_ts_db()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_ts_db():
    with get_ts_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tinystories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                moral TEXT,
                vocab_json TEXT,
                fill_in_blanks_json TEXT,
                mcq_json TEXT,
                moral_questions_json TEXT,
                image_url TEXT,
                audio_url TEXT,
                audio_speed REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Vocabulary progress table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vocabulary_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT UNIQUE NOT NULL,
                meaning TEXT,
                status TEXT DEFAULT 'new', -- new, learning, mastered
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                occurrence_count INTEGER DEFAULT 1
            )
        ''')
        
        # Add columns if they missed the creation
        try:
            cursor.execute("ALTER TABLE tinystories ADD COLUMN image_url TEXT")
        except sqlite3.OperationalError:
            pass # Column exists
            
        try:
            cursor.execute("ALTER TABLE tinystories ADD COLUMN audio_url TEXT")
        except sqlite3.OperationalError:
            pass # Column exists

        try:
            cursor.execute("ALTER TABLE tinystories ADD COLUMN audio_speed REAL")
        except sqlite3.OperationalError:
            pass # Column exists

        conn.commit()

# Run this once on import or explicitly
init_ts_db()
