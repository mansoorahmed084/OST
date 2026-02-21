from flask import Blueprint, jsonify, request
import json
from tinystories_db import get_ts_db_context
from routes.llm import get_tinystories, extract_metadata_and_questions

bp = Blueprint('tinystories', __name__)

@bp.route('/generate', methods=['POST'])
def generate():
    data = request.json or {}
    topic = data.get('topic', 'a friendly dog')

    local_pipe = get_tinystories()
    if not local_pipe:
        return jsonify({"success": False, "error": "TinyStories local model not loaded."}), 500

    prompt = f"Once upon a time, there was a {topic}."
    # Set a high enough max tokens to let the model generate the full story naturally
    max_new_tokens = 400
    try:
        result = local_pipe(prompt, max_new_tokens=max_new_tokens, do_sample=True, temperature=0.7, repetition_penalty=1.1)
        generated_text = result[0]['generated_text']
        content = generated_text.strip()
        title = f"The Story of {topic.title()}"
        
        # Extract metadata via LLM
        metadata = extract_metadata_and_questions(content)
        
        moral = ""
        vocab = []
        mcqs = []
        fill_in_blanks = []
        moral_questions = []

        if metadata:
            moral = metadata.get('moral', '')
            vocab = metadata.get('vocab', [])
            mcqs = metadata.get('mcqs', [])
            fill_in_blanks = metadata.get('fill_in_blanks', [])
            moral_questions = metadata.get('moral_questions', [])

        # Save to DB
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tinystories (title, content, moral, vocab_json, fill_in_blanks_json, mcq_json, moral_questions_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (title, content, moral, json.dumps(vocab), json.dumps(fill_in_blanks), json.dumps(mcqs), json.dumps(moral_questions)))
            story_id = cursor.lastrowid
            
        return jsonify({
            "success": True,
            "story_id": story_id,
            "title": title,
            "content": content
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/', methods=['GET'])
def list_stories():
    try:
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, title, created_at FROM tinystories ORDER BY id DESC')
            stories = [dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "stories": stories})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/<int:story_id>', methods=['GET'])
def get_story(story_id):
    try:
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM tinystories WHERE id = ?', (story_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Story not found"}), 404
            story = dict(row)
             
        # Parse JSONs
        story['vocab'] = json.loads(story['vocab_json']) if story['vocab_json'] else []
        story['fill_in_blanks'] = json.loads(story['fill_in_blanks_json']) if story['fill_in_blanks_json'] else []
        story['mcqs'] = json.loads(story['mcq_json']) if story['mcq_json'] else []
        story['moral_questions'] = json.loads(story['moral_questions_json']) if story['moral_questions_json'] else []
        
        return jsonify({"success": True, "story": story})
    except Exception as e:
         return jsonify({"success": False, "error": str(e)}), 500
