from flask import Blueprint, jsonify, request
from database import get_db_context
import random
import json
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('quiz', __name__)


def _generate_ai_questions(story_dict):
    """
    Use the LLM to generate rich, story-specific quiz questions.
    Returns a list of question dicts or an empty list on failure.
    """
    from routes.llm import get_llm_provider, generate_with_gemini, generate_with_openai, generate_with_groq
    import os

    title = story_dict.get('title', 'this story')
    content = story_dict.get('content', '')
    moral = story_dict.get('moral', '')
    theme = story_dict.get('theme', 'General')

    system_prompt = f"""
You are a fun quiz maker for young children (ages 4-8). 
Read the story below and create EXACTLY 5 multiple-choice questions.

RULES:
- Questions must be directly about events, characters or words in THIS story.
- Each question has exactly 4 answer choices.
- One choice is clearly correct.
- The other 3 choices are plausible but wrong.
- Language must be very simple (short words, short sentences).
- Include 1 question about the story title or main character.
- Include 1 question about the moral/lesson IF there is one.
- Make it fun and encouraging!

Output ONLY valid JSON, no extra text:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correct_answer": "Choice A",
      "hint": "Think about the beginning of the story.",
      "explanation": "Yes! The answer is Choice A because..."
    }}
  ]
}}

Story Title: {title}
Theme: {theme}
Moral: {moral}
Story:
{content[:1500]}
"""
    user_prompt = f"Generate 5 quiz questions for the story '{title}'."

    # Try all available providers
    providers_to_try = []
    import os
    if os.environ.get('GOOGLE_API_KEY'):
        providers_to_try.append('gemini')
    if os.environ.get('OPENAI_API_KEY'):
        providers_to_try.append('openai')
    if os.environ.get('GROQ_API_KEY'):
        providers_to_try.append('groq')

    for provider in providers_to_try:
        try:
            response_text = None
            if provider == 'gemini':
                response_text = generate_with_gemini(system_prompt, user_prompt, os.environ['GOOGLE_API_KEY'])
            elif provider == 'openai':
                response_text = generate_with_openai(system_prompt, user_prompt, os.environ['OPENAI_API_KEY'])
            elif provider == 'groq':
                response_text = generate_with_groq(system_prompt, user_prompt, os.environ['GROQ_API_KEY'])

            if response_text:
                clean = response_text.strip()
                start = clean.find('{')
                end = clean.rfind('}')
                if start != -1 and end != -1:
                    data = json.loads(clean[start:end + 1])
                    questions = data.get('questions', [])
                    if questions:
                        logger.info(f"AI quiz generated {len(questions)} questions via {provider}")
                        return questions
        except Exception as e:
            logger.warning(f"AI quiz generation failed with {provider}: {e}")

    return []


def _build_template_questions(story_dict):
    """Fallback: generate simple template-based questions."""
    title = story_dict.get('title', 'this story')
    theme = story_dict.get('theme', 'General') or 'General'
    moral = story_dict.get('moral', '')

    questions = []

    # 1. Theme question
    themes = ['Animals', 'Vehicles', 'Family', 'Food', 'Nature', 'Values', 'Adventure', 'School']
    distractors = [t for t in themes if t.lower() != theme.lower()]
    random.shuffle(distractors)
    questions.append({
        'question': f'What is the story "{title}" mostly about?',
        'options': sorted([theme.capitalize()] + distractors[:3]),
        'correct_answer': theme.capitalize(),
        'hint': f'Think about the main things that happen in the story.',
        'explanation': f'The story is about {theme.capitalize()}!'
    })

    # 2. Moral question (if exists)
    if moral:
        positive_distractors = [
            "Always brush your teeth.",
            "Look both ways before crossing.",
            "Vegetables make you strong.",
            "Read books every day.",
            "Always listen to music.",
            "Running is the fastest way to travel."
        ]
        wrong_opts = random.sample(positive_distractors, 3)
        options = [moral] + wrong_opts
        random.shuffle(options)
        questions.append({
            'question': 'What is the lesson of the story?',
            'options': options,
            'correct_answer': moral,
            'hint': 'It teaches us how to be good.',
            'explanation': f'Yes! The lesson is: {moral}'
        })

    # 3. Title question
    fake_titles = [
        "The Magic Castle Adventure",
        "A Day at the Ocean",
        "The Lost Robot",
        "Flying Through Clouds"
    ]
    title_opts = [title] + random.sample(fake_titles, 3)
    random.shuffle(title_opts)
    questions.append({
        'question': 'What is the name of this story?',
        'options': title_opts,
        'correct_answer': title,
        'hint': 'Look at the top of the page!',
        'explanation': f'The story is called "{title}"!'
    })

    return questions


@bp.route('/generate/<int:story_id>', methods=['POST'])
def generate_quiz(story_id):
    """Generate quiz questions from a story. If regenerate=true in body, force re-generation."""
    try:
        body = request.get_json(silent=True) or {}
        force_regenerate = body.get('regenerate', False)

        with get_db_context() as conn:
            cursor = conn.cursor()

            # Get story details
            cursor.execute('SELECT id, title, content, theme, moral FROM stories WHERE id = ?', (story_id,))
            story = cursor.fetchone()

            if not story:
                return jsonify({'success': False, 'error': 'Story not found'}), 404

            story_dict = dict(story)

            # If force regenerate, delete old questions
            if force_regenerate:
                cursor.execute('DELETE FROM quiz_questions WHERE story_id = ?', (story_id,))
                logger.info(f"Deleted old quiz questions for story {story_id} (force regenerate)")

            # Check if questions already exist
            cursor.execute('SELECT COUNT(*) FROM quiz_questions WHERE story_id = ?', (story_id,))
            existing_count = cursor.fetchone()[0]

            if existing_count == 0:
                # === Generate New Questions ===
                generated_questions = []

                # Try AI generation first
                try:
                    ai_questions = _generate_ai_questions(story_dict)
                    for q in ai_questions:
                        generated_questions.append({
                            'question': q.get('question', ''),
                            'options': q.get('options', []),
                            'correct_answer': q.get('correct_answer', ''),
                            'hint': q.get('hint', 'Think carefully!'),
                            'explanation': q.get('explanation', 'Great job! 🌟')
                        })
                except Exception as e:
                    logger.warning(f"AI quiz generation error: {e}")

                # Pad with templates if AI didn't provide enough
                if len(generated_questions) < 3:
                    template_qs = _build_template_questions(story_dict)
                    # Only add template questions not already covered
                    generated_questions.extend(template_qs)

                # Save generated questions to DB
                for q in generated_questions:
                    opts = q.get('options', [])
                    if isinstance(opts, list):
                        random.shuffle(opts)
                    cursor.execute('''
                        INSERT INTO quiz_questions
                        (story_id, question, options, correct_answer, question_type, hint, explanation)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (story_id, q['question'], json.dumps(opts),
                          q['correct_answer'], 'mcq',
                          q.get('hint', ''), q.get('explanation', '')))

                logger.info(f"Saved {len(generated_questions)} quiz questions for story {story_id}")

            # Fetch questions from DB
            cursor.execute('''
                SELECT id, question, options, correct_answer, question_type, hint, explanation
                FROM quiz_questions
                WHERE story_id = ?
            ''', (story_id,))

            questions = [dict(q) for q in cursor.fetchall()]

            # Parse options (stored as JSON string)
            for q in questions:
                if q['options']:
                    try:
                        q['options'] = json.loads(q['options'])
                    except Exception:
                        try:
                            q['options'] = eval(q['options'])  # backward compat
                        except Exception:
                            q['options'] = []

            return jsonify({'success': True, 'questions': questions})

    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/attempt', methods=['POST'])
def record_attempt():
    """Record an individual question attempt (correct or retry)"""
    try:
        data = request.json
        story_id = data.get('story_id')
        question_id = data.get('question_id')
        attempt_number = data.get('attempt_number', 1)
        is_correct = data.get('is_correct', False)

        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO quiz_attempts (story_id, question_id, attempt_number, is_correct)
                VALUES (?, ?, ?, ?)
            ''', (story_id, question_id, attempt_number, is_correct))

            return jsonify({'success': True, 'message': 'Attempt recorded!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/submit', methods=['POST'])
def submit_quiz():
    """Submit aggregate quiz progress for a session"""
    try:
        data = request.json
        story_id = data.get('story_id')
        score = data.get('score', 0) # Percentage or aggregate
        points_earned = data.get('points_earned', 0)
        points_possible = data.get('points_possible', 0)
        duration = data.get('duration_sec', 0)
        activity_type = data.get('activity_type', 'quiz')
        details = data.get('details')

        details_str = None
        if details:
            details_str = json.dumps(details)

        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO user_progress 
                (story_id, activity_type, score, points_earned, points_possible, session_duration_sec, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (story_id, activity_type, score, points_earned, points_possible, duration, details_str))

            return jsonify({'success': True, 'message': 'Progress saved!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
