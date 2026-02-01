"""
Speech API Routes
For text-to-speech and speech-to-text functionality
"""

from flask import Blueprint, jsonify, request
import os
from gtts import gTTS
import uuid
import hashlib

bp = Blueprint('speech', __name__)

# Create audio directory if it doesn't exist
AUDIO_DIR = 'static/audio'
os.makedirs(AUDIO_DIR, exist_ok=True)

import asyncio
import edge_tts
from database import get_db_context

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

def get_tts_config():
    """Get TTS configuration from settings"""
    try:
        config = {'provider': 'default', 'voice_preset': 'default'}
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings WHERE key IN ('tts_provider', 'voice_preset')")
            rows = cursor.fetchall()
            for key, value in rows:
                if key == 'tts_provider': config['provider'] = value
                if key == 'voice_preset': config['voice_preset'] = value
        return config
    except:
        return {'provider': 'default', 'voice_preset': 'default'}

async def _gen_edge(text, voice, outfile, rate):
    # Edge TTS voices: en-US-AnaNeural (Child), en-US-AriaNeural (Female), en-US-GuyNeural (Male)
    # Rate string: "+0%" or "-10%"
    rate_str = f"{int((rate - 1.0) * 100):+d}%"
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate_str)
        await communicate.save(outfile)
    except Exception as e:
        print(f"EdgeTTS Async Error: {e}")
        raise

def generate_edge_tts(text, voice_preset, outfile, speed, is_raw_voice=False):
    # Map presets to Edge voices
    voices = {
        'default': 'en-US-AnaNeural', # Child-friendly default
        'ana': 'en-US-AnaNeural',
        'aria': 'en-US-AriaNeural',
        'guy': 'en-US-GuyNeural'
    }
    
    if is_raw_voice:
        voice = voice_preset
    else:
        voice = voices.get(voice_preset, 'en-US-AnaNeural')
    
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            # If loop is already running, run in a separate thread
            import threading
            def run_in_thread():
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                new_loop.run_until_complete(_gen_edge(text, voice, outfile, speed))
                new_loop.close()
            
            t = threading.Thread(target=run_in_thread)
            t.start()
            t.join()
        else:
             loop.run_until_complete(_gen_edge(text, voice, outfile, speed))
    except Exception as e:
        print(f"EdgeTTS Execution Failed: {e}")
        raise

def generate_openai_tts(text, voice_preset, outfile, speed):
    if not OpenAI: return False
    
    # Map presets to OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    # Nova is very good for stories
    voices = {
        'default': 'nova',
        'ana': 'nova',
        'aria': 'shimmer',
        'guy': 'fable' # Deep male
    }
    voice = voices.get(voice_preset, 'nova')
    
    key = os.environ.get('OPENAI_API_KEY')
    if not key: return False
    
    client = OpenAI(api_key=key)
    response = client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
        speed=speed
    )
    response.stream_to_file(outfile)
    return True

@bp.route('/tts', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio file path"""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get('text')
        speed = float(data.get('speed', 1.0))  # 0.5 to 1.5
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400
        
        config = get_tts_config()
        provider = config['provider']
        voice = config['voice_preset']
        
        # Generate hash-based filename for caching
        # Filename: tts_{hash}.mp3
        input_str = f"{provider}_{voice}_{speed}_{text}"
        file_hash = hashlib.md5(input_str.encode('utf-8')).hexdigest()
        filename = f"tts_{file_hash}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)

        if os.path.exists(filepath):
            return jsonify({
                'success': True,
                'audio_url': f'/audio/{filename}',
                'message': 'Audio from cache'
            })
        
        generated = False
        
        if provider == 'edge_tts':
            try:
                generate_edge_tts(text, config['voice_preset'], filepath, speed)
                generated = True
            except Exception as e:
                print(f"EdgeTTS failed: {e}")
                
        elif provider == 'openai':
            try:
                if generate_openai_tts(text, config['voice_preset'], filepath, speed):
                    generated = True
            except Exception as e:
                print(f"OpenAI TTS failed: {e}")
        
        # Fallback to gTTS
        if not generated:
            # gTTS logic
            tts = gTTS(text=text, lang='en', slow=(speed < 0.8))
            tts.save(filepath)
        
        return jsonify({
            'success': True,
            'audio_url': f'/audio/{filename}',
            'message': 'Audio generated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generate_audio_file(story_id, text_content, speed=1.0, language='en'):
    """
    Core function to generate audio file for a story.
    Returns: (success, result_path_or_error)
    """
    print(f"DEBUG: generate_audio_file called for Story {story_id}, Speed {speed}, Lang {language}")
    try:
        config = get_tts_config()
        provider = config['provider']
        voice = config['voice_preset']
        
        # Override voice for non-English languages
        if language != 'en':
            # Language mappings for EdgeTTS
            lang_voices = {
                'hi': 'hi-IN-SwaraNeural',
                'es': 'es-ES-ElviraNeural', 
                'fr': 'fr-FR-DeniseNeural',
                'de': 'de-DE-KatjaNeural'
            }
            voice = lang_voices.get(language, 'en-US-AnaNeural')
        
        print(f"DEBUG: Config - Provider: {provider}, Voice: {voice}")
        
        # Filename: story_{id}_{lang}_{provider}_{voice}_{speed}.mp3
        # Normalize speed in filename to avoid float issues
        speed_str = str(speed).replace('.', '_')
        filename = f"story_{story_id}_{language}_{provider}_{voice}_{speed_str}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        print(f"DEBUG: Target filepath: {filepath}")
        
        if os.path.exists(filepath):
            print("DEBUG: File exists in cache")
            return True, f'/audio/{filename}'
            
        generated = False
        if provider == 'edge_tts':
            print("DEBUG: Attempting EdgeTTS...")
            try:
                # Direct call to generate_edge_tts which does the threading/loop
                # We need to bypass the 'preset' mapping if we are using a raw voice string
                # So we update generate_edge_tts to handle raw voice strings too
                generate_edge_tts(text_content, voice, filepath, speed, is_raw_voice=(language!='en'))
                generated = True
                print("DEBUG: EdgeTTS Success")
            except Exception as e:
                print(f"DEBUG: EdgeTTS Failed: {e}")
                import traceback
                traceback.print_exc()

        elif provider == 'openai':
            # OpenAI has limited language voices (models are multilingual but voices are same)
            # We just use the same voice instructions, OpenAI handles accent auto-magically
            print("DEBUG: Attempting OpenAI TTS...")
            try:
                if generate_openai_tts(text_content, voice, filepath, speed):
                    generated = True
                    print("DEBUG: OpenAI TTS Success")
            except Exception as e:
                 print(f"DEBUG: OpenAI Failed: {e}")
                 
        if not generated:
            print("DEBUG: Attempting Fallback to gTTS...")
            try:
                # Fallback to gTTS
                tts = gTTS(text=text_content, lang=language, slow=(speed < 0.8))
                tts.save(filepath)
                print("DEBUG: gTTS Success")
            except Exception as e:
                print(f"DEBUG: gTTS Failed: {e}")
                raise e
        
        # ADDED: Prepend Silence (100ms) only for English usually, but good for all
        try:
            from pydub import AudioSegment
            print("DEBUG: Adding silence padding...")
            audio_segment = AudioSegment.from_file(filepath)
            silence = AudioSegment.silent(duration=100) # Reduced to 100ms
            final_audio = silence + audio_segment
            final_audio.export(filepath, format="mp3")
            print("DEBUG: Silence added successfully")
        except ImportError:
             print("DEBUG: pydub not installed, skipping silence padding")
        except Exception as e:
            print(f"DEBUG: Error adding silence: {e}")
            # Non-critical, continue
            
        return True, f'/audio/{filename}'
    except Exception as e:
        print(f"CRITICAL: generate_audio_file failed: {e}")
        import traceback
        traceback.print_exc()
        return False, str(e)

@bp.route('/story/<int:story_id>', methods=['POST'])
def full_story_audio(story_id):
    """Generate or retrieve audio for the full story"""
    print(f"DEBUG: full_story_audio Request for {story_id}")
    try:
        # Use get_json(silent=True) to avoid 415 Unsupported Media Type if headers are missing
        data = request.get_json(silent=True) or {}
        speed = float(data.get('speed', 1.0))
        language = data.get('language', 'en')
        print(f"DEBUG: Speed parsed: {speed}, Language: {language}")
        
        # 1. Fetch Story Content
        print("DEBUG: Fetching story content...")
        text_content = ""
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            if language != 'en':
                # Fetch translated text
                # We need to check if we have translated text in story_sentences
                cursor.execute('''
                    SELECT translated_text FROM story_sentences 
                    WHERE story_id = ? 
                    ORDER BY sentence_order
                ''', (story_id,))
                rows = cursor.fetchall()
                # If rows are empty or all none, fallback? 
                # Assuming valid bilingual story has translations
                parts = [r[0] for r in rows if r[0]]
                if not parts:
                    # Fallback to English if translation missing (failsafe)
                    print("DEBUG: No translation text found, falling back to English")
                    cursor.execute('''
                        SELECT sentence_text FROM story_sentences 
                        WHERE story_id = ? 
                        ORDER BY sentence_order
                    ''', (story_id,))
                    rows = cursor.fetchall()
                    parts = [r[0] for r in rows]
                else:
                    print(f"DEBUG: Found {len(parts)} translated sentences")
                    
                text_content = " ".join(parts)
            else:
                # Fetch English text
                cursor.execute('''
                    SELECT sentence_text FROM story_sentences 
                    WHERE story_id = ? 
                    ORDER BY sentence_order
                ''', (story_id,))
                rows = cursor.fetchall()
                print(f"DEBUG: Found {len(rows)} sentences")
                text_content = " ".join([r[0] for r in rows])

        if not text_content:
             return jsonify({'success': False, 'error': 'No text content'}), 400

        print(f"DEBUG: Story content length: {len(text_content)}")

        # Call the core function
        print("DEBUG: Calling generate_audio_file...")
        success, result = generate_audio_file(story_id, text_content, speed, language)
        print(f"DEBUG: generate_audio_file returned: {success}, {result}")
        
        if success:
            return jsonify({
                'success': True,
                'audio_url': result,
                'message': 'Audio ready'
            })
        else:
            return jsonify({'success': False, 'error': result}), 500

    except Exception as e:
        print(f"CRITICAL: full_story_audio crashed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def pregenerate_sentence_audio(story_id, speed=1.0):
    """
    Pre-generate audio segments for each sentence in the story.
    This runs after story generation to ensure low-latency playback.
    """
    print(f"DEBUG: Pre-generating audio segments for Story {story_id}")
    try:
        from database import get_db_context
        config = get_tts_config()
        provider = config['provider']
        voice = config['voice_preset']
        
        sentences_data = []
        target_language = 'en'
        
        with get_db_context() as conn:
            cursor = conn.cursor()
            # Get target language
            cursor.execute('SELECT target_language FROM stories WHERE id = ?', (story_id,))
            row = cursor.fetchone()
            if row:
                target_language = row[0]
            
            # Get sentences
            cursor.execute('SELECT sentence_text, translated_text FROM story_sentences WHERE story_id = ? ORDER BY sentence_order', (story_id,))
            sentences_data = cursor.fetchall()
            
        print(f"DEBUG: Found {len(sentences_data)} sentences to pre-generate. Target Land: {target_language}")
            
        for row in sentences_data:
            eng_text = row[0]
            trans_text = row[1]
            
            # 1. Generate English
            if eng_text and eng_text.strip():
                 _generate_segment(eng_text, 'en', provider, voice, speed)
                 
            # 2. Generate Translation (if exists)
            if trans_text and trans_text.strip() and target_language != 'en':
                 # Determine voice for language
                 lang_voice = voice
                 if target_language == 'hi': lang_voice = 'hi-IN-SwaraNeural'
                 elif target_language == 'es': lang_voice = 'es-ES-ElviraNeural'
                 elif target_language == 'fr': lang_voice = 'fr-FR-DeniseNeural'
                 
                 # Force use of specific voice instead of preset
                 _generate_segment(trans_text, target_language, provider, lang_voice, speed, is_raw_voice=True)

    except Exception as e:
        print(f"Error in pregenerate_sentence_audio: {e}")

def _generate_segment(text, lang, provider, voice, speed, is_raw_voice=False):
    """Helper to generate segment"""
    try:
        # Generate hash-based filename
        # Note: If is_raw_voice is True, 'voice' arg is the actual voice string, not preset name
        # But text_to_speech usually uses preset name for hash?
        # IMPORTANT: To match text_to_speech caching behavior, we need to be careful.
        # However, text_to_speech endpoint currently only supports English config based on `get_tts_config`.
        # If we want to support clicking on Hindi sentences, we'll need to update text_to_speech endpoint too.
        # For now, let's just generate the file.
        
        # We'll stick to the standard naming: provider_voice_speed_text
        input_str = f"{provider}_{voice}_{speed}_{text}"
        file_hash = hashlib.md5(input_str.encode('utf-8')).hexdigest()
        filename = f"tts_{file_hash}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)

        if os.path.exists(filepath):
            return

        if provider == 'edge_tts':
             generate_edge_tts(text, voice, filepath, speed, is_raw_voice=is_raw_voice)
        elif provider == 'openai':
             generate_openai_tts(text, voice, filepath, speed)
        
        if not os.path.exists(filepath):
             tts = gTTS(text=text, lang=lang, slow=(speed < 0.8))
             tts.save(filepath)
    except Exception as e:
        print(f"Segment Gen Error ({lang}): {e}")

                     
        print(f"DEBUG: Pre-generation complete for {len(sentences)} sentences")
    except Exception as e:
        print(f"Error in pregenerate_sentence_audio: {e}")



@bp.route('/evaluate', methods=['POST'])
def evaluate_speech():
    """
    Evaluate user's speech attempt
    This is a gentle evaluation for practice mode
    """
    try:
        data = request.json
        expected_text = data.get('expected_text', '').lower().strip()
        spoken_text = data.get('spoken_text', '').lower().strip()
        
        if not expected_text or not spoken_text:
            return jsonify({
                'success': False,
                'error': 'Both expected and spoken text are required'
            }), 400
        
        # Simple word-based comparison
        expected_words = expected_text.split()
        spoken_words = spoken_text.split()
        
        # Calculate similarity
        correct_words = sum(1 for w in spoken_words if w in expected_words)
        total_words = len(expected_words)
        accuracy = (correct_words / total_words * 100) if total_words > 0 else 0
        
        # Generate encouraging feedback
        if accuracy >= 90:
            feedback = "Excellent! You spoke very well! 🌟"
            encouragement = "You are doing great, Omar!"
        elif accuracy >= 70:
            feedback = "Very good! You are learning fast! 👍"
            encouragement = "Keep practicing, you're doing wonderful!"
        elif accuracy >= 50:
            feedback = "Good try! Let's practice a bit more. 😊"
            encouragement = "You're getting better! Try again slowly."
        else:
            feedback = "That's okay! Let's try together slowly. 💙"
            encouragement = "Take your time. You can do it!"
        
        # Find words that need practice
        missing_words = [w for w in expected_words if w not in spoken_words]
        
        return jsonify({
            'success': True,
            'accuracy': round(accuracy, 2),
            'feedback': feedback,
            'encouragement': encouragement,
            'words_to_practice': missing_words[:3],  # Top 3 words to focus on
            'expected_text': expected_text,
            'spoken_text': spoken_text
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
