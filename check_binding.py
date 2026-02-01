
import sqlite3
import json

conn = sqlite3.connect('ost.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM stories ORDER BY id DESC LIMIT 1")
story = cursor.fetchone()

print("\n--- Last Story ---")
if story:
    print(f"ID: {story['id']}")
    print(f"Title: {story['title']}")
    print(f"Target Lang: {story['target_language']}")
    print(f"Trans Title: {story['translated_title']}")
    
    cursor.execute("SELECT * FROM story_sentences WHERE story_id = ?", (story['id'],))
    sentences = cursor.fetchall()
    print(f"Sentences: {len(sentences)}")
    for s in sentences:
        print(f" - [{s['sentence_order']}] En: {s['sentence_text'][:20]}... | Tr: {s['translated_text']}")
else:
    print("No stories found.")

conn.close()
