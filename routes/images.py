
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

def generate_image_hf(prompt, output_path):
    import requests
    import os
    
    api_url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    headers = {}
    hf_token = os.environ.get('HF_TOKEN') or os.environ.get('HUGGINGFACE_API_KEY')
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"
        
    # Send request
    # Since this is an image model, the prompt helps shape the style.
    full_prompt = f"Children's story book illustration, gentle, colorful, simple: {prompt}"
    
    response = requests.post(api_url, headers=headers, json={"inputs": full_prompt})
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        return True
    else:
        # Check for model loading error
        if 'is currently loading' in response.text:
             raise Exception("Model is loading, try again later")
        raise Exception(f"HF Image API Error {response.status_code}: {response.text}")


def _sentence_image_prompt(scene_text, story_title=None):
    """Build prompt that keeps same story characters and style; no random scenes."""
    base = (
        "Children's story book illustration. IMPORTANT: Draw the SAME main characters and "
        "same art style in every image. Preserve story context. Do NOT draw random or unrelated scenes. "
        "Gentle, colorful, simple, consistent character design throughout."
    )
    if story_title:
        base += f" Story title: {story_title[:80]}."
    base += f" This exact scene only: {scene_text[:150]}."
    return base


def generate_sentence_image_openai(prompt, output_path, story_title=None):
    """Cost-saving: DALL-E 2, small size. Prompt preserves story context and characters."""
    from openai import OpenAI
    client = OpenAI()
    full_prompt = _sentence_image_prompt(prompt, story_title) if story_title else f"Simple children's book illustration, gentle, colorful. Same characters throughout. Scene: {prompt[:150]}"
    response = client.images.generate(
        model="dall-e-2",
        prompt=full_prompt,
        size="256x256",
        n=1,
    )
    image_url = response.data[0].url
    img_data = requests.get(image_url).content
    with open(output_path, 'wb') as f:
        f.write(img_data)
    return True


def generate_and_save_sentence_image(story_id, sentence_order, prompt, story_title=None):
    """
    Generate and save one image for a sentence (basic/cost-saving).
    story_title used to keep characters and context consistent across images.
    Returns: (success, result_url_or_error)
    """
    try:
        filename = f"story_{story_id}_sentence_{sentence_order}.png"
        filepath = os.path.join(IMAGE_DIR, filename)
        public_url = f"/images/stories/{filename}"

        if os.path.exists(filepath):
            return True, public_url

        provider = get_llm_provider()
        
        # 0. Try Hugging Face first if TinyStories
        if provider == 'tinystories':
            try:
                # Add context for HF prompt
                hf_prompt = prompt
                if story_title:
                    hf_prompt = f"Scene from {story_title}: {prompt}"
                print(f"Attempting HF FLUX.1-schnell for Sentence {sentence_order}...")
                generate_image_hf(hf_prompt, filepath)
                return True, public_url
            except Exception as e:
                print(f"HF Sentence Image Gen failed: {e}")
                # Fall through to OpenAI if available

        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key or 'sk-' not in openai_key:
            return False, 'OpenAI API key required for sentence images if not using HF.'

        try:
            generate_sentence_image_openai(prompt, filepath, story_title=story_title)
            return True, public_url
        except Exception as e:
            print(f"Sentence image gen failed: {e}")
            return False, str(e)
    except Exception as e:
        print(f"Sentence image error: {e}")
        return False, str(e)


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
        provider = get_llm_provider()
        
        # 0. If TinyStories, Try Hugging Face model first
        if provider == 'tinystories':
             try:
                 print(f"Attempting HF FLUX.1-schnell for Story {story_id}...")
                 generate_image_hf(prompt, filepath)
                 success = True
             except Exception as e:
                 print(f"HF Image Failed: {e}")
        
        # 1. Try OpenAI DALL-E 3 first if key exists AND (not successful yet)
        if not success and openai_key and 'sk-' in openai_key:
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


@bp.route('/generate-sentence', methods=['POST'])
def generate_sentence_image():
    """Generate one basic (cost-saving) image for a sentence. story_title keeps characters consistent."""
    try:
        data = request.json or {}
        story_id = data.get('story_id')
        sentence_order = data.get('sentence_order', 0)
        prompt = data.get('prompt', '').strip()
        story_title = data.get('story_title', '').strip() or None
        if not prompt:
            return jsonify({'success': False, 'error': 'Missing prompt'}), 400
        if story_id is None:
            return jsonify({'success': False, 'error': 'Missing story_id'}), 400
        success, result = generate_and_save_sentence_image(story_id, sentence_order, prompt, story_title=story_title)
        if success:
            return jsonify({'success': True, 'image_url': result})
        return jsonify({'success': False, 'error': result}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
