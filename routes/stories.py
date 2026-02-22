"""
Stories API Routes
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
from datetime import datetime

bp = Blueprint('stories', __name__)

@bp.route('', methods=['GET'])
def get_stories():
    """Get all stories"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, title, theme, difficulty_level, image_category, 
                       created_at, last_read
                FROM stories
                ORDER BY created_at DESC
            ''')
            stories = cursor.fetchall()
            
            return jsonify({
                'success': True,
                'stories': [dict(story) for story in stories]
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<int:story_id>', methods=['GET'])
def get_story(story_id):
    """Get a specific story with sentences"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Get story details
            try:
                cursor.execute('''
                    SELECT id, title, content, moral, theme, difficulty_level, 
                           image_category, vocab_json, created_at, last_read,
                           translated_title, target_language, audio_speed
                    FROM stories
                    WHERE id = ?
                ''', (story_id,))
            except Exception:
                cursor.execute('''
                    SELECT id, title, content, moral, theme, difficulty_level, 
                           image_category, vocab_json, created_at, last_read,
                           translated_title, target_language
                    FROM stories
                    WHERE id = ?
                ''', (story_id,))
            story = cursor.fetchone()
            if story:
                story_dict = dict(story)
                story_dict.setdefault('audio_speed', None)
            else:
                story_dict = None
            
            if not story_dict:
                return jsonify({
                    'success': False,
                    'error': 'Story not found'
                }), 404
            
            # Get sentences
            cursor.execute('''
                SELECT sentence_order, sentence_text, translated_text
                FROM story_sentences
                WHERE story_id = ?
                ORDER BY sentence_order
            ''', (story_id,))
            sentences = cursor.fetchall()
            
            # Update last_read timestamp
            cursor.execute('''
                UPDATE stories
                SET last_read = ?
                WHERE id = ?
            ''', (datetime.now(), story_id))
            
            story_dict['sentences'] = [dict(s) for s in sentences]
            
            return jsonify({
                'success': True,
                'story': story_dict
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/batch-delete', methods=['POST'])
def delete_stories_batch():
    """Delete multiple stories"""
    try:
        data = request.json or {}
        story_ids = data.get('story_ids', [])
        
        if not story_ids:
            return jsonify({
                'success': False,
                'error': 'No story IDs provided'
            }), 400
            
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Create placeholders for IN clause
            placeholders = ', '.join('?' * len(story_ids))
            
            # Delete sentences
            cursor.execute(f'DELETE FROM story_sentences WHERE story_id IN ({placeholders})', story_ids)
            
            # Delete stories
            cursor.execute(f'DELETE FROM stories WHERE id IN ({placeholders})', story_ids)
            
            return jsonify({
                'success': True,
                'message': f'{cursor.rowcount} stories deleted successfully'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """Delete a story and its audio"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Delete sentences first
            cursor.execute('DELETE FROM story_sentences WHERE story_id = ?', (story_id,))
            
            # Delete story
            cursor.execute('DELETE FROM stories WHERE id = ?', (story_id,))
            
            if cursor.rowcount == 0:
                return jsonify({
                    'success': False,
                    'error': 'Story not found'
                }), 404
            
            # Delete Audio Files
            try:
                import os
                import glob
                audio_dir = 'static/audio'
                # Pattern: story_{id}_*.mp3
                pattern = os.path.join(audio_dir, f"story_{story_id}_*.mp3")
                files = glob.glob(pattern)
                for f in files:
                    os.remove(f)
                    print(f"Deleted audio file: {f}")
            except Exception as e:
                print(f"Error deleting audio files: {e}")
            
            return jsonify({
                'success': True,
                'message': 'Story and audio deleted successfully'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
@bp.route('/random-sentence', methods=['GET'])
def get_random_sentence():
    """Get a random sentence for practice from story library"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Get a random sentence from story_sentences table
            cursor.execute('''
                SELECT sentence_text 
                FROM story_sentences 
                ORDER BY RANDOM() 
                LIMIT 1
            ''')
            row = cursor.fetchone()
            
            if row:
                return jsonify({
                    'success': True,
                    'sentence': row[0]
                })
            else:
                # Fallback to hardcoded list if no stories exist
                fallback_sentences = [
                    "The dog is happy",
                    "I like to play",
                    "The sun is bright",
                    "I love my family",
                    "The car is red"
                ]
                import random
                return jsonify({
                    'success': True,
                    'sentence': random.choice(fallback_sentences)
                })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
