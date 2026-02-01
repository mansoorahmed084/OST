
import sqlite3

DATABASE = 'ost.db'

def update_schema():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # 1. Add target_language to stories
    try:
        cursor.execute("ALTER TABLE stories ADD COLUMN target_language TEXT DEFAULT 'en'")
        print("Added target_language to stories")
    except Exception as e:
        print(f"Skipping target_language: {e}")

    # 2. Add translated_title to stories
    try:
        cursor.execute("ALTER TABLE stories ADD COLUMN translated_title TEXT")
        print("Added translated_title to stories")
    except Exception as e:
        print(f"Skipping translated_title: {e}")
        
    # 3. Add translated_text to story_sentences
    try:
        cursor.execute("ALTER TABLE story_sentences ADD COLUMN translated_text TEXT")
        print("Added translated_text to story_sentences")
    except Exception as e:
        print(f"Skipping translated_text: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_schema()
