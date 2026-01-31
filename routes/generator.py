"""
Story Generation API Routes
Using simple template-based generation (can be enhanced with LLM later)
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import random

bp = Blueprint('generator', __name__)

# Kid-friendly topics for random generation
RANDOM_TOPICS = [
    'a friendly dog', 'a brave cat', 'a happy elephant', 'a wise owl',
    'a red car', 'a big bus', 'a fast train', 'a flying airplane',
    'a sunny day', 'a rainy day', 'a beautiful rainbow', 'a bright star',
    'a kind friend', 'a helpful teacher', 'a loving family', 'a fun game',
    'a tasty apple', 'a sweet mango', 'a yummy banana', 'fresh vegetables',
    'a tall tree', 'colorful flowers', 'singing birds', 'playful butterflies'
]

# Simple story templates
STORY_TEMPLATES = {
    'short': [
        "There was {subject}. {subject_cap} was very {adjective}. {subject_cap} liked to {action}. Every day, {subject} would {action}. {subject_cap} was always happy.",
        "{subject_cap} lived in a {place}. The {place} was {adjective}. {subject_cap} had many friends. They would {action} together. Everyone loved {subject}.",
        "One day, {subject} woke up early. {subject_cap} wanted to {action}. The day was {adjective}. {subject_cap} felt very happy. It was a good day."
    ],
    'medium': [
        "There was {subject}. {subject_cap} was very {adjective}. Every morning, {subject} would wake up early. {subject_cap} liked to {action}. All the friends loved {subject}. One day, {subject} decided to {action2}. It was a {adjective2} day. {subject_cap} felt very happy. The sun was shining bright. {subject_cap} played all day long. When evening came, {subject} went home. {subject_cap} had a wonderful day. {subject_cap} slept with a big smile.",
        "{subject_cap} lived in a beautiful {place}. The {place} was very {adjective}. {subject_cap} had many good friends. Every day they would {action} together. {subject_cap} was always kind and helpful. One sunny day, {subject} found something special. It was a {adjective2} surprise. {subject_cap} shared it with everyone. All the friends were very happy. They thanked {subject} for being so nice. {subject_cap} felt proud and joyful. That night, {subject} dreamed happy dreams."
    ],
    'long': [
        "Once upon a time, there was {subject}. {subject_cap} lived in a {place} with many friends. {subject_cap} was known for being very {adjective}. Every morning, {subject} would wake up with the sunrise. {subject_cap} loved to {action} in the morning. All the friends would come to visit {subject}. They enjoyed spending time together. One beautiful day, something special happened. {subject_cap} decided to {action2} for the very first time. At first, {subject} felt a little nervous. But the friends encouraged {subject} to try. With their support, {subject} felt brave. {subject_cap} took a deep breath and started. It was {adjective2} and exciting! Everyone cheered for {subject}. {subject_cap} felt so happy and proud. From that day on, {subject} knew that with good friends, anything is possible. {subject_cap} learned that trying new things can be fun. Every day became an adventure. {subject_cap} and the friends lived happily, always helping each other. They learned, played, and grew together. And {subject} was grateful for every moment.",
        "In a {adjective} {place}, there lived {subject}. {subject_cap} was special because {subject} was very {adjective2}. Every day was an adventure for {subject}. In the morning, {subject} would {action} with great joy. The other animals in the {place} admired {subject}. {subject_cap} had a best friend who was also very kind. Together, they would explore and discover new things. One day, they decided to {action2} together. It was something they had never done before. {subject_cap} felt excited but also a little scared. The friend said, 'Don't worry, we can do this together!' With courage in their hearts, they began their journey. The path was {adjective} and full of surprises. They saw beautiful sights along the way. They helped each other when things got difficult. {subject_cap} realized that friendship makes everything better. When they finally reached their goal, they were so happy! They celebrated their success together. {subject_cap} learned an important lesson that day. With determination and good friends, dreams come true. From then on, {subject} faced every challenge with confidence. The {place} became even more wonderful. And {subject} lived each day with joy and gratitude."
    ]
}

# Word banks for generation
ADJECTIVES = ['happy', 'kind', 'brave', 'smart', 'friendly', 'gentle', 'cheerful', 'helpful', 'bright', 'wonderful']
ACTIONS = ['play', 'sing', 'dance', 'run', 'jump', 'laugh', 'explore', 'learn', 'help others', 'make friends']
ACTIONS2 = ['try something new', 'help a friend', 'learn a skill', 'go on an adventure', 'solve a problem']
PLACES = ['village', 'forest', 'garden', 'park', 'town', 'meadow', 'valley', 'neighborhood']

def capitalize_first(text):
    """Capitalize first letter of text"""
    return text[0].upper() + text[1:] if text else text

def generate_story_content(topic, length='short'):
    """Generate story content based on topic and length"""
    # Clean and prepare the topic
    subject = topic.lower().strip()
    if not subject.startswith('a ') and not subject.startswith('an ') and not subject.startswith('the '):
        # Add article if missing
        if subject[0] in 'aeiou':
            subject = 'an ' + subject
        else:
            subject = 'a ' + subject
    
    subject_cap = capitalize_first(subject)
    
    # Select template
    templates = STORY_TEMPLATES.get(length, STORY_TEMPLATES['short'])
    template = random.choice(templates)
    
    # Fill in the template
    story = template.format(
        subject=subject,
        subject_cap=subject_cap,
        adjective=random.choice(ADJECTIVES),
        adjective2=random.choice(ADJECTIVES),
        action=random.choice(ACTIONS),
        action2=random.choice(ACTIONS2),
        place=random.choice(PLACES)
    )
    
    return story

def determine_theme(topic):
    """Determine theme category based on topic"""
    topic_lower = topic.lower()
    
    if any(word in topic_lower for word in ['dog', 'cat', 'elephant', 'lion', 'bird', 'animal', 'monkey', 'tiger']):
        return 'animals'
    elif any(word in topic_lower for word in ['car', 'bus', 'train', 'plane', 'vehicle', 'truck', 'bicycle']):
        return 'vehicles'
    elif any(word in topic_lower for word in ['family', 'mother', 'father', 'friend', 'teacher', 'people']):
        return 'family'
    elif any(word in topic_lower for word in ['tree', 'flower', 'sun', 'moon', 'star', 'nature', 'rain', 'cloud']):
        return 'nature'
    elif any(word in topic_lower for word in ['apple', 'banana', 'mango', 'food', 'fruit', 'vegetable']):
        return 'food'
    else:
        return 'general'

@bp.route('/random', methods=['POST'])
def generate_random_story():
    """Generate a random story"""
    try:
        data = request.json or {}
        length = data.get('length', 'short')
        
        # Pick a random topic
        topic = random.choice(RANDOM_TOPICS)
        
        # Generate story
        content = generate_story_content(topic, length)
        theme = determine_theme(topic)
        title = f"The Story of {capitalize_first(topic)}"
        
        # Save to database
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO stories (title, content, theme, difficulty_level, image_category)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, content, theme, 'easy', theme))
            
            story_id = cursor.lastrowid
            
            # Split into sentences
            sentences = [s.strip() + '.' for s in content.split('.') if s.strip()]
            for idx, sentence in enumerate(sentences):
                cursor.execute('''
                    INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                    VALUES (?, ?, ?)
                ''', (story_id, idx, sentence))
        
        return jsonify({
            'success': True,
            'story_id': story_id,
            'title': title,
            'message': 'Random story generated successfully!'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/topic', methods=['POST'])
def generate_topic_story():
    """Generate a story on a specific topic"""
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        length = data.get('length', 'short')
        
        if not topic:
            return jsonify({
                'success': False,
                'error': 'Topic is required'
            }), 400
        
        # Generate story
        content = generate_story_content(topic, length)
        theme = determine_theme(topic)
        title = f"The Story of {capitalize_first(topic)}"
        
        # Save to database
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO stories (title, content, theme, difficulty_level, image_category)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, content, theme, 'easy', theme))
            
            story_id = cursor.lastrowid
            
            # Split into sentences
            sentences = [s.strip() + '.' for s in content.split('.') if s.strip()]
            for idx, sentence in enumerate(sentences):
                cursor.execute('''
                    INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                    VALUES (?, ?, ?)
                ''', (story_id, idx, sentence))
        
        return jsonify({
            'success': True,
            'story_id': story_id,
            'title': title,
            'message': f'Story about "{topic}" generated successfully!'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
