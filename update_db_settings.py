import sqlite3

DATABASE = 'ost.db'

def update_database():
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if settings table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
        if not cursor.fetchone():
            print("Creating 'settings' table...")
            cursor.execute('''
                CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            ''')
            
            # Insert defaults
            defaults = [
                ('llm_provider', 'default'),
                ('tts_provider', 'default'),
                ('voice_preset', 'default'), # default, ana, aria, alloy
                ('story_tone', 'default')    # default, happy, calm
            ]
            
            cursor.executemany('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', defaults)
            print("Settings table created and defaults inserted.")
        else:
            print("Settings table already exists.")
            
        conn.commit()
        conn.close()
        print("Database update complete.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_database()
