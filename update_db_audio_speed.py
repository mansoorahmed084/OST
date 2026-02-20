"""Add audio_speed column to stories so playback uses the same speed as generation."""
import sqlite3

DATABASE = 'ost.db'

def main():
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE stories ADD COLUMN audio_speed REAL DEFAULT 0.8")
        conn.commit()
        print("Added audio_speed column to stories.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column audio_speed already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
