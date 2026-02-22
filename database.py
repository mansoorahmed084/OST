"""
Database module for OST
Using SQLite for simplicity
"""

import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager

DATABASE = 'ost.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db_context():
    """Context manager for database connections"""
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    """Initialize database with required tables"""
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        # Stories table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                theme TEXT,
                difficulty_level TEXT DEFAULT 'easy',
                image_category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_read TIMESTAMP
            )
        ''')
        
        # Story sentences table (for highlighting sync)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS story_sentences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                story_id INTEGER NOT NULL,
                sentence_order INTEGER NOT NULL,
                sentence_text TEXT NOT NULL,
                FOREIGN KEY (story_id) REFERENCES stories (id)
            )
        ''')
        
        # Quiz questions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                story_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                options TEXT,
                correct_answer TEXT NOT NULL,
                question_type TEXT DEFAULT 'mcq',
                FOREIGN KEY (story_id) REFERENCES stories (id)
            )
        ''')
        
        # User progress table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                story_id INTEGER NOT NULL,
                activity_type TEXT NOT NULL,
                score REAL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (story_id) REFERENCES stories (id)
            )
        ''')
        
        # ChatMode history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatmode_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                category TEXT,
                image_path TEXT,
                explanation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Chatbot messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT DEFAULT 'omar_session',
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Chatbot memory state (for summaries)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_memory_state (
                session_id TEXT PRIMARY KEY,
                summary TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Achievements Definitions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon_url TEXT,
                emoji TEXT NOT NULL,
                condition_type TEXT NOT NULL,
                condition_threshold INTEGER NOT NULL DEFAULT 1,
                category TEXT DEFAULT 'short'
            )
        ''')
        
        # User Unlocked Achievements
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                achievement_id TEXT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (achievement_id) REFERENCES achievements (id),
                UNIQUE(achievement_id)
            )
        ''')

        # Safely add category column if missing
        try:
            cursor.execute("ALTER TABLE achievements ADD COLUMN category TEXT DEFAULT 'short'")
        except Exception:
            pass  # Column already exists

        # Insert sample stories if table is empty
        cursor.execute('SELECT COUNT(*) FROM stories')
        if cursor.fetchone()[0] == 0:
            insert_sample_stories(cursor)
            
        # Always run - uses INSERT OR IGNORE so existing badges are safe
        insert_default_achievements(cursor)
        
        conn.commit()

def insert_default_achievements(cursor):
    """Insert default achievements - uses INSERT OR IGNORE to preserve existing data"""
    achievements = [
        # === SHORT-TERM (Quick Wins) ===
        ('first_story', 'First Story!', 'You read your very first story!', '📚', 'story_read', 1, 'short'),
        ('first_practice', 'First Words', 'You practiced speaking out loud!', '🎤', 'practice', 1, 'short'),
        ('first_chat', 'Say Hello', 'You talked to Buddy for the first time!', '👋', 'chat', 1, 'short'),
        ('first_scramble', 'Puzzle Starter', 'You completed your first Story Scramble!', '🧩', 'writing', 1, 'short'),
        ('first_vocab', 'Word Finder', 'You discovered your first new word!', '🔤', 'vocab_new', 1, 'short'),
        ('perfect_quiz', 'Quiz Master', 'You got a perfect score on a quiz!', '🧠', 'quiz_perfect', 1, 'short'),
        
        # === MEDIUM-TERM (Dedication) ===
        ('story_reader_5', 'Bookworm', 'You have read 5 stories!', '🐛', 'story_read', 5, 'medium'),
        ('practice_pro_5', 'Super Speaker', 'You completed 5 speaking practices!', '🗣️', 'practice', 5, 'medium'),
        ('chat_buddy_5', 'Best Friends', 'You chatted with Buddy 5 times!', '🤖', 'chat', 5, 'medium'),
        ('scramble_5', 'Sentence Builder', 'You completed 5 Story Scramble challenges!', '🏗️', 'writing', 5, 'medium'),
        ('vocab_25', 'Word Collector', 'You have learned 25 new words!', '📖', 'vocab_new', 25, 'medium'),
        ('story_reader_10', 'Story Explorer', 'You have read 10 stories!', '🗺️', 'story_read', 10, 'medium'),
        ('streak_7', '7-Day Champion', 'You practiced 7 days in a row!', '🔥', 'daily_streak', 7, 'medium'),
        
        # === LONG-TERM (Mastery) ===
        ('story_reader_25', 'Library Hero', 'You have read 25 stories!', '🏛️', 'story_read', 25, 'long'),
        ('story_reader_50', 'Storyteller Legend', 'You have read 50 stories!', '👑', 'story_read', 50, 'long'),
        ('vocab_50', 'Vocab Explorer', 'You have learned 50 words!', '🔭', 'vocab_new', 50, 'long'),
        ('vocab_100', 'Word Wizard', 'You have mastered 100 words!', '🧙', 'vocab_new', 100, 'long'),
        ('practice_pro_25', 'Voice Champion', 'You completed 25 speaking practices!', '🎖️', 'practice', 25, 'long'),
        ('scramble_25', 'Master Builder', 'You completed 25 Story Scramble challenges!', '🏆', 'writing', 25, 'long'),
        ('streak_30', '30-Day Legend', 'You practiced 30 days in a row!', '💎', 'daily_streak', 30, 'long'),
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO achievements (id, title, description, emoji, condition_type, condition_threshold, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', achievements)


def insert_sample_stories(cursor):
    """Insert sample stories for testing"""
    sample_stories = [
        {
            'title': 'The Happy Dog',
            'content': 'There was a happy dog. The dog liked to play. The dog had a red ball. The dog played with the ball every day. The dog was very happy.',
            'theme': 'animals',
            'difficulty_level': 'easy',
            'image_category': 'animals'
        },
        {
            'title': 'The Big Red Bus',
            'content': 'Omar saw a big red bus. The bus was very big. The bus had many wheels. People sat in the bus. The bus went to the city.',
            'theme': 'vehicles',
            'difficulty_level': 'easy',
            'image_category': 'vehicles'
        },
        {
            'title': 'My Family',
            'content': 'I have a family. My family is nice. I have a mother. I have a father. We eat together. We play together. I love my family.',
            'theme': 'family',
            'difficulty_level': 'easy',
            'image_category': 'family'
        }
    ]
    
    for story in sample_stories:
        cursor.execute('''
            INSERT INTO stories (title, content, theme, difficulty_level, image_category)
            VALUES (?, ?, ?, ?, ?)
        ''', (story['title'], story['content'], story['theme'], 
              story['difficulty_level'], story['image_category']))
        
        story_id = cursor.lastrowid
        
        # Split content into sentences
        sentences = [s.strip() + '.' for s in story['content'].split('.') if s.strip()]
        for idx, sentence in enumerate(sentences):
            cursor.execute('''
                INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                VALUES (?, ?, ?)
            ''', (story_id, idx, sentence))

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully!")
