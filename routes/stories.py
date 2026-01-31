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
            cursor.execute('''
                SELECT id, title, content, theme, difficulty_level, 
                       image_category, created_at, last_read
                FROM stories
                WHERE id = ?
            ''', (story_id,))
            story = cursor.fetchone()
            
            if not story:
                return jsonify({
                    'success': False,
                    'error': 'Story not found'
                }), 404
            
            # Get sentences
            cursor.execute('''
                SELECT sentence_order, sentence_text
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
            
            story_dict = dict(story)
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

@bp.route('', methods=['POST'])
def create_story():
    """Create a new story"""
    try:
        data = request.json
        title = data.get('title')
        content = data.get('content')
        theme = data.get('theme', '')
        difficulty_level = data.get('difficulty_level', 'easy')
        image_category = data.get('image_category', '')
        
        if not title or not content:
            return jsonify({
                'success': False,
                'error': 'Title and content are required'
            }), 400
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Insert story
            cursor.execute('''
                INSERT INTO stories (title, content, theme, difficulty_level, image_category)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, content, theme, difficulty_level, image_category))
            
            story_id = cursor.lastrowid
            
            # Split content into sentences
            sentences = [s.strip() + '.' for s in content.split('.') if s.strip()]
            for idx, sentence in enumerate(sentences):
                cursor.execute('''
                    INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                    VALUES (?, ?, ?)
                ''', (story_id, idx, sentence))
            
            return jsonify({
                'success': True,
                'story_id': story_id,
                'message': 'Story created successfully'
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """Delete a story"""
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
            
            return jsonify({
                'success': True,
                'message': 'Story deleted successfully'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
