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
            
            # Get story details
            cursor.execute('SELECT title, content, theme, moral FROM stories WHERE id = ?', (story_id,))
            story = cursor.fetchone()
            
            if not story:
                return jsonify({'success': False, 'error': 'Story not found'}), 404
            
            story_dict = dict(story)
            title = story_dict['title']
            theme = story_dict['theme'] or 'General'
            moral = story_dict['moral']
            
            # Check if questions already exist
            cursor.execute('SELECT COUNT(*) FROM quiz_questions WHERE story_id = ?', (story_id,))
            if cursor.fetchone()[0] == 0:
                # === Generate New Questions ===
                generated_questions = []
                
                # 1. Theme Question
                themes = ['Animals', 'Vehicles', 'Family', 'Food', 'Nature', 'Values']
                distractors = [t for t in themes if t.lower() != theme.lower()]
                random.shuffle(distractors)
                
                generated_questions.append({
                    'question': 'What is this story mostly about?',
                    'options': sorted([theme.capitalize()] + distractors[:2]),
                    'correct_answer': theme.capitalize(),
                    'hint': f"Think about the main picture. Is it about {distractors[0]} or {theme}?",
                    'explanation': f"The story is about {theme.capitalize()}!"
                })
                
                # 2. Moral Question (if exists)
                if moral:
                    generic_morals = [
                        "Always run fast.",
                        "Eating candy is good.",
                        "Sleep all day.",
                        "Never share toys.",
                        "Shout loudly."
                    ]
                    # Better positive distractors
                    positive_distractors = [
                        "Always brush your teeth.",
                        "Look both ways before crossing.",
                        "Vegetables make you strong.",
                        "Read books every day."
                    ] 
                    # Filter out similar valid morals to avoid confusion? 
                    # For simplicity, mix random specific wrong ones or irrelevant positive ones.
                    distractors = random.sample(positive_distractors, 2)
                    
                    options = [moral] + distractors
                    random.shuffle(options)
                    
                    generated_questions.append({
                        'question': 'What is the lesson of the story?',
                        'options': options,
                        'correct_answer': moral,
                        'hint': "It teaches us how to be good.",
                        'explanation': f"Yes! The lesson is: {moral}"
                    })
                
                # 3. Title/Content Question
                generated_questions.append({
                    'question': "What is the name of the story?",
                    'options': [title, f"The Sad {theme.capitalize()}", f"A Big {theme.capitalize()}"], # Simple fake titles
                    'correct_answer': title,
                    'hint': "Look at the top of the story page.",
                    'explanation': f"Correct! The story is named '{title}'."
                })
                
                # Save generated questions
                for q in generated_questions:
                    # Shuffle options one last time to be sure
                    opts = q['options']
                    random.shuffle(opts)
                    
                    cursor.execute('''
                        INSERT INTO quiz_questions 
                        (story_id, question, options, correct_answer, question_type, hint, explanation)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (story_id, q['question'], str(opts), 
                          q['correct_answer'], 'mcq', q.get('hint', ''), q.get('explanation', '')))
            
            # Fetch questions from DB
            cursor.execute('''
                SELECT id, question, options, correct_answer, question_type, hint, explanation
                FROM quiz_questions
                WHERE story_id = ?
            ''', (story_id,))
            
            questions = [dict(q) for q in cursor.fetchall()]
            
            # Parse options
            for q in questions:
                if q['options']:
                    try:
                        q['options'] = eval(q['options'])
                    except:
                        q['options'] = []
            
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
    """Submit quiz progress"""
    try:
        data = request.json
        story_id = data.get('story_id')
        score = data.get('score', 0)
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Save progress
            cursor.execute('''
                INSERT INTO user_progress (story_id, activity_type, score)
                VALUES (?, ?, ?)
            ''', (story_id, 'quiz', score))
            
            return jsonify({
                'success': True,
                'message': 'Progress saved!'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
