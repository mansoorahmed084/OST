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

def _chunk_sentence(sentence, chunk_size):
    """Break a sentence into sequential word chunks of approximately chunk_size words.
    The last chunk gets any remaining words so we don't leave 1-2 word orphans."""
    words = sentence.strip().split()
    if len(words) <= chunk_size + 2:
        # Short enough to be one chunk (don't split into tiny leftover)
        return [sentence.strip()]
    
    chunks = []
    i = 0
    while i < len(words):
        remaining = len(words) - i
        if remaining <= chunk_size + 2:
            # Last chunk: take everything remaining to avoid tiny orphan
            chunks.append(' '.join(words[i:]))
            break
        else:
            chunks.append(' '.join(words[i:i+chunk_size]))
            i += chunk_size
    return chunks

def _build_scramble_steps(content, chunk_size):
    """Split story content into sentences, then break each sentence into
    sequential word chunks. Returns a list of dicts with chunk text and
    which sentence it belongs to, preserving story reading order."""
    import re
    raw_sentences = re.split(r'(?<=[.!?])\s+', content.strip())
    sentences = [s.strip() for s in raw_sentences if s.strip() and len(s.strip().split()) >= 2]
    
    steps = []
    for sent_idx, sentence in enumerate(sentences):
        chunks = _chunk_sentence(sentence, chunk_size)
        for chunk_idx, chunk in enumerate(chunks):
            steps.append({
                'text': chunk,
                'sentence_index': sent_idx,
                'chunk_index': chunk_idx,
                'total_chunks_in_sentence': len(chunks),
                'full_sentence': sentence,
                'word_count': len(chunk.split())
            })
    return steps


@bp.route('/scramble/<int:story_id>', methods=['GET'])
def get_scramble_sentences(story_id):
    """Get sentences from a TinyStory for the scramble game.
    Sentences are in story order. Long sentences are broken into chunks.
    ?difficulty=easy|medium|hard controls chunk size."""
    try:
        difficulty = request.args.get('difficulty', 'easy')
        chunk_sizes = {'easy': 4, 'medium': 6, 'hard': 100}  # 100 = full sentence
        chunk_size = chunk_sizes.get(difficulty, 4)
        
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT title, content FROM tinystories WHERE id = ?', (story_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Story not found"}), 404
            
            content = row['content']
            title = row['title']
        
        steps = _build_scramble_steps(content, chunk_size)
        
        return jsonify({
            "success": True,
            "story_title": title,
            "difficulty": difficulty,
            "steps": steps,
            "sentences": [s['text'] for s in steps],  # backward compat
            "total_steps": len(steps)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/scramble/adaptive', methods=['POST'])
def get_adaptive_scramble():
    """Build an adaptive scramble session from a random story.
    Difficulty controls chunk size: easy=3-4 words, medium=5-7, hard=full sentences."""
    try:
        data = request.json or {}
        difficulty = data.get('difficulty', 'easy')
        
        chunk_sizes = {'easy': 4, 'medium': 6, 'hard': 100}
        chunk_size = chunk_sizes.get(difficulty, 4)
        
        with get_ts_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, title, content FROM tinystories ORDER BY RANDOM() LIMIT 1')
            row = cursor.fetchone()
        
        if not row:
            return jsonify({"success": False, "error": "No stories available. Generate some in Read & Learn!"}), 404
        
        story = dict(row)
        steps = _build_scramble_steps(story['content'], chunk_size)
        
        if not steps:
            return jsonify({"success": False, "error": "Story has no usable sentences."})
        
        return jsonify({
            "success": True,
            "difficulty": difficulty,
            "story_title": story['title'],
            "story_id": story['id'],
            "steps": steps,
            "sentences": [s['text'] for s in steps],
            "total_steps": len(steps)
        })
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
