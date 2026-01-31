"""
Quiz API Routes
For comprehension testing
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import random

bp = Blueprint('quiz', __name__)

@bp.route('/generate/<int:story_id>', methods=['POST'])
def generate_quiz(story_id):
    """Generate quiz questions from a story"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Get story
            cursor.execute('SELECT content FROM stories WHERE id = ?', (story_id,))
            story = cursor.fetchone()
            
            if not story:
                return jsonify({
                    'success': False,
                    'error': 'Story not found'
                }), 404
            
            # For now, create simple template-based questions
            # In Phase 4, we can make this more sophisticated
            questions = []
            
            # Check if questions already exist
            cursor.execute('SELECT COUNT(*) FROM quiz_questions WHERE story_id = ?', (story_id,))
            if cursor.fetchone()[0] == 0:
                # Create sample questions (this will be enhanced in Phase 4)
                sample_questions = [
                    {
                        'question': 'What is this story about?',
                        'options': ['Animals', 'Vehicles', 'Family', 'Food'],
                        'correct_answer': 'Animals',
                        'question_type': 'mcq'
                    }
                ]
                
                for q in sample_questions:
                    cursor.execute('''
                        INSERT INTO quiz_questions 
                        (story_id, question, options, correct_answer, question_type)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (story_id, q['question'], str(q['options']), 
                          q['correct_answer'], q['question_type']))
            
            # Fetch all questions
            cursor.execute('''
                SELECT id, question, options, correct_answer, question_type
                FROM quiz_questions
                WHERE story_id = ?
            ''', (story_id,))
            
            questions = [dict(q) for q in cursor.fetchall()]
            
            # Parse options from string
            for q in questions:
                if q['options']:
                    q['options'] = eval(q['options'])
            
            return jsonify({
                'success': True,
                'questions': questions
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/submit', methods=['POST'])
def submit_quiz():
    """Submit quiz answers and get results"""
    try:
        data = request.json
        story_id = data.get('story_id')
        answers = data.get('answers', {})  # {question_id: answer}
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Get correct answers
            cursor.execute('''
                SELECT id, correct_answer
                FROM quiz_questions
                WHERE story_id = ?
            ''', (story_id,))
            
            correct_answers = {str(row['id']): row['correct_answer'] 
                             for row in cursor.fetchall()}
            
            # Calculate score
            total_questions = len(correct_answers)
            correct_count = sum(1 for qid, ans in answers.items() 
                              if correct_answers.get(qid, '').lower() == ans.lower())
            
            score = (correct_count / total_questions * 100) if total_questions > 0 else 0
            
            # Save progress
            cursor.execute('''
                INSERT INTO user_progress (story_id, activity_type, score)
                VALUES (?, ?, ?)
            ''', (story_id, 'quiz', score))
            
            # Generate encouraging feedback
            if score >= 80:
                feedback = "Amazing work, Omar! You understood the story very well! 🌟"
            elif score >= 60:
                feedback = "Great job! You're learning so much! 👏"
            else:
                feedback = "Good try! Let's read the story again together. 📖"
            
            return jsonify({
                'success': True,
                'score': round(score, 2),
                'correct': correct_count,
                'total': total_questions,
                'feedback': feedback
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
