"""
Settings API Routes
Manage application settings and provider configuration
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import os

bp = Blueprint('settings', __name__)

def get_available_providers():
    """Check environment for available API keys"""
    providers = {
        'llm': ['default'],
        'tts': ['default', 'edge_tts']  # Edge TTS is free/always available if installed
    }
    
    # Check for keys (loaded in app.py)
    if os.environ.get('GOOGLE_API_KEY'):
        providers['llm'].append('gemini')
        
    if os.environ.get('OPENAI_API_KEY'):
        providers['llm'].append('openai')
        providers['tts'].append('openai')
        
    if os.environ.get('ELEVENLABS_API_KEY'):
        providers['tts'].append('elevenlabs')
        
    return providers

@bp.route('', methods=['GET'])
def get_settings():
    """Get current settings and available providers"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT key, value FROM settings')
            rows = cursor.fetchall()
            
            settings = {row['key']: row['value'] for row in rows}
            
            return jsonify({
                'success': True,
                'settings': settings,
                'available_providers': get_available_providers()
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('', methods=['POST'])
def update_settings():
    """Update settings"""
    try:
        data = request.json
        updates = []
        
        # Whitelist keys to prevent garbage
        allowed_keys = ['llm_provider', 'tts_provider', 'voice_preset', 'story_tone', 'reader_layout']
        
        for key in allowed_keys:
            if key in data:
                updates.append((data[key], key))
        
        if updates:
            with get_db_context() as conn:
                cursor = conn.cursor()
                cursor.executemany('INSERT OR REPLACE INTO settings (value, key) VALUES (?, ?)', updates)
                
        return jsonify({
            'success': True,
            'message': 'Settings updated'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
