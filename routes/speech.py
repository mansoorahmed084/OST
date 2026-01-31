"""
Speech API Routes
For text-to-speech and speech-to-text functionality
"""

from flask import Blueprint, jsonify, request
import os
from gtts import gTTS
import uuid

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
    communicate = edge_tts.Communicate(text, voice, rate=rate_str)
    await communicate.save(outfile)

def generate_edge_tts(text, voice_preset, outfile, speed):
    # Map presets to Edge voices
    voices = {
        'default': 'en-US-AnaNeural', # Child-friendly default
        'ana': 'en-US-AnaNeural',
        'aria': 'en-US-AriaNeural',
        'guy': 'en-US-GuyNeural'
    }
    voice = voices.get(voice_preset, 'en-US-AnaNeural')
    asyncio.run(_gen_edge(text, voice, outfile, speed))

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
        data = request.json
        text = data.get('text')
        speed = data.get('speed', 1.0)  # 0.5 to 1.5
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400
        
        config = get_tts_config()
        provider = config['provider']
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
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

@bp.route('/story/<int:story_id>', methods=['POST'])
def full_story_audio(story_id):
    """Generate or retrieve audio for the full story"""
    try:
        from routes.stories import get_db_context
        
        # 1. Fetch Story Content
        text_content = ""
        with get_db_context() as conn:
            cursor = conn.cursor()
            # We want to read sentences in order
            cursor.execute('''
                SELECT sentence_text FROM story_sentences 
                WHERE story_id = ? 
                ORDER BY sentence_order
            ''', (story_id,))
            rows = cursor.fetchall()
            if not rows:
                return jsonify({'success': False, 'error': 'Story not found or empty'}), 404
            
            text_content = " ".join([r[0] for r in rows])

        if not text_content:
             return jsonify({'success': False, 'error': 'No text content'}), 400

        # 2. Determine Configuration
        config = get_tts_config()
        provider = config['provider']
        voice = config['voice_preset']
        
        # 3. Check Cache
        # Filename: story_{id}_{provider}_{voice}.mp3
        filename = f"story_{story_id}_{provider}_{voice}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        if os.path.exists(filepath):
            return jsonify({
                'success': True,
                'audio_url': f'/audio/{filename}',
                'message': 'Loaded from cache'
            })
            
        # 4. Generate Audio
        generated = False
        if provider == 'edge_tts':
            try:
                generate_edge_tts(text_content, voice, filepath, 1.0)
                generated = True
            except Exception as e:
                print(f"EdgeTTS Full Story Failed: {e}")
        elif provider == 'openai':
            try:
                if generate_openai_tts(text_content, voice, filepath, 1.0):
                    generated = True
            except Exception as e:
                 print(f"OpenAI Full Story Failed: {e}")
                 
        if not generated:
            # Fallback to gTTS
            tts = gTTS(text=text_content, lang='en', slow=False)
            tts.save(filepath)
            
        return jsonify({
            'success': True,
            'audio_url': f'/audio/{filename}',
            'message': 'Generated new audio'
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
