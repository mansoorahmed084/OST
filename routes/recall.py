"""
Recall & Writing API Routes
Handles spaced repetition and writing exercises
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
from datetime import datetime, timedelta
import random

bp = Blueprint('recall', __name__)

@bp.route('/due', methods=['GET'])
def get_due_stories():
    """Get stories due for review (read more than 24h ago)"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Simple logic: stories read > 24 hours ago OR never reviewed
            # For now, let's just get stories read and sort by last_read ASC
            cursor.execute('''
                SELECT id, title, theme, image_category, last_read
                FROM stories
                WHERE last_read IS NOT NULL
                ORDER BY last_read ASC
                LIMIT 3
            ''')
            stories = cursor.fetchall()
            
            # Add simple "due" status logic
            due_stories = []
            now = datetime.now()
            
            for story in stories:
                s_dict = dict(story)
                last_read_str = str(s_dict['last_read'])
                
                try:
                    if 'T' in last_read_str:
                        last_read = datetime.fromisoformat(last_read_str)
                    else:
                        # Handle space separator (default SQLite)
                        # Truncate microseconds if needed or parse flexible
                        last_read = datetime.strptime(last_read_str, '%Y-%m-%d %H:%M:%S.%f')
                except ValueError:
                    try:
                        # Try without microseconds
                        last_read = datetime.strptime(last_read_str, '%Y-%m-%d %H:%M:%S')
                    except:
                        # If parsing fails, treat as very old
                        last_read = datetime.min
                
                # If read more than 24 hours ago
                if (now - last_read) > timedelta(hours=24):
                    s_dict['status'] = 'due'
                    s_dict['message'] = 'Ready for review!'
                    due_stories.append(s_dict)
                else:
                    # For demo purposes, we might want to return some anyway if list is empty
                    # but strictly, these are "recent"
                    s_dict['status'] = 'recent'
                    s_dict['message'] = 'Read recently'
                    # Optional: Include them if you want to allow reviewing anyway
                    # due_stories.append(s_dict) 
            
            # If no due stories, maybe return the oldest read stories as practice?
            if not due_stories and stories:
                # Take oldest 2
                for s in stories[:2]:
                     s_dict = dict(s)
                     s_dict['status'] = 'practice'
                     s_dict['message'] = 'Review for practice'
                     due_stories.append(s_dict)

            return jsonify({
                'success': True,
                'stories': due_stories
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/prompt/<int:story_id>', methods=['GET'])
def get_writing_prompt(story_id):
    """Get a writing prompt for a story"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT title, content, theme, moral FROM stories WHERE id = ?', (story_id,))
            story = cursor.fetchone()
            
            if not story:
                return jsonify({'success': False, 'error': 'Story not found'}), 404
                
            # Generate simple prompts
            prompts = [
                f"What happened in '{story['title']}'?",
                f"What was your favorite part of the story?",
                f"Write a new ending for '{story['title']}'.",
                f"How would you explain the moral: '{story['moral']}'?" if story['moral'] else "What did you learn from this story?"
            ]
            
            # Extract some keywords for checking
            content_words = set(story['content'].lower().split())
            important_words = [w for w in content_words if len(w) > 3]
            keywords = random.sample(important_words, min(5, len(important_words)))
            
            return jsonify({
                'success': True,
                'prompt': random.choice(prompts),
                'story_title': story['title'],
                'keywords': keywords
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/check', methods=['POST'])
def check_writing():
    """Simple check for writing submission"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        keywords = data.get('keywords', [])
        
        if not text:
            return jsonify({'success': False, 'error': 'No text provided'}), 400
            
        # Basic Analysis
        word_count = len(text.split())
        used_keywords = [k for k in keywords if k.lower() in text.lower()]
        
        score = 0
        feedback = []
        
        # Scoring logic
        if word_count >= 5:
            score += 20
            feedback.append("Good sentence length!")
        else:
            feedback.append("Try to write a bit more.")
            
        if used_keywords:
            score += len(used_keywords) * 10
            feedback.append(f"Great job using story words: {', '.join(used_keywords)}!")
        
        score = min(100, score) # Cap at 100
        
        if score > 80:
            emoji = "🌟"
            msg = "Amazing writing!"
        elif score > 50:
            emoji = "👍"
            msg = "Good effort!"
        else:
            emoji = "📝"
            msg = "Keep practicing!"
            
        return jsonify({
            'success': True,
            'score': score,
            'feedback': feedback,
            'message': msg,
            'emoji': emoji
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
