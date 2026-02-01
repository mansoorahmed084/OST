"""
LLM Integration Logic
Handles interaction with Gemini, OpenAI, etc.
"""

import os
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai
from flask import current_app
from database import get_db_context
import logging

logger = logging.getLogger(__name__)

# OpenAI import handled conditionally to avoid errors if not installed (though we installed it)
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

def get_llm_provider():
    """Get current LLM provider from settings"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key='llm_provider'")
            result = cursor.fetchone()
            return result[0] if result else 'default'
    except Exception as e:
        print(f"Error getting LLM provider: {e}")
        return 'default'

def get_story_tone():
    """Get story tone from settings"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key='story_tone'")
            result = cursor.fetchone()
            return result[0] if result else 'default'
    except:
        return 'default'

def generate_with_gemini(system_prompt, user_prompt, api_key):
    genai.configure(api_key=api_key)
    
    # List of models to try in order of preference (Faster/Cheaper -> More Advanced)
    models_to_try = [
        'gemini-2.5-flash', # New model available
        'gemini-2.0-flash',
        'gemini-3-pro-preview'
    ]
    
    for model_name in models_to_try:
        try:
            print(f"DEBUG: Attempting generation with model: {model_name}")
            model = genai.GenerativeModel(model_name) 
            response = model.generate_content(f"{system_prompt}\n\nTask: {user_prompt}")
            return response.text
        except Exception as e:
            print(f"DEBUG: Failed with {model_name}: {e}")
            continue
            
    print("DEBUG: All Gemini models failed.")
    return None

def generate_with_openai(system_prompt, user_prompt, api_key):
    try:
        if not OpenAI: return None
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return None

def generate_story_text(topic, length='short', target_language='en'):
    """
    Generate story text using configured provider.
    Returns (title, content, moral, vocab, translation_data) or None.
    translation_data is a dict or None if english only.
    """
    provider = get_llm_provider()
    tone = get_story_tone()
    
    if provider == 'default':
        return None

    # Construct Prompt
    word_count = "50-60" if length == 'short' else "100-120" if length == 'medium' else "150-180"

    tone_instruction = ""
    if tone == 'happy':
        tone_instruction = "Make the story warm, cheerful, and pleasant."
    elif tone == 'calm':
        tone_instruction = "Make the story slow, gentle, and peaceful."
    elif tone == 'funny':
        tone_instruction = "Make the story light, playful, and softly funny."

    # Bilingual Mode
    if target_language and target_language != 'en':
        system_prompt = f"""
        You are a gentle children's story writer.
        Write a simple story for a child named Omar about: {topic}.
        Tone: {tone_instruction}
        Target Length: {word_count} words.
        
        CRITICAL: 
        1. The story must be simple, safe, and flowing naturally.
        2. You MUST output strictly VALID JSON.
        3. Translate the story into {target_language}.
        4. Use Character names from Indian origin and places example Raheem, Asif, Tajmahal, New Delhi, Bangalore, Hyderabad but simple ones.
        
        Output JSON Schema:
        {{
            "title": "English Title",
            "translated_title": "{target_language} Title",
            "sentences": [
                {{ "text": "English sentence 1.", "translation": "{target_language} translation." }},
                {{ "text": "English sentence 2.", "translation": "{target_language} translation." }}
            ],
            "vocab": {{ "word": "simple definition" }},
            "moral": "English moral",
            "translated_moral": "{target_language} moral"
        }}
        """
        user_prompt = f"Write a bilingual story about {topic} in English and {target_language}."
        
    else:
        # Standard English Mode (Legacy Text format or JSON? Let's stick to Text for now to minimize variance, or maybe JSON is safer?)
        # Let's keep the Text prompt for English to avoid breaking the specific "style" instructions I fine-tuned before?
        # Actually, the user liked the previous style. I should try to preserve it.
        # But JSON is so much easier to parse.
        # Let's keep the OLD prompt for English-only to be safe for now, as I don't want to change the 'feel' of English stories unnecessarily.
        system_prompt = f"""
    You are a gentle children's story writer creating stories for a young child named Omar.
    Your goal is to help him enjoy listening, remember sequences, and feel comfortable with language.

    STORY GUIDELINES (PRIORITY: NATURAL FLOW):

    1. Story Flow Comes First:
    - The story must feel like a real children's storybook. But choose simple words.
    - Events should flow smoothly from one to the next.
    - Avoid listing actions one by one.
    - Use cause and continuity (one thing leads to the next).

    2. Main Character Rule:
    - Focus on ONE main character.
    - Introduce the character clearly at the beginning.
    - You may repeat the name occasionally if it helps flow.
    - Do NOT overuse the name or pronouns.

    3. Sentence Style:
    - Use short and medium-length sentences.
    - It is okay to gently join ideas.
        Examples:
        - "Rohan goes to the park and sees the swings."
        - "He sits down and starts to swing slowly."

    4. Simple Language:
    - Use easy, familiar words.
    - Avoid abstract ideas, lessons, or deep emotions.
    - Feelings should be simple (happy, calm, nice).

    5. Natural Repetition:
    - Repeat important words softly and naturally.
    - Do NOT repeat the same sentence structure again and again.
    - Repetition should feel comforting, not mechanical.

    6. Descriptions:
    - Add small, gentle descriptions (colors, weather, sounds).
    - Keep them concrete and visible.
        Example:
        - red swing, green trees, cool air

    7. Emotional Safety:
    - The story must feel safe, calm, and positive.
    - No danger, fear, or conflict.

    8. Ending Style:
    - End the story gently.
    - The character should finish an activity and return home or rest.
    - The ending should feel complete and peaceful.

    FORMAT THE OUTPUT EXACTLY AS:

    TITLE: [Simple, story-like title]
    CONTENT:
    [2–4 short paragraphs.
    Each paragraph should have 2–4 sentences.
    The story should read smoothly when spoken aloud.]
    VOCAB:
    - [Word 1]: [Very simple definition]
    - [Word 2]: [Very simple definition]
    MORAL:
    [One very simple, natural sentence.]

    {tone_instruction}
    Target word count: {word_count} words.
    """
        user_prompt = f"Write a story about: {topic}"
    
    response_text = None
    
    if provider == 'gemini':
        key = os.environ.get('GOOGLE_API_KEY')
        if key: 
            try:
                # Add JSON constraint for bilingual
                if target_language and target_language != 'en':
                    # Temporary configure for JSON?
                    # `generate_with_gemini` treats it as text. 
                    # We can instruct it in prompt (already did).
                    pass
                response_text = generate_with_gemini(system_prompt, user_prompt, key)
            except Exception as e:
                print(f"Gemini generation failed: {e}")
            
    elif provider == 'openai':
        key = os.environ.get('OPENAI_API_KEY')
        if key:
            response_text = generate_with_openai(system_prompt, user_prompt, key)
            
    if response_text:
        # Bilingual JSON Parsing
        if target_language and target_language != 'en':
            try:
                import json
                print(f"DEBUG: Parsing Bilingual JSON for {target_language}...")
                
                # Robust JSON extraction
                clean_text = response_text.strip()
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}')
                
                if start_idx != -1 and end_idx != -1:
                    clean_text = clean_text[start_idx:end_idx+1]
                else:
                    print("DEBUG: No JSON braces found in response")
                    # Fallback to simple markdown cleanup just in case
                    clean_text = response_text.replace('```json', '').replace('```', '').strip()

                data = json.loads(clean_text)
                
                title = data.get('title', 'A Story')
                translated_title = data.get('translated_title', '')
                
                # Reconstruct content from sentences to ensure sync
                sentences_list = data.get('sentences', [])
                full_content = " ".join([s['text'] for s in sentences_list])
                
                moral = data.get('moral', '')
                translated_moral = data.get('translated_moral', '')
                vocab = data.get('vocab', {})
                
                translation_data = {
                    'translated_title': translated_title,
                    'translated_moral': translated_moral,
                    'sentences': sentences_list # List of {text, translation}
                }
                
                logger.info(f"DEBUG: JSON Parsing Successful. Title: {title}")
                return title, full_content, moral, vocab, translation_data
                
            except Exception as e:
                logger.error(f"JSON Parsing Error for Bilingual: {e}")
                logger.error(f"Raw response was: {response_text}")
                return None

        # Text Parsing (Legacy)
        try:
            logger.info("DEBUG: Parsing Standard Text Response...")
            lines = response_text.split('\n')
            title = "A Story for Omar"
            content_parts = []
            vocab = {}
            moral = "Be good and kind."
            
            section = None
            for line in lines:
                line = line.strip()
                if not line: continue
                
                if line.startswith("TITLE:"):
                    title = line.replace("TITLE:", "").strip()
                    section = 'content' 
                elif line.startswith("CONTENT:"):
                    section = 'content'
                elif line.startswith("VOCAB:"):
                    section = 'vocab'
                elif line.startswith("MORAL:"):
                    potential_moral = line.replace("MORAL:", "").strip()
                    if potential_moral:
                        moral = potential_moral
                    else:
                        moral = "" 
                    section = 'moral'
                else:
                    if section == 'content':
                        content_parts.append(line)
                    elif section == 'vocab':
                        if ':' in line:
                            parts = line.split(':', 1)
                            key = parts[0].strip().lstrip('- ').strip()
                            val = parts[1].strip()
                            vocab[key] = val
                    elif section == 'moral':
                        if moral:
                            moral += " " + line
                        else:
                            moral = line
            
            content = "\n\n".join(content_parts)
            if not moral: moral = "Be good and kind."
            
            return title, content, moral, vocab, None
            
        except Exception as e:
            print(f"Parsing Error: {e}")
            return None 
            
    return None
