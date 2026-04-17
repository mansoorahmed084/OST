
import sqlite3

def check_settings():
    conn = sqlite3.connect('ost.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- Settings ---")
    try:
        cursor.execute("SELECT * FROM settings")
        rows = cursor.fetchall()
        for row in rows:
            print(f"{row['key']}: {row['value']}")
    except Exception as e:
        print(f"Error reading settings: {e}")
    
    print("\n--- Stories Count ---")
    try:
        cursor.execute("SELECT count(*) FROM stories")
        print(f"Total stories: {cursor.fetchone()[0]}")
    except Exception as e:
        print(f"Error reading stories: {e}")

    conn.close()

if __name__ == "__main__":
    check_settings()
