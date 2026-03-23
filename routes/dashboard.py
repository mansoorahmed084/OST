from flask import Blueprint, jsonify, request
from database import get_db_context
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

bp = Blueprint('dashboard', __name__)

@bp.route('/stats/summary', methods=['GET'])
def get_dashboard_summary():
    """Get high-level stats for the dashboard cards"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Total stories mastered
            cursor.execute("SELECT COUNT(DISTINCT story_id) FROM user_progress WHERE score >= 80")
            stories_mastered = cursor.fetchone()[0]
            
            # Total points earned
            cursor.execute("SELECT SUM(points_earned) FROM user_progress")
            total_points = cursor.fetchone()[0] or 0
            
            # Words learned (vocab count from stories)
            # This is an estimate based on progress
            cursor.execute("SELECT COUNT(*) FROM user_progress WHERE activity_type = 'quiz'")
            sessions_count = cursor.fetchone()[0]
            
            # Accuracy trend (average score of last 5 sessions)
            cursor.execute("SELECT AVG(score) FROM user_progress WHERE activity_type = 'quiz' ORDER BY created_at DESC LIMIT 5")
            avg_accuracy = cursor.fetchone()[0] or 0
            
            return jsonify({
                'success': True,
                'stats': {
                    'stories_mastered': stories_mastered,
                    'total_points': total_points,
                    'sessions_completed': sessions_count,
                    'avg_accuracy': round(avg_accuracy, 1)
                }
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/stats/charts', methods=['GET'])
def get_chart_data():
    """Get accuracy and completion data for Chart.js"""
    try:
        # Last 7 days trend
        days = []
        accuracy_data = []
        completion_data = []
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            for i in range(6, -1, -1):
                date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                days.append(date)
                
                # Avg accuracy for that day
                cursor.execute("""
                    SELECT AVG(score) FROM user_progress 
                    WHERE date(created_at) = ? AND activity_type = 'quiz'
                """, (date,))
                acc = cursor.fetchone()[0] or 0
                accuracy_data.append(round(acc, 1))
                
                # Count completions
                cursor.execute("""
                    SELECT COUNT(*) FROM user_progress 
                    WHERE date(created_at) = ?
                """, (date,))
                comp = cursor.fetchone()[0] or 0
                completion_data.append(comp)
                
        return jsonify({
            'success': True,
            'labels': days,
            'accuracy': accuracy_data,
            'completions': completion_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/history', methods=['GET'])
def get_session_history():
    """Get detailed session history for the table"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.created_at, s.title, p.activity_type, p.score, p.points_earned, p.points_possible
                FROM user_progress p
                JOIN stories s ON p.story_id = s.id
                ORDER BY p.created_at DESC
                LIMIT 20
            """)
            history = [dict(row) for row in cursor.fetchall()]
            return jsonify({'success': True, 'history': history})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/journal', methods=['POST'])
def submit_journal():
    """Submit a daily journal entry"""
    try:
        data = request.json
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        mood = data.get('mood')
        sleep = data.get('sleep')
        appetite = data.get('appetite')
        focus = data.get('focus')
        notes = data.get('notes')
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO daily_logs (date, mood, sleep, appetite, focus, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (date, mood, sleep, appetite, focus, notes))
            
            return jsonify({'success': True, 'message': 'Journal updated!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/journal/<date>', methods=['GET'])
def get_journal(date):
    """Get journal entry for a specific date"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM daily_logs WHERE date = ?", (date,))
            row = cursor.fetchone()
            return jsonify({'success': True, 'log': dict(row) if row else None})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
