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
        'llm': ['default', 'tinystories'],
        'tts': ['default', 'edge_tts']  # Edge TTS is free/always available if installed
    }
    
    # Check for keys (loaded in app.py)
    if os.environ.get('GOOGLE_API_KEY'):
        providers['llm'].append('gemini')
        
    if os.environ.get('OPENAI_API_KEY'):
        providers['llm'].append('openai')
        providers['tts'].append('openai')

    if os.environ.get('GROQ_API_KEY'):
        providers['llm'].append('groq')
        
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
            
            api_keys = {
                'google': os.environ.get('GOOGLE_API_KEY', ''),
                'openai': os.environ.get('OPENAI_API_KEY', ''),
                'groq': os.environ.get('GROQ_API_KEY', ''),
                'hf_token': os.environ.get('HF_TOKEN', '') or os.environ.get('HUGGINGFACE_API_KEY', '')
            }
            
            return jsonify({
                'success': True,
                'settings': settings,
                'available_providers': get_available_providers(),
                'api_keys': api_keys
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
                
        # Handle API keys update in .env and os.environ
        api_keys_to_update = {}
        if 'google_api_key' in data: api_keys_to_update['GOOGLE_API_KEY'] = data['google_api_key']
        if 'openai_api_key' in data: api_keys_to_update['OPENAI_API_KEY'] = data['openai_api_key']
        if 'groq_api_key' in data: api_keys_to_update['GROQ_API_KEY'] = data['groq_api_key']
        if 'hf_token' in data: api_keys_to_update['HF_TOKEN'] = data['hf_token']

        if api_keys_to_update:
            # Update os.environ
            for k, v in api_keys_to_update.items():
                if v:
                    os.environ[k] = v
                elif k in os.environ:
                    del os.environ[k] # Clear it if passed empty string

            # Update .env file
            env_path = '.env'
            env_content = ""
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    env_content = f.read()
            
            env_lines = env_content.splitlines()
            env_dict = {}
            for line in env_lines:
                if '=' in line and not line.strip().startswith('#'):
                    k, v = line.split('=', 1)
                    env_dict[k.strip()] = v.strip()
            
            for k, v in api_keys_to_update.items():
                if v:
                    env_dict[k] = f'"{v}"' if not v.startswith('"') else v
                elif k in env_dict:
                    del env_dict[k] # Remove empty keys
            
            with open(env_path, 'w') as f:
                for k, v in env_dict.items():
                    f.write(f'{k}={v}\n')

        return jsonify({
            'success': True,
            'message': 'Settings updated'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
