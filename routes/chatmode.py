"""
ChatMode API Routes
For interactive visual learning
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import os
import json

bp = Blueprint('chatmode', __name__)

# Whitelisted categories and items
ALLOWED_CATEGORIES = {
    'animals': ['dog', 'cat', 'elephant', 'lion', 'tiger', 'cow', 'horse', 'bird', 'fish', 'monkey'],
    'vehicles': ['car', 'bus', 'train', 'bicycle', 'airplane', 'boat', 'truck', 'motorcycle'],
    'fruits': ['apple', 'banana', 'mango', 'orange', 'grapes', 'watermelon', 'strawberry'],
    'objects': ['ball', 'book', 'chair', 'table', 'pen', 'pencil', 'cup', 'plate'],
    'nature': ['tree', 'flower', 'sun', 'moon', 'star', 'cloud', 'rain', 'mountain']
}

# Simple explanations templates
EXPLANATION_TEMPLATES = {
    'animals': [
        "This is a {item}.",
        "The {item} is an animal.",
        "{item}s are very nice."
    ],
    'vehicles': [
        "This is a {item}.",
        "The {item} helps us travel.",
        "We can go places in a {item}."
    ],
    'fruits': [
        "This is a {item}.",
        "The {item} is a fruit.",
        "{item}s are good to eat."
    ],
    'objects': [
        "This is a {item}.",
        "We use a {item} every day.",
        "The {item} is helpful."
    ],
    'nature': [
        "This is a {item}.",
        "We see {item}s outside.",
        "{item}s are beautiful."
    ]
}

# Image directory for ChatMode
CHATMODE_IMAGE_DIR = os.path.join('static', 'images', 'chatmode')
os.makedirs(CHATMODE_IMAGE_DIR, exist_ok=True)


def get_or_generate_image(category, item):
    """
    Get a cached image or generate a new one for a ChatMode item.
    Returns the public URL path or None if all generation providers fail.
    """
    filename = f"{category}_{item}.png"
    filepath = os.path.join(CHATMODE_IMAGE_DIR, filename)
    public_url = f"/images/chatmode/{filename}"

    # Return cached image if it already exists
    if os.path.exists(filepath):
        print(f"ChatMode: Using cached image for {item}")
        return public_url

    # Build a child-friendly image prompt
    prompt = (
        f"A simple, cute, colorful cartoon illustration of a {item} "
        f"({category}), children's book style, white background, "
        f"bright colors, friendly and approachable, educational"
    )

    # 1. Try OpenAI DALL-E 2 (small, cost-effective)
    try:
        openai_key = os.environ.get('OPENAI_API_KEY', '')
        if openai_key and 'sk-' in openai_key:
            from openai import OpenAI
            import requests as req
            client = OpenAI(api_key=openai_key)
            response = client.images.generate(
                model="dall-e-2",
                prompt=prompt,
                size="256x256",
                n=1,
            )
            image_url = response.data[0].url
            img_data = req.get(image_url).content
            with open(filepath, 'wb') as f:
                f.write(img_data)
            print(f"ChatMode: Generated DALL-E image for {item}")
            return public_url
    except Exception as e:
        print(f"ChatMode DALL-E failed for {item}: {e}")

    # 2. Try Google Imagen 3
    try:
        import base64
        import requests as req
        api_key = os.environ.get('GOOGLE_API_KEY', '')
        if api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key={api_key}"
            data = {
                "instances": [{"prompt": f"Children's cartoon illustration: {prompt}"}],
                "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
            }
            response = req.post(url, headers={'Content-Type': 'application/json'}, json=data)
            if response.status_code == 200:
                result = response.json()
                b64_data = result['predictions'][0]['bytesBase64Encoded']
                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(b64_data))
                print(f"ChatMode: Generated Imagen image for {item}")
                return public_url
    except Exception as e:
        print(f"ChatMode Google Imagen failed for {item}: {e}")

    # 3. Try HuggingFace FLUX.1-schnell
    try:
        import requests as req
        hf_token = os.environ.get('HF_TOKEN') or os.environ.get('HUGGINGFACE_API_KEY')
        api_url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
        headers = {}
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"
        response = req.post(api_url, headers=headers, json={"inputs": prompt})
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"ChatMode: Generated HF FLUX image for {item}")
            return public_url
    except Exception as e:
        print(f"ChatMode HF FLUX failed for {item}: {e}")

    print(f"ChatMode: All image generation providers failed for {item}")
    return None


def validate_prompt(prompt):
    """Validate if prompt is safe and allowed"""
    prompt = prompt.lower().strip()
    for category, items in ALLOWED_CATEGORIES.items():
        for item in items:
            if item in prompt:
                return True, category, item
    return False, None, None


def get_explanation(category, item):
    """Generate simple explanation for an item"""
    template = EXPLANATION_TEMPLATES.get(category, EXPLANATION_TEMPLATES['objects'])
    explanation = [sentence.format(item=item.title()) for sentence in template]
    return explanation


@bp.route('/ask', methods=['POST'])
def ask():
    """Process ChatMode request"""
    try:
        data = request.json
        prompt = data.get('prompt', '')

        if not prompt:
            return jsonify({'success': False, 'error': 'Prompt is required'}), 400

        # Validate prompt
        is_valid, category, item = validate_prompt(prompt)

        if not is_valid:
            return jsonify({
                'success': True,
                'is_safe': False,
                'message': "Let's look at animals or vehicles instead! 😊",
                'suggestions': ['dog', 'cat', 'car', 'bus']
            })

        # Get or generate real image (runs synchronously; image is cached after first call)
        image_path = get_or_generate_image(category, item)

        # Generate explanation
        explanation = get_explanation(category, item)

        # Save to history
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chatmode_history (prompt, category, image_path, explanation)
                VALUES (?, ?, ?, ?)
            ''', (prompt, category, image_path or '', json.dumps(explanation)))

        return jsonify({
            'success': True,
            'is_safe': True,
            'category': category,
            'item': item,
            'image_path': image_path,   # None if all providers failed; frontend shows emoji
            'explanation': explanation
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/history', methods=['GET'])
def get_history():
    """Get ChatMode history"""
    try:
        limit = request.args.get('limit', 10, type=int)

        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT prompt, category, image_path, explanation, created_at
                FROM chatmode_history
                ORDER BY created_at DESC
                LIMIT ?
            ''', (limit,))

            history = []
            for row in cursor.fetchall():
                item_row = dict(row)
                item_row['explanation'] = json.loads(item_row['explanation'])
                history.append(item_row)

            return jsonify({'success': True, 'history': history})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
