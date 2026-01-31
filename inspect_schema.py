import sqlite3

def inspect_db():
    try:
        conn = sqlite3.connect('ost.db')
        cursor = conn.cursor()
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        for table in tables:
            print(table[0])
            print("-" * 20)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_db()
