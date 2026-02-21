from flask import Blueprint, jsonify, request
import json
import threading
import os
import random
from tinystories_db import get_ts_db_context
from routes.llm import get_tinystories, extract_metadata_and_questions
from routes.generator import RANDOM_TOPICS
from routes.images import generate_image_hf, IMAGE_DIR
from routes.speech import generate_audio_file

bp = Blueprint('tinystories', __name__)

@bp.route('/generate', methods=['POST'])
def generate():
    data = request.json or {}
    topic = data.get('topic', 'a friendly dog')
    speed = float(data.get('speed', 0.8))
    
    if not topic or topic.lower() == 'random':
        topic = random.choice(RANDOM_TOPICS)

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
        metadata = extract_metadata_and_questions(content, provider='tinystories')
        
        moral = ""
        vocab = []
        mcqs = []
        fill_in_blanks = []
        moral_questions = []

        if metadata:
            content = metadata.get('corrected_story', content)
            moral = metadata.get('moral', '')
            vocab = metadata.get('vocab', [])
            mcqs = metadata.get('mcqs', [])
            fill_in_blanks = metadata.get('fill_in_blanks', [])
            moral_questions = metadata.get('moral_questions', [])

        # Save to DB
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tinystories (title, content, moral, vocab_json, fill_in_blanks_json, mcq_json, moral_questions_json, audio_speed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (title, content, moral, json.dumps(vocab), json.dumps(fill_in_blanks), json.dumps(mcqs), json.dumps(moral_questions), speed))
            story_id = cursor.lastrowid

            # Update vocabulary progress
            if vocab:
                for v in vocab:
                    word = v.get('word', '').lower().strip()
                    meaning = v.get('meaning', '')
                    if word:
                        cursor.execute('''
                            INSERT INTO vocabulary_progress (word, meaning, last_seen, occurrence_count)
                            VALUES (?, ?, CURRENT_TIMESTAMP, 1)
                            ON CONFLICT(word) DO UPDATE SET
                                last_seen = CURRENT_TIMESTAMP,
                                occurrence_count = occurrence_count + 1
                        ''', (word, meaning))

        # Audio and image generation should only be triggered if metadata (correction) succeeded
        if metadata:
            def background_assets(sid, t, c, spd):
                # Image
                try:
                    filename = f"tinystory_{sid}.png"
                    filepath = os.path.join(IMAGE_DIR, filename)
                    prompt = f"Children's story book illustration about: {t}. Beautiful watercolor, simple, bright. Context: {c[:200]}"
                    if generate_image_hf(prompt, filepath):
                        public_url = f"/images/stories/{filename}"
                        with get_ts_db_context() as conn:
                            conn.execute("UPDATE tinystories SET image_url = ? WHERE id = ?", (public_url, sid))
                except Exception as e:
                    print(f"TS Image Gen Failed: {e}")
                    
                # Audio
                try:
                    # Use a unique prefix to avoid ID collisions in global audio cache
                    success, result = generate_audio_file(f"ts_story_{sid}", c, speed=spd, language='en')
                    if success:
                        with get_ts_db_context() as conn:
                            conn.execute("UPDATE tinystories SET audio_url = ? WHERE id = ?", (result, sid))
                except Exception as e:
                    print(f"TS Audio Gen Failed: {e}")
            
            threading.Thread(target=background_assets, args=(story_id, topic, content, speed)).start()
            
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
            cursor.execute('SELECT id, title, image_url, created_at FROM tinystories ORDER BY id DESC')
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

@bp.route('/assets/<int:story_id>', methods=['POST'])
def generate_assets(story_id):
    try:
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT title, content, audio_speed FROM tinystories WHERE id = ?', (story_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Story not found"}), 404
            
            title = row['title']
            content = row['content']
            speed = row['audio_speed'] or 0.8
            
        def background_assets(sid, t, c, spd):
            # Image
            try:
                filename = f"tinystory_{sid}.png"
                filepath = os.path.join(IMAGE_DIR, filename)
                prompt = f"Children's story book illustration about: {t}. Beautiful watercolor, simple, bright. Context: {c[:200]}"
                if generate_image_hf(prompt, filepath):
                    public_url = f"/images/stories/{filename}"
                    with get_ts_db_context() as conn:
                        conn.execute("UPDATE tinystories SET image_url = ? WHERE id = ?", (public_url, sid))
            except Exception as e:
                print(f"TS Image Gen Failed: {e}")
                
            # Audio
            try:
                success, result = generate_audio_file(f"ts_story_{sid}", c, speed=spd, language='en')
                if success:
                    with get_ts_db_context() as conn:
                        conn.execute("UPDATE tinystories SET audio_url = ? WHERE id = ?", (result, sid))
            except Exception as e:
                print(f"TS Audio Gen Failed: {e}")
        
        threading.Thread(target=background_assets, args=(story_id, title, content, speed)).start()
        return jsonify({"success": True, "message": "Asset generation started in background."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/vocabulary', methods=['GET'])
def list_vocabulary():
    try:
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM vocabulary_progress ORDER BY last_seen DESC')
            vocab = [dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "vocabulary": vocab})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/vocabulary/status', methods=['POST'])
def update_vocab_status():
    data = request.json or {}
    word = data.get('word', '').lower().strip()
    status = data.get('status', 'learning') # learning, mastered
    
    if not word:
        return jsonify({"success": False, "error": "Word is required"}), 400
        
    try:
        with get_ts_db_context() as conn:
            conn.execute('UPDATE vocabulary_progress SET status = ? WHERE word = ?', (status, word))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
