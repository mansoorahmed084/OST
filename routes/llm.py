"""
LLM Integration Logic
Handles interaction with Gemini, OpenAI, etc.
"""

import os
from flask import current_app
from database import get_db_context
import logging

logger = logging.getLogger(__name__)

# Global variable to cache the local model in memory
tinystories_pipe = None

def get_tinystories():
    global tinystories_pipe
    if tinystories_pipe is None:
        # Check if we should use Cloud Fallback (recommended for Python 3.14 stability)
        if os.environ.get('USE_CLOUD_TINYSTORIES', 'true').lower() == 'true':
            print("Using Cloud TinyStories (Gemini/OpenAI) for better stability.")
            tinystories_pipe = CloudTinyStories()
            return tinystories_pipe

        try:
            # ONLY attempt local import if Cloud Fallback is disabled
            from transformers import pipeline
            print("Loading TinyStories-33M locally...")
            tinystories_pipe = pipeline("text-generation", model="roneneldan/TinyStories-33M", device="cpu")
            print("TinyStories-33M loaded successfully.")
        except Exception as e:
            print(f"Failed to load local TinyStories: {e}. Falling back to Cloud version.")
            tinystories_pipe = CloudTinyStories()
    return tinystories_pipe

class CloudTinyStories:
    """Mock pipe that uses Cloud LLM but mimics the TinyStories API"""
    def __call__(self, prompt, max_new_tokens=400, **kwargs):
        print(f"CloudTinyStories generating for prompt: {prompt}")
        system_prompt = "You are a TinyStories model. Generate a very simple, short story for a 3-5 year old child. Keep it extremely simple, like the TinyStories dataset (basic vocabulary, simple sentences). Output only the story text, starting with the prompt provided."
        
        # Use existing cloud generation
        story_text = ""
        key = os.environ.get('GOOGLE_API_KEY')
        if key:
            story_text = generate_with_gemini(system_prompt, prompt, key)
        
        if not story_text:
            key = os.environ.get('OPENAI_API_KEY')
            if key:
                story_text = generate_with_openai(system_prompt, prompt, key)
                
        if not story_text:
            story_text = prompt + " The cat was happy. The end."
            
        # Format to match transformers pipeline output
        return [{"generated_text": story_text}]


# OpenAI import handled inside functions

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
    try:
        from google import genai
    except ImportError:
        print("DEBUG: google-genai is not installed.")
        return None
        
    try:    
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"DEBUG: Failed to initialize Gemini Client: {e}")
        return None
    
    # List of models to try in order of preference
    models_to_try = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ]
    
    for model_name in models_to_try:
        try:
            print(f"DEBUG: Attempting generation with model: {model_name}")
            
            # Check if JSON generation is requested based on system prompt content
            config = None
            if "VALID JSON" in system_prompt or "JSON Schema" in system_prompt:
                config = genai.types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
                
            response = client.models.generate_content(
                model=model_name,
                contents=f"{system_prompt}\n\nTask: {user_prompt}",
                config=config
            )
            return response.text
        except Exception as e:
            print(f"DEBUG: Failed with {model_name}: {e}")
            continue
            
    print("DEBUG: All Gemini models failed.")
    return None

def generate_with_openai(system_prompt, user_prompt, api_key):
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return completion.choices[0].message.content
    except ImportError:
        return None
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return None

def generate_with_groq(system_prompt, user_prompt, api_key):
    try:
        import requests
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192", 
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7
        }
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Groq Error: {e}")
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

    # Detect mismatch: TinyStories can't do translated text properly
    if provider == 'tinystories' and target_language and target_language != 'en':
        print("TinyStories requested but doesn't support bilingual. Falling back to Gemini.")
        provider = 'gemini' 

    # Determine if we should use Local TinyStories
    use_local_tinystories = (provider == 'tinystories')
    local_pipe = get_tinystories() if use_local_tinystories else None

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
    
    # Try Local TinyStories for English first
    if local_pipe and use_local_tinystories:
        try:
            print(f"DEBUG: Generating English story using Local TinyStories-33M...")
            
            # TinyStories works best completing a sentence
            prompt = f"Once upon a time, there was a {topic}."
            
            # The length setting shouldn't cut off TinyStories mid-sentence
            # Set a high enough max tokens to let the model generate the full story naturally
            max_new_tokens = 400 
            
            result = local_pipe(prompt, max_new_tokens=max_new_tokens, do_sample=True, temperature=0.7, repetition_penalty=1.1)
            generated_text = result[0]['generated_text']
            
            print(f"DEBUG: Local TinyStories generation successful.")
            
            # Format output specifically for TinyStories as it doesn't do JSON/Labels
            title = f"The Story of the {topic.title()}"
            content = generated_text.strip()
            
            # Query the LLM to generate the moral and vocab
            metadata = extract_metadata_and_questions(content, provider='tinystories')
            if metadata:
                moral = metadata.get('moral', 'Always be kind and good.')
                # Vocab is returned as a list of dicts, format into dict to match signature
                vocab_list = metadata.get('vocab', [])
                vocab = {v.get('word', ''): v.get('meaning', '') for v in vocab_list if v.get('word')}
            else:
                moral = "Always be kind and good."
                vocab = {}
            
            return title, content, moral, vocab, None
            
        except Exception as e:
            print(f"Local TinyStories generation failed: {e}. Falling back to Cloud LLM...")
            # Fall through to Cloud LLM
    
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
    elif provider == 'groq':
        key = os.environ.get('GROQ_API_KEY')
        if key:
            response_text = generate_with_groq(system_prompt, user_prompt, key)
            
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

def extract_metadata_and_questions(story_text, provider=None):
    if not provider: provider = get_llm_provider()

    system_prompt = """
    You are an AI teacher helping a young kid named Omar understand stories.
    Given the story text (which was generated by a small local AI and might lose context or have logic errors), extract the following and ONLY output VALID JSON:
    1. "corrected_story": Read the story, fix any illogical or lost context, ensure the grammar is perfect, and output the polished version of the story. Keep it the same length.
    2. A single sentence explaining the "moral" of the story.
    3. "vocab": An array of 3-5 important words and their simple dictionary meanings formatted like {"word": "...", "meaning": "..."}.
    
    CRITICAL INSTRUCTION - DO NOT RETURN EMPTY ARRAYS:
    Even if the story is extremely short (e.g. 2 sentences), you MUST generate the following questions. If the text lacks details, creatively invent reasonable questions or use general reading-comprehension context derived from the nouns.
    4. "mcqs": MUST returning an array of AT LEAST 2 multiple-choice questions formatted like {"question": "...", "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"], "correct_answer": "Choice 1"}.
    5. "fill_in_blanks": MUST return an array of AT LEAST 2 fill-in-the-blank questions formatted like {"sentence": "The dog was very ____.", "answer": "happy", "options": ["sad", "happy", "angry"]}.
    6. "moral_questions": MUST return an array of AT LEAST 1 question testing the moral understanding formatted like {"question": "...", "options": ["Option 1", "Option 2"], "correct_answer": "Option 1"}.

    JSON Schema exactly like this:
    {
        "corrected_story": "...",
        "moral": "...",
        "vocab": [{"word": "...", "meaning": "..."}],
        "mcqs": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "A"}],
        "fill_in_blanks": [{"sentence": "...", "answer": "...", "options": ["..."]}],
        "moral_questions": [{"question": "...", "options": ["A", "B"], "correct_answer": "A"}]
    }
    """
    user_prompt = f"Story: {story_text}"

    response_text = None

    # Fallback to a cloud LLM for metadata extraction if local is selected
    if provider in ['tinystories', 'default']:
        if os.environ.get('GOOGLE_API_KEY'): provider = 'gemini'
        elif os.environ.get('GROQ_API_KEY'): provider = 'groq'
        elif os.environ.get('OPENAI_API_KEY'): provider = 'openai'

    if provider == 'gemini':
        key = os.environ.get('GOOGLE_API_KEY')
        if key: response_text = generate_with_gemini(system_prompt, user_prompt, key)
    elif provider == 'openai':
        key = os.environ.get('OPENAI_API_KEY')
        if key: response_text = generate_with_openai(system_prompt, user_prompt, key)
    elif provider == 'groq':
        key = os.environ.get('GROQ_API_KEY')
        if key: response_text = generate_with_groq(system_prompt, user_prompt, key)

    if response_text:
        try:
            import json
            clean_text = response_text.strip()
            start_idx = clean_text.find('{')
            end_idx = clean_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                clean_text = clean_text[start_idx:end_idx+1]
            return json.loads(clean_text)
        except Exception as e:
            print(f"Failed to parse extract_metadata json: {e}")
            return None
    return None
