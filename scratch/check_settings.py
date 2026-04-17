import sqlite3
import os

def check_settings():
    conn = sqlite3.connect('ost.db')
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM settings')
    for key, value in cursor.fetchall():
        print(f"{key}: {value}")
    conn.close()

if __name__ == "__main__":
    check_settings()
