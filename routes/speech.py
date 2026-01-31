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
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # Generate speech
        # Note: gTTS doesn't support speed directly, we'll handle this on frontend
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
