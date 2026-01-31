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

def generate_story_text(topic, length='short'):
    """
    Generate story text using configured provider.
    Returns (content, moral) tuple or None if default provider should be used.
    """
    provider = get_llm_provider()
    tone = get_story_tone()
    
    if provider == 'default':
        return None

    # Construct Prompt
    word_count = "50-60" if length == 'short' else "100-120" if length == 'medium' else "150-180"
    
    tone_instruction = ""
    if tone == 'happy': tone_instruction = "Make it very cheerful and exciting!"
    elif tone == 'calm': tone_instruction = "Make it soothing and gentle."
    elif tone == 'funny': tone_instruction = "Make it silly and humorous."
    
    system_prompt = f"""You are a specialized therapist-storyteller for a 4-year-old child named Omar who is working on speech, vocabulary, and comprehension.
    
    CRITICAL RULES:
    1. Single Character Focus: The story must focus on ONE main character (e.g., a bear, a boy, a car) doing clear actions.
    2. Simple Grammar: Use short Subject-Verb-Object sentences (e.g., "The cat sees the ball." "The cat runs.").
    3. Action Oriented: Focus on concrete actions (run, jump, eat, sleep) and descriptive words (colors, sizes).
    4. Repetition: Repeat key vocabulary words 2-3 times naturally.
    5. No Metaphors: Avoid abstract concepts or idioms. Keep it literal and concrete.
    
    Format the output as:
    TITLE: [Simple Literal Title]
    CONTENT: [The story paragraphs]
    MORAL: [A very simple takeaway]
    
    {tone_instruction}
    Target word count: {word_count} words.
    """
    
    user_prompt = f"Write a story about: {topic}"
    
    response_text = None
    
    if provider == 'gemini':
        key = os.environ.get('GOOGLE_API_KEY')
        if key: 
            print("Using Google API Key: Present")
            try:
                # Direct call to the function which now uses the correct model
                response_text = generate_with_gemini(system_prompt, user_prompt, key)
            except Exception as e:
                print(f"Gemini generation failed: {e}")
        else:
            print("Using Google API Key: Missing")
            
    elif provider == 'openai':
        key = os.environ.get('OPENAI_API_KEY')
        if key:
            print("Using OpenAI API Key: Present")
            response_text = generate_with_openai(system_prompt, user_prompt, key)
        else:
            print("Using OpenAI API Key: Missing")
            
    if response_text:
        # Parse logic
        try:
            lines = response_text.split('\n')
            title = "A Story for Omar"
            content_parts = []
            moral = "Be good and kind."
            
            section = None
            for line in lines:
                line = line.strip()
                if not line: continue
                
                if line.startswith("TITLE:"):
                    title = line.replace("TITLE:", "").strip()
                    section = 'content' # Start looking for content next
                elif line.startswith("CONTENT:"):
                    section = 'content'
                elif line.startswith("MORAL:"):
                    moral = line.replace("MORAL:", "").strip()
                    section = 'moral'
                else:
                    if section == 'content':
                        content_parts.append(line)
            
            content = "\n\n".join(content_parts)
            return title, content, moral
        except Exception as e:
            print(f"Parsing Error: {e}")
            return None # Fallback to default if parsing fails
            
    return None
