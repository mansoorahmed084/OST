import os
from flask import Blueprint, jsonify, request
from database import get_db_context

bp = Blueprint('achievements', __name__)

@bp.route('/check', methods=['POST'])
def check_achievements():
    """Triggered after an activity to see if new achievements were unlocked"""
    try:
        data = request.json
        activity_type = data.get('activity_type') # e.g., 'story_read', 'practice', 'chat'
        score = data.get('score', 0)
        
        newly_unlocked = []
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # 1. Base query for activity counts
            if activity_type == 'quiz_perfect':
                cursor.execute("SELECT COUNT(*) FROM user_progress WHERE activity_type = 'quiz' AND score = 100")
            elif activity_type == 'chat':
                cursor.execute("SELECT COUNT(*) FROM chatbot_messages WHERE role = 'user'")
            else:
                cursor.execute("SELECT COUNT(*) FROM user_progress WHERE activity_type = ?", (activity_type,))
                
            activity_count = cursor.fetchone()[0]
            
            # 2. Find eligible locked achievements
            cursor.execute('''
                SELECT id, title, description, icon_url, emoji
                FROM achievements
                WHERE condition_type = ? AND condition_threshold <= ?
                  AND id NOT IN (SELECT achievement_id FROM user_achievements)
            ''', (activity_type, activity_count))
            
            eligible_achievements = cursor.fetchall()
            
            # 3. Unlock them
            for ach in eligible_achievements:
                ach_dict = dict(ach)
                
                # Check mapping for safety
                cursor.execute('SELECT COUNT(*) FROM user_achievements WHERE achievement_id = ?', (ach_dict['id'],))
                if cursor.fetchone()[0] == 0:
                    cursor.execute('''
                        INSERT INTO user_achievements (achievement_id) VALUES (?)
                    ''', (ach_dict['id'],))
                    newly_unlocked.append(ach_dict)
            
            conn.commit()

        return jsonify({
            'success': True,
            'newly_unlocked': newly_unlocked
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/list', methods=['GET'])
def list_achievements():
    """Get all achievements, denoting which ones are unlocked"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT a.id, a.title, a.description, a.emoji, 
                       CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked,
                       ua.unlocked_at
                FROM achievements a
                LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
                ORDER BY a.condition_threshold ASC, a.title ASC
            ''')
            
            achievements = [dict(row) for row in cursor.fetchall()]
            
        return jsonify({
            'success': True,
            'achievements': achievements
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
