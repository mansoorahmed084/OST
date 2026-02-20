"""
Story Generation API Routes
Using simple template-based generation (can be enhanced with LLM later)
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import random
import threading
import logging
import sqlite3

bp = Blueprint('generator', __name__)
logger = logging.getLogger(__name__)


def _generate_story_assets(story_id, title, content, full_text_en, full_text_translated,
                           sentences_for_images, target_language, speed):
    """Run audio and image generation in background. Does not block."""
    try:
        from routes.speech import generate_audio_file, pregenerate_sentence_audio
        from routes.images import generate_and_save_image, generate_and_save_sentence_image

        def story_cover_task(sid, t, txt):
            log_prompt = f"Children's story illustration: {t}. Scene: {txt[:200]}"
            generate_and_save_image(sid, log_prompt)

        def all_sentence_images_task(sid, story_title, sentence_texts):
            for idx, sent in enumerate(sentence_texts):
                try:
                    generate_and_save_sentence_image(sid, idx, (sent or '')[:200], story_title=story_title)
                except Exception as e:
                    logger.error("Sentence image %s failed: %s", idx, e)

        img_thread = threading.Thread(target=story_cover_task, args=(story_id, title, content))
        img_thread.start()
        sent_img_thread = threading.Thread(target=all_sentence_images_task,
                                           args=(story_id, title, sentences_for_images))
        sent_img_thread.start()

        generate_audio_file(story_id, full_text_en, speed, language='en')
        if target_language != 'en' and full_text_translated:
            generate_audio_file(story_id, full_text_translated, speed, language=target_language)
        pregenerate_sentence_audio(story_id, speed)

        sent_img_thread.join()
        img_thread.join()
        logger.info("Background asset generation finished for story %s", story_id)
    except Exception as e:
        logger.exception("Background audio/image generation failed for story %s: %s", story_id, e)

# Kid-friendly topics for random generation
RANDOM_TOPICS = [
    'a friendly dog','a small dog','a brown dog','a playful puppy','a brave cat','a white cat','a sleepy cat','a soft kitten',
    'a big cow','a calm cow','a milk cow','a brown cow','a gentle goat','a white goat','a small goat','a jumping goat',
    'a fast horse','a tall horse','a brown horse','a running horse','a happy elephant','a big elephant','a kind elephant','a walking elephant',
    'a tall giraffe','a spotted giraffe','a gentle giraffe','a long neck giraffe','a strong lion','a quiet lion','a resting lion','a brave lion',
    'a jumping monkey','a funny monkey','a small monkey','a clever monkey','a wise owl','a brown owl','a night owl','a quiet owl',
    'a flying bird','a small bird','a singing bird','a blue bird','a yellow duck','a swimming duck','a baby duck','a happy duck',
    'a slow turtle','a green turtle','a walking turtle','a calm turtle','a hopping rabbit','a white rabbit','a small rabbit','a fast rabbit',
    'a barking dog','a meowing cat','a mooing cow','a neighing horse','a chirping bird','a flying butterfly','a colorful butterfly','a soft butterfly',
    'a busy ant','a small ant','a black ant','a walking ant','a buzzing bee','a yellow bee','a flying bee','a honey bee',
    'a swimming fish','a small fish','a red fish','a shiny fish',

    'a red car','a blue car','a small car','a fast car','a big bus','a yellow bus','a school bus','a city bus',
    'a long train','a fast train','a green train','a railway train','a flying airplane','a big airplane','a white airplane','a loud airplane',
    'a black bike','a small bike','a fast bike','a new bike','a green auto','a yellow auto','a city auto','a small auto',
    'a moving truck','a big truck','a red truck','a heavy truck','a water boat','a small boat','a fishing boat','a blue boat',
    'a flying helicopter','a rescue helicopter','a loud helicopter','a red helicopter','a slow bullock cart','a village cart','a wooden cart','a farm cart',
    'a cycle rickshaw','a city rickshaw','a slow rickshaw','a green rickshaw','a police jeep','a white jeep','a strong jeep','a big jeep',
    'a fire engine','a red fire engine','a fast fire engine','a loud fire engine','an ambulance van','a white ambulance','a fast ambulance','a helping ambulance',
    'a garbage truck','a green garbage truck','a city garbage truck','a cleaning truck',

    'a red apple','a sweet apple','a juicy apple','a fresh apple','a yellow banana','a ripe banana','a sweet banana','a long banana',
    'a sweet mango','a ripe mango','a juicy mango','a yellow mango','a round orange','a sweet orange','a peeled orange','a fresh orange',
    'a slice of bread','soft bread','fresh bread','warm bread','a bowl of rice','white rice','hot rice','plain rice',
    'a roti bread','soft roti','round roti','warm roti','a glass of milk','warm milk','cold milk','fresh milk',
    'a cup of water','clean water','cold water','drinking water','a sweet biscuit','round biscuit','tea biscuit','plain biscuit',
    'a chocolate bar','sweet chocolate','brown chocolate','small chocolate','a bowl of dal','hot dal','yellow dal','soft dal',
    'a plate of vegetables','fresh vegetables','green vegetables','cut vegetables',

    'a sunny day','a hot day','a bright day','a clear day','a rainy day','a wet day','a cloudy day','a cool day',
    'a big tree','a green tree','a tall tree','a shady tree','colorful flowers','red flowers','yellow flowers','fresh flowers',
    'a green leaf','a small leaf','a dry leaf','a fallen leaf','a blue sky','a clear sky','a cloudy sky','a wide sky',
    'a bright sun','a hot sun','a yellow sun','a shining sun','a white moon','a full moon','a night moon','a bright moon',
    'a twinkling star','a bright star','many stars','night stars','a flowing river','a clean river','a wide river','a slow river',
    'a calm lake','a blue lake','a quiet lake','a deep lake','a green hill','a small hill','a tall hill','a far hill',
    'a cool breeze','a soft wind','a strong wind','a moving wind',

    'a happy family','a small family','a loving family','a kind family','a caring mother','a busy mother','a smiling mother','a gentle mother',
    'a strong father','a kind father','a helping father','a smiling father','a young boy','a happy boy','a playful boy','a kind boy',
    'a little girl','a happy girl','a smiling girl','a kind girl','a clean house','a big house','a small house','a white house',
    'a cozy room','a clean room','a quiet room','a bright room','a soft bed','a warm bed','a small bed','a clean bed',
    'a wooden table','a round table','a dining table','a small table','a chair to sit','a small chair','a wooden chair','a clean chair',
    'a kitchen room','a clean kitchen','a cooking kitchen','a home kitchen','a bathroom sink','a clean bathroom','a washing bathroom','a water tap',
    'a school bag','a heavy bag','a blue bag','a new bag','a pencil box','a small pencil','a sharp pencil','a long pencil',

    'a fun game','a simple game','a happy game','a playing game','a red ball','a round ball','a bouncing ball','a soft ball',
    'a toy car','a small toy car','a red toy car','a moving toy car','a toy train','a long toy train','a colorful toy train','a toy engine',
    'a teddy bear','a soft teddy','a brown teddy','a smiling teddy','a doll toy','a small doll','a pretty doll','a dress doll',
    'a puzzle game','a simple puzzle','a picture puzzle','a fun puzzle','a drawing book','a white book','a big book','a school book',
    'a color pencil','a red pencil','a blue pencil','a green pencil','a paint brush','a soft brush','a paint color','a drawing brush',
    'a blackboard','a school board','a writing board','a clean board','a school class','a happy class','a quiet class','a learning class',
    'a school bell','a ringing bell','a loud bell','a school bell','a lunch box','a small lunch box','a blue lunch box','a full lunch box',
    'a playground slide','a tall slide','a fun slide','a fast slide','a swing ride','a moving swing','a slow swing','a happy swing'
]

# Simple story templates
# Simple story templates - Simplified for Omar (Subject-Verb-Object)
STORY_TEMPLATES = {
    'short': [
        "{subject_cap} is a {subject}. {pronoun} is {adjective}. {pronoun} likes to {action}. {pronoun} sees a {adjective2} friend. They {action} together. {subject_cap} is happy.",
        "See the {subject}. {pronoun} is {adjective}. {pronoun} goes to the {place}. The {place} is {adjective2}. {pronoun} likes the {place}. {subject_cap} will {action}.",
        "{subject_cap} wakes up. {pronoun} is {adjective}. {pronoun} wants to {action}. {pronoun} goes to the {place}. {subject_cap} has fun."
    ],
    'medium': [
        "{subject_cap} is a big {subject}. {pronoun} is very {adjective}. One day, {pronoun} goes to the {place}. The {place} is {adjective2}. {pronoun} sees a friend. The friend is happy. They {action} together. They {action2}. {subject_cap} feels good. {pronoun} goes home. {pronoun} sleeps.",
        "This is {subject_cap}. {pronoun} lives in a {place}. The {place} is nice. {pronoun} is {adjective}. {pronoun} likes to {action}. {pronoun} finds a {adjective2} toy. {pronoun} looks at the toy. {pronoun} plays with the toy. {subject_cap} is happy. {pronoun} loves the {place}."
    ],
    'long': [
        "{subject_cap} is a {subject}. {pronoun} is {adjective}. {pronoun} lives in the {place}. The {place} is big. One day, {subject_cap} wakes up. The sun is bright. {pronoun} wants to {action}. {pronoun} goes outside. {pronoun} sees a friend. The friend says hello. They walk together. They see a {adjective2} flower. It is pretty. {subject_cap} likes the flower. They {action2} together. It is fun. {pronoun} is very happy. {pronoun} goes home. {pronoun} sleeps.",
        "Once there was a {subject}. The name was {subject_cap}. {pronoun} was {adjective}. {pronoun} lived in a {place}. The {place} was green. {subject_cap} had a friend. They played every day. One day they went to {action}. They ran fast. They jumped high. They saw a {adjective2} bird. The bird sang. {subject_cap} smiled. {pronoun} liked the bird. They decided to {action2}. It was a good day. {subject_cap} was happy."
    ]
}

# Word banks for generation
ADJECTIVES = [
    'happy', 'sad', 'kind', 'nice', 'good',
    'brave', 'smart', 'friendly', 'gentle', 'cheerful',
    'helpful', 'bright', 'funny', 'quiet', 'loud',
    'soft', 'hard', 'clean', 'dirty', 'big',
    'small', 'tall', 'short', 'fast', 'slow',
    'hot', 'cold', 'warm', 'cool', 'new',
    'old', 'pretty', 'cute', 'strong', 'weak',
    'busy', 'free', 'calm', 'angry', 'safe',
    'sweet', 'simple', 'easy', 'fair', 'kindly'
]
ACTIONS = [
    'play', 'run', 'walk', 'jump', 'sit',
    'stand', 'clap', 'wave', 'smile', 'laugh',
    'cry', 'talk', 'listen', 'look', 'see',
    'read', 'write', 'draw', 'paint', 'sing',
    'dance', 'eat', 'drink', 'sleep', 'wake',
    'wash', 'clean', 'help', 'share', 'give',
    'take', 'open', 'close', 'come', 'go',
    'throw', 'catch', 'kick', 'push', 'pull',
    'carry', 'hold', 'hug', 'call', 'wait'
]
ACTIONS2 = [
    'try again',
    'go slowly',
    'speak softly',
    'say clearly',
    'listen carefully',
    'look here',
    'come here',
    'go there',
    'sit down',
    'stand up',
    'open the book',
    'close the door',
    'pick it up',
    'put it down',
    'wash hands',
    'drink water',
    'eat food',
    'take rest',
    'wake up',
    'go outside',
    'come inside',
    'play together',
    'help mother',
    'help father',
    'help a friend',
    'share toys',
    'wait here',
    'follow me',
    'try slowly',
    'say once',
    'say again',
    'read aloud',
    'look at picture',
    'point here',
    'touch this',
    'hold this',
    'count numbers',
    'name colors',
    'tell name',
    'tell story',
    'answer question',
    'ask question',
    'draw picture',
    'write word',
    'say thank you',
    'say sorry',
    'say please',
    'smile again',
    'take turn'
]
PLACES = [
    'home', 'house', 'room', 'school', 'class',
    'park', 'garden', 'playground', 'road', 'street',
    'shop', 'market', 'mall', 'temple', 'mosque',
    'church', 'hospital', 'clinic', 'office', 'bank',
    'bus stop', 'railway station', 'village', 'town', 'city',
    'farm', 'field', 'forest', 'river', 'lake',
    'pond', 'beach', 'hill', 'mountain', 'valley',
    'zoo', 'museum', 'library', 'restaurant', 'hotel',
    'kitchen', 'bathroom', 'bedroom', 'balcony', 'terrace',
    'courtyard', 'neighborhood', 'ground'
]

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

def generate_story_content(topic, length='short', target_language='en'):
    """Generate story content, title, and moral based on topic and length"""
    
    # Try LLM first
    try:
        from routes.llm import get_llm_provider
        provider = get_llm_provider()
        print(f"DEBUG: Generating story for topic '{topic}' using provider: {provider}")
        
        # Now passing target_language
        llm_result = llm.generate_story_text(topic, length, target_language)
        if llm_result:
            print("DEBUG: LLM generation successful")
            # Unpack result (now includes translation_data)
            if len(llm_result) == 5:
                # (title, content, moral, vocab, translation_data)
                return llm_result 
            elif len(llm_result) == 4:
                # Backwards compatibility
                return (*llm_result, None)
            else:
                 return (*llm_result, None) 
        else:
            print("DEBUG: LLM generation returned None (falling back)")
    except Exception as e:
        print(f"DEBUG: LLM Generation failed with error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to templates
    
    # Fallback Logic (English Only)
    topic_lower = topic.lower().strip()
    is_concept = is_abstract_concept(topic)
    
    content = ""
    if is_concept:
        content = generate_concept_story(topic_lower, length)
    else:
        content = generate_character_story(topic_lower, length)
        
    moral = generate_moral(topic)
    title = generate_story_title(topic)
    
    # Fallback returns None for translation_data
    return title, content, moral, {}, None

# ... (keep helper functions like is_abstract_concept, generate_moral, etc.)

@bp.route('/random', methods=['POST'])
def generate_random_story():
    """Generate a random story"""
    try:
        data = request.json or {}
        length = data.get('length', 'short')
        speed = float(data.get('speed', 1.0)) # Speed selection
        target_language = data.get('language', 'en')
        
        # Pick a random topic
        topic = random.choice(RANDOM_TOPICS)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"DEBUG: generate_random_story called. Topic: {topic}, Lang: {target_language}")

        # Generate story (Refactored to get title from tuple)
        title, content, moral, vocab, translation_data = generate_story_content(topic, length, target_language)
        theme = determine_theme(topic)
        
        # Save to database
        import json
        vocab_json = json.dumps(vocab)
        
        # Extract translated fields
        translated_title = None
        if translation_data:
            translated_title = translation_data.get('translated_title')

        with get_db_context() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category, vocab_json, translated_title, target_language, audio_speed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, content, moral, theme, 'easy', theme, vocab_json, translated_title, target_language, speed))
            except sqlite3.OperationalError:
                cursor.execute('''
                    INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category, vocab_json, translated_title, target_language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, content, moral, theme, 'easy', theme, vocab_json, translated_title, target_language))
            story_id = cursor.lastrowid
            
            # Split into sentences
            if translation_data and translation_data.get('sentences'):
                 sentences_data = translation_data.get('sentences')
                 for idx, item in enumerate(sentences_data):
                     eng_text = item.get('text', '')
                     trans_text = item.get('translation', '')
                     cursor.execute('''
                        INSERT INTO story_sentences (story_id, sentence_order, sentence_text, translated_text)
                        VALUES (?, ?, ?, ?)
                    ''', (story_id, idx, eng_text, trans_text))
            else:
                sentences = [s.strip() + '.' for s in content.split('.') if s.strip()]
                for idx, sentence in enumerate(sentences):
                    cursor.execute('''
                        INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                        VALUES (?, ?, ?)
                    ''', (story_id, idx, sentence))
        
        # Build text/sentence lists for background asset generation
        full_text_en = content
        full_text_translated = ""
        sentences_for_images = []
        if translation_data and translation_data.get('sentences'):
            full_text_en = " ".join([s['text'] for s in translation_data['sentences']])
            full_text_translated = " ".join([s['translation'] for s in translation_data['sentences']])
            sentences_for_images = [s['text'] for s in translation_data['sentences']]
        else:
            sentences_for_images = [s.strip() + '.' for s in content.split('.') if s.strip()]

        # Generate all audio and images before returning (no runtime generation)
        try:
            _generate_story_assets(story_id, title, content, full_text_en, full_text_translated,
                                  sentences_for_images, target_language, speed)
        except Exception as e:
            logger.exception("Audio/image generation failed for story %s", story_id)
            # Still return success; story is saved; assets may be missing
            pass

        return jsonify({
            'success': True,
            'story_id': story_id,
            'title': title,
            'vocab': vocab,
            'message': 'Story created! Audio and images are ready.'
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
        speed = float(data.get('speed', 1.0)) # Speed selection
        target_language = data.get('language', 'en') # New field
        
        if not topic:
            return jsonify({
                'success': False,
                'error': 'Topic is required'
            }), 400
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"DEBUG: RAW REQUEST BODY: {data}")
        logger.info(f"DEBUG: generate_topic_story called. Topic: {topic}, Lang: {target_language} (Type: {type(target_language)})")
        
        # Generate story
        # Now returns 5 items
        title, content, moral, vocab, translation_data = generate_story_content(topic, length, target_language)
        theme = determine_theme(topic)
        
        # Save to database
        import json
        vocab_json = json.dumps(vocab)
        
        # Extract translated fields
        translated_title = None
        translated_sentences_map = {} # Order -> text
        
        if translation_data:
            logger.info("DEBUG: Translation data found, processing...")
            translated_title = translation_data.get('translated_title')
            # Create a map for easy lookup by index since order matches
            for idx, item in enumerate(translation_data.get('sentences', [])):
                translated_sentences_map[idx] = item.get('translation', '')
        else:
             logger.info("DEBUG: No translation_data returned from generate_story_content")

        with get_db_context() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category, vocab_json, translated_title, target_language, audio_speed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, content, moral, theme, 'easy', theme, vocab_json, translated_title, target_language, speed))
            except sqlite3.OperationalError:
                cursor.execute('''
                    INSERT INTO stories (title, content, moral, theme, difficulty_level, image_category, vocab_json, translated_title, target_language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, content, moral, theme, 'easy', theme, vocab_json, translated_title, target_language))
            story_id = cursor.lastrowid
            
            # Split into sentences
            # If we have translation_data, use the structured sentenes from it directly to ensure 1:1 mapping
            if translation_data and translation_data.get('sentences'):
                 sentences_data = translation_data.get('sentences')
                 for idx, item in enumerate(sentences_data):
                     eng_text = item.get('text', '')
                     trans_text = item.get('translation', '')
                     cursor.execute('''
                        INSERT INTO story_sentences (story_id, sentence_order, sentence_text, translated_text)
                        VALUES (?, ?, ?, ?)
                    ''', (story_id, idx, eng_text, trans_text))
            else:
                # Fallback purely English
                sentences = [s.strip() + '.' for s in content.split('.') if s.strip()]
                for idx, sentence in enumerate(sentences):
                    cursor.execute('''
                        INSERT INTO story_sentences (story_id, sentence_order, sentence_text)
                        VALUES (?, ?, ?)
                    ''', (story_id, idx, sentence))
        
        # Build text/sentence lists for background asset generation
        full_text_en = content
        full_text_translated = ""
        sentences_for_images = []
        if translation_data and translation_data.get('sentences'):
            full_text_en = " ".join([s['text'] for s in translation_data['sentences']])
            full_text_translated = " ".join([s['translation'] for s in translation_data['sentences']])
            sentences_for_images = [s['text'] for s in translation_data['sentences']]
        else:
            sentences_for_images = [s.strip() + '.' for s in content.split('.') if s.strip()]

        # Generate all audio and images before returning (no runtime generation)
        try:
            _generate_story_assets(story_id, title, content, full_text_en, full_text_translated,
                                  sentences_for_images, target_language, speed)
        except Exception as e:
            logger.exception("Audio/image generation failed for story %s", story_id)
            pass

        return jsonify({
            'success': True,
            'story_id': story_id,
            'title': title,
            'vocab': vocab,
            'message': 'Story created! Audio and images are ready.'
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
    elif any(word in topic_lower for word in ['tree', 'flower', 'sun', 'moon', 'star', 'nature', 'rain', 'cloud', 'sky', 'space']):
        return 'nature'
    elif any(word in topic_lower for word in ['apple', 'banana', 'mango', 'food', 'fruit', 'vegetable', 'cookie', 'cake']):
        return 'food'
    else:
        # Fallback based on content analysis if possible, otherwise general
        return 'general'


