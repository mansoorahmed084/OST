
import os
import requests
import json
import base64
from flask import Blueprint, jsonify, request
from database import get_db_context
from routes.llm import get_llm_provider

bp = Blueprint('images', __name__, url_prefix='/api/images')

IMAGE_DIR = os.path.join('static', 'images', 'stories')
os.makedirs(IMAGE_DIR, exist_ok=True)

def generate_image_google(prompt, output_path):
    """
    Generate image using Google Imagen (via REST API if SDK fails or updated SDK)
    Actually, standard Gemini API doesn't do text-to-image easily without Vertex.
    However, assuming the user might have access or we try the new `google-genai` if installed.
    
    Fallback: If Google fails, use OpenAI if available.
    """
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise Exception("Google API Key missing")

    # Try new google-genai SDK for Imagen 3 if available
    # Or HTTP request to generativelanguage.googleapis.com
    # Note: Text-to-Image in Gemini API is technically via 'imagen-3.0-generate-001'
    
    # Implementation using Requests to avoid SDK confusion
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key={api_key}"
    
    # Construct payload
    # Note: This is an educated guess on the REST schema for public Gemini API image gen
    # Data is often: {"instances": [{"prompt": ...}]}
    
    headers = {'Content-Type': 'application/json'}
    data = {
        "instances": [
            {"prompt": f"Cartoon style, children's book illustration: {prompt}"}
        ],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "4:3" # or "1:1"
        }
    }
    
    # NOTE: The public API for Imagen might not be enabled for all keys. 
    # If this fails, we will fallback to OpenAI.
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        # Parse result - usually base64
        # Schema varies, let's look for bytesBase64Encoded
        try:
            b64_data = result['predictions'][0]['bytesBase64Encoded']
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(b64_data))
            return True
        except:
             print(f"Google Image Gen Response Parse Error: {result}")
             raise Exception("Failed to parse Google Image response")
    else:
        print(f"Google Image Gen Failed: {response.text}")
        raise Exception(f"Google Image API Error: {response.status_code}")

def generate_image_openai(prompt, output_path):
    from openai import OpenAI
    client = OpenAI() # Uses env var
    
    response = client.images.generate(
        model="dall-e-3",
        prompt=f"Children's story book illustration, gentle, colorful, simple: {prompt}",
        size="1024x1024",
        quality="standard",
        n=1,
    )
    
    image_url = response.data[0].url
    # Download
    img_data = requests.get(image_url).content
    with open(output_path, 'wb') as f:
        f.write(img_data)
    return True


def generate_and_save_image(story_id, prompt):
    """
    Standalone function to generate and save image for a story.
    Returns: (success, result_url_or_error)
    """
    try:
        filename = f"story_{story_id}.png"
        filepath = os.path.join(IMAGE_DIR, filename)
        # Fix: app is served with static_url_path='', so URL excludes '/static'
        public_url = f"/images/stories/{filename}"
        
        # Check cache
        if os.path.exists(filepath):
             return True, public_url
        
        # Priority: Check if OpenAI is available (more reliable for images currently)
        # Google Imagen is often gated.
        from openai import OpenAI
        openai_key = os.environ.get('OPENAI_API_KEY')
        
        success = False
        
        # 1. Try OpenAI DALL-E 3 first if key exists (Higher quality/reliability currently)
        if openai_key and 'sk-' in openai_key:
             try:
                 print(f"Attempting OpenAI Image Gen for Story {story_id}...")
                 generate_image_openai(prompt, filepath)
                 success = True
             except Exception as e:
                 print(f"OpenAI Failed: {e}")
                 
        # 2. If OpenAI failed or no key, try Google Imagen
        if not success:
             try:
                 print(f"Attempting Google Imagen for Story {story_id}...")
                 generate_image_google(prompt, filepath)
                 success = True
             except Exception as e:
                 print(f"Google Imagen Failed: {e}")
                 
        if success:
            # Update DB (Connection logic needs to be careful in threads, use new connection)
            # Since this might run in a thread, we must ensure DB safety. 
            # SQLite handles concurrency reasonably well but we should get a fresh connection.
            with get_db_context() as conn:
                conn.execute("UPDATE stories SET image_category = ? WHERE id = ?", (public_url, story_id))
                
            return True, public_url
        else:
            return False, 'All image generation providers failed.'
            
    except Exception as e:
        print(f"Image Generation Logic Error: {e}")
        return False, str(e)

@bp.route('/generate', methods=['POST'])
def generate_story_image():
    try:
        data = request.json
        prompt = data.get('prompt')
        story_id = data.get('story_id')
        
        if not prompt or not story_id:
            return jsonify({'success': False, 'error': 'Missing prompt or story_id'}), 400
            
        success, result = generate_and_save_image(story_id, prompt)
        
        if success:
            return jsonify({'success': True, 'image_url': result})
        else:
            return jsonify({'success': False, 'error': result}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
