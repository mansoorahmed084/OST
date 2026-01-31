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

def validate_prompt(prompt):
    """Validate if prompt is safe and allowed"""
    prompt = prompt.lower().strip()
    
    # Extract potential item from prompt
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
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        # Validate prompt
        is_valid, category, item = validate_prompt(prompt)
        
        if not is_valid:
            return jsonify({
                'success': True,
                'is_safe': False,
                'message': "Let's look at animals or vehicles instead! 😊",
                'suggestions': ['dog', 'cat', 'car', 'bus']
            })
        
        # Get image path (for now, use placeholder)
        # In Phase 6, we'll add actual image fetching
        image_path = f'/images/{category}/{item}.jpg'
        
        # Generate explanation
        explanation = get_explanation(category, item)
        
        # Save to history
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chatmode_history (prompt, category, image_path, explanation)
                VALUES (?, ?, ?, ?)
            ''', (prompt, category, image_path, json.dumps(explanation)))
        
        return jsonify({
            'success': True,
            'is_safe': True,
            'category': category,
            'item': item,
            'image_path': image_path,
            'explanation': explanation
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
                item = dict(row)
                item['explanation'] = json.loads(item['explanation'])
                history.append(item)
            
            return jsonify({
                'success': True,
                'history': history
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
