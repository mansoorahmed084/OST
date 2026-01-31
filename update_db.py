import sqlite3
import os

DATABASE = 'ost.db'

def update_database():
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if 'moral' column exists in stories table
        cursor.execute("PRAGMA table_info(stories)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'moral' not in columns:
            print("Adding 'moral' column to stories table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN moral TEXT")
            print("Column added successfully.")
        else:
            print("'moral' column already exists.")
            
        conn.commit()
        conn.close()
        print("Database update complete.")
        
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    update_database()
