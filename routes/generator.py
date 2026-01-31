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

def is_abstract_concept(topic):
    """Check if topic is an abstract concept rather than a concrete character"""
    abstract_keywords = [
        'manners', 'kindness', 'honesty', 'friendship', 'respect', 'sharing',
        'helping', 'learning', 'courage', 'patience', 'gratitude', 'love',
        'care', 'responsibility', 'teamwork', 'listening', 'politeness'
    ]
    topic_lower = topic.lower()
    return any(keyword in topic_lower for keyword in abstract_keywords)

def create_character_name(topic):
    """Create an appropriate character name based on topic"""
    # For abstract concepts, use a child character
    if is_abstract_concept(topic):
        names = ['Ravi', 'Priya', 'Amit', 'Sneha', 'Arjun', 'Diya']
        return random.choice(names)
    
    # For concrete things, use the topic itself
    topic_clean = topic.lower().strip()
    # Remove articles
    for article in ['a ', 'an ', 'the ']:
        if topic_clean.startswith(article):
            topic_clean = topic_clean[len(article):]
    
    return topic_clean

    return story

def generate_moral(topic):
    """Generate an appropriate moral based on topic"""
    topic_lower = topic.lower()
    
    # Specific morals for abstract concepts
    morals = {
        'manners': "Good manners make everyone happy.",
        'kindness': "Being kind makes the world a better place.",
        'honesty': "Always tell the truth, it is the brave thing to do.",
        'friendship': "A good friend helps you when you need it.",
        'respect': "Treat others the way you want to be treated.",
        'sharing': "Sharing brings joy to everyone.",
        'helping': "Helping others is the best way to be happy.",
        'courage': "Being brave means doing what is right.",
        'patience': "Good things come to those who wait.",
        'gratitude': "Always remember to say thank you.",
        'politeness': "Polite words are like magic keys."
    }
    
    for key, moral in morals.items():
        if key in topic_lower:
            return moral
            
    # Generic morals based on category
    if any(w in topic_lower for w in ['family', 'mother', 'father']):
        return "Family love is the most special gift."
    elif any(w in topic_lower for w in ['friend', 'play']):
        return "Playing together is more fun than playing alone."
    elif any(w in topic_lower for w in ['learn', 'school', 'teacher']):
        return "Learning new things is an exciting adventure."
    
    # Fallback morals
    return random.choice([
        "Happiness comes from kind actions.",
        "Every day is a chance to learn something new.",
        "A smile is the prettiest thing you can wear.",
        "Being yourself is your super power.",
        "Small acts of love make a big difference."
    ])

from routes import llm

# ... (Previous constants like ADJECTIVES, templates etc remain, just imports added above)

def generate_story_content(topic, length='short'):
    """Generate story content, title, and moral based on topic and length"""
    
    # Try LLM first
    try:
        from routes.llm import get_llm_provider
        provider = get_llm_provider()
        print(f"DEBUG: Generating story for topic '{topic}' using provider: {provider}")
        
        llm_result = llm.generate_story_text(topic, length)
        if llm_result:
            print("DEBUG: LLM generation successful")
            return llm_result # (title, content, moral)
        else:
            print("DEBUG: LLM generation returned None (falling back)")
    except Exception as e:
        print(f"DEBUG: LLM Generation failed with error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to templates
    
    # Fallback Logic
    topic_lower = topic.lower().strip()
    is_concept = is_abstract_concept(topic)
    
    content = ""
    if is_concept:
        content = generate_concept_story(topic_lower, length)
    else:
        content = generate_character_story(topic_lower, length)
        
    moral = generate_moral(topic)
    title = generate_story_title(topic)
    
    return title, content, moral

# ... (keep helper functions like is_abstract_concept, generate_moral, etc.)

@bp.route('/random', methods=['POST'])
def generate_random_story():
    """Generate a random story"""
    try:
        data = request.json or {}
        length = data.get('length', 'short')
        
        # Pick a random topic
        topic = random.choice(RANDOM_TOPICS)
        
        # Generate story (Refactored to get title from tuple)
        title, content, moral = generate_story_content(topic, length)
        theme = determine_theme(topic)
        
        # Save to database
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (title, content, moral, theme, 'easy', theme))
            
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
        title, content, moral = generate_story_content(topic, length)
        theme = determine_theme(topic)
        
        # Save to database
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (title, content, moral, theme, 'easy', theme))
            
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

def generate_concept_story(concept, length='short'):
    """Generate educational story about a concept like good manners, kindness, etc."""
    character = create_character_name(concept)
    
    # Concept-specific story templates
    if 'manner' in concept or 'polite' in concept:
        if length == 'short':
            return f"{character} was a kind child. {character} always said 'please' and 'thank you'. {character} helped others with a smile. Everyone loved {character}'s good manners. {character} felt happy being polite."
        elif length == 'medium':
            return f"{character} learned about good manners. Every morning, {character} greeted everyone with 'Good morning'. {character} said 'please' when asking for things. {character} always said 'thank you' when receiving help. {character} listened when others spoke. {character} never interrupted anyone. At school, {character} was very respectful. The teachers praised {character}. Friends enjoyed {character}'s company. {character}'s parents felt proud. Good manners made {character} happy. Everyone wanted to be like {character}."
        else:  # long
            return f"{character} was learning about good manners. One day, {character}'s teacher explained why manners matter. Good manners show respect for others. They make people feel valued and happy. {character} decided to practice every day. In the morning, {character} greeted parents warmly. {character} said 'please' when asking for breakfast. {character} thanked mother for the delicious food. At school, {character} held the door for friends. {character} said 'excuse me' when passing by. {character} listened carefully when the teacher spoke. {character} never interrupted during class. During lunch, {character} shared food with friends. {character} said 'sorry' when making a mistake. Friends noticed {character}'s kind behavior. They started copying {character}'s good habits. The teacher was very impressed. She told the class about {character}'s wonderful manners. {character}'s parents received praise from everyone. {character} felt proud and happy. Good manners had made life better. {character} promised to always be polite. Being kind and respectful became {character}'s way of life."
    
    elif 'kind' in concept or 'help' in concept:
        if length == 'short':
            return f"{character} loved helping others. {character} saw a friend who was sad. {character} asked, 'Can I help you?' Together they solved the problem. {character} felt happy helping."
        elif length == 'medium':
            return f"{character} was a very kind child. Every day, {character} looked for ways to help. {character} helped mother with chores. {character} helped friends with homework. {character} helped neighbors carry bags. One day, {character} saw an old man struggling. {character} quickly went to help him. The man smiled and thanked {character}. {character}'s heart filled with joy. Helping others made {character} very happy."
        else:  # long
            return f"{character} believed in the power of kindness. Every morning, {character} thought about how to help others. At home, {character} helped with household work. {character} made the bed without being asked. {character} helped wash the dishes after meals. At school, {character} noticed a new student looking lost. {character} walked up with a friendly smile. 'Hello! I'm {character}. Can I help you?' The new student felt relieved. {character} showed them around the school. {character} introduced them to other friends. During class, {character} shared pencils and erasers. {character} helped classmates understand difficult lessons. After school, {character} saw an elderly neighbor. She was carrying heavy grocery bags. {character} ran to help her. 'Let me carry those for you,' {character} offered. The neighbor was very grateful. She blessed {character} with a warm smile. {character}'s parents noticed the kind behavior. They felt very proud of their child. {character} learned that small acts of kindness matter. Helping others brought joy to everyone. {character} decided to be kind every single day."
    
    elif 'honest' in concept or 'truth' in concept:
        if length == 'short':
            return f"{character} always told the truth. One day, {character} broke a glass. {character} felt scared but told the truth. Mother appreciated {character}'s honesty. {character} learned honesty is important."
        elif length == 'medium':
            return f"{character} valued honesty very much. One day, {character} found money on the ground. {character} could have kept it secretly. But {character} knew that was wrong. {character} gave the money to the teacher. The teacher found the owner. The owner thanked {character} warmly. {character}'s parents heard about it. They praised {character} for being honest. {character} felt proud and happy. Honesty made {character} trustworthy."
        else:  # long
            return f"{character} learned about honesty from parents. They taught that truth is always important. One day, {character} accidentally broke a vase. It was mother's favorite vase. {character} felt very scared and worried. {character} thought about hiding the truth. But {character} remembered what parents taught. Taking a deep breath, {character} went to mother. 'I'm sorry, I broke your vase,' {character} said. Mother saw {character} was honest and brave. Instead of being angry, she hugged {character}. 'Thank you for telling the truth,' she said. 'Honesty is more valuable than any vase.' {character} felt relieved and happy. At school, {character} found a wallet. It had money and cards inside. {character} immediately gave it to the teacher. The teacher announced it in class. The owner came forward gratefully. Everyone praised {character}'s honesty. The principal called {character} to the office. {character} received an honesty award. {character}'s parents attended the ceremony. They felt extremely proud of their child. {character} learned that honesty builds trust. People respect those who tell the truth. From that day, {character} always chose honesty. Being truthful became {character}'s strongest quality."
    
    else:
        # Generic positive concept story
        if length == 'short':
            return f"{character} learned about {concept}. {character} practiced it every day. {character} became better at {concept}. Friends admired {character}. {character} felt very happy."
        elif length == 'medium':
            return f"{character} wanted to learn about {concept}. The teacher explained its importance. {character} listened carefully and understood. Every day, {character} practiced {concept}. {character} showed {concept} at home. {character} showed {concept} at school. Friends noticed the positive change. They started learning from {character}. Everyone appreciated {character}'s efforts. {character} felt proud and joyful."
        else:  # long
            return f"{character} was curious about {concept}. One day, the teacher taught about it. The teacher explained why {concept} is important. {concept} helps us become better people. {character} decided to practice every day. At home, {character} showed {concept} to family. Parents were very happy to see this. At school, {character} demonstrated {concept} to friends. Classmates were impressed by {character}'s behavior. They asked {character} to teach them too. {character} happily shared the knowledge. Together, they all practiced {concept}. The whole class became better at it. The teacher noticed the positive change. She praised {character} for being a good example. {character}'s parents heard about this achievement. They felt very proud of their child. {character} realized that {concept} makes life better. It brings happiness to everyone around. {character} promised to always practice {concept}. Being a good person became {character}'s goal."

def generate_character_story(subject, length='short'):
    """Generate story about a character/thing"""
    # Clean the subject
    subject_clean = subject
    for article in ['a ', 'an ', 'the ']:
        if subject_clean.startswith(article):
            subject_clean = subject_clean[len(article):]
    
    subject_cap = capitalize_first(subject_clean)
    
    # Select template based on length
    templates = STORY_TEMPLATES.get(length, STORY_TEMPLATES['short'])
    template = random.choice(templates)
    
    # Fill in the template
    story = template.format(
        subject=subject_clean,
        subject_cap=subject_cap,
        adjective=random.choice(ADJECTIVES),
        adjective2=random.choice(ADJECTIVES),
        action=random.choice(ACTIONS),
        action2=random.choice(ACTIONS2),
        place=random.choice(PLACES)
    )
    
    return story

def generate_story_title(topic):
    """Generate an appropriate title based on topic"""
    if is_abstract_concept(topic):
        # For concepts, create educational titles
        concept_titles = {
            'manners': 'Learning Good Manners',
            'kindness': 'The Kind Helper',
            'honesty': 'The Honest Child',
            'friendship': 'The Value of Friendship',
            'respect': 'Showing Respect',
            'sharing': 'Learning to Share',
            'helping': 'The Joy of Helping',
            'courage': 'Being Brave',
            'patience': 'Learning Patience',
            'gratitude': 'Saying Thank You',
            'politeness': 'Being Polite'
        }
        
        # Check for matching concept
        for key, title in concept_titles.items():
            if key in topic.lower():
                return title
        
        # Generic concept title
        return f"Learning About {capitalize_first(topic)}"
    else:
        # For characters/things, use traditional format
        topic_clean = topic
        for article in ['a ', 'an ', 'the ']:
            if topic_clean.lower().startswith(article):
                topic_clean = topic_clean[len(article):]
        return f"The Story of {capitalize_first(topic_clean)}"

def determine_theme(topic):
    """Determine theme category based on topic"""
    topic_lower = topic.lower()
    
    # Check for abstract concepts first
    if is_abstract_concept(topic):
        return 'values'
    
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


