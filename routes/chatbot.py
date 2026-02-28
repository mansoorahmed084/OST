"""
Chatbot API Routes
Personalized AI Companion using LangChain
"""

from flask import Blueprint, jsonify, request
from database import get_db_context
import os
import json
import logging
# LangChain imports handled inside functions

logger = logging.getLogger(__name__)
bp = Blueprint('chatbot', __name__)

# System Prompt for Buddy
# We use a custom template to ensure Buddy matches the persona
BUDDY_TEMPLATE = """You are Buddy, Omar's friendly AI companion. 
Omar is a young child (around 5 years old) who is learning to speak and read.
Your goal is to talk to him in short, simple, and encouraging sentences.
Be patient, safe, and supportive. Use gentle language.
If Omar says something nice, give him a virtual high-five or a star!

Current conversation context:
{history}

Omar: {input}
Buddy:"""

# Memory Cache (in-memory for current process)
# We'll also persist to DB to survive restarts
_memory_cache = {}

def get_llm():
    """Get LLM based on settings, preferring Gemini if available to avoid quota issues"""
    provider = 'gemini' # Default to Gemini
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key='llm_provider'")
            row = cursor.fetchone()
            if row:
                provider = row[0]
    except:
        pass

    # If Gemini is requested and we have the key, use it
    if provider == 'gemini' and os.environ.get('GOOGLE_API_KEY'):
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.environ.get('GOOGLE_API_KEY'),
            temperature=0.7
        )
    
    # If OpenAI is requested or fallback
    if os.environ.get('OPENAI_API_KEY'):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="gpt-4o-mini",
            openai_api_key=os.environ.get('OPENAI_API_KEY'),
            temperature=0.7
        )
    
    # Final fallback to Gemini if OpenAI key missing but Gemini key exists
    if os.environ.get('GOOGLE_API_KEY'):
         from langchain_google_genai import ChatGoogleGenerativeAI
         return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.environ.get('GOOGLE_API_KEY'),
            temperature=0.7
        )

    return None

def get_buddy_memory(session_id, llm):
    """Get or create memory for a session"""
    if session_id not in _memory_cache:
        try:
            from langchain.memory import ConversationSummaryBufferMemory
        except ImportError:
            from langchain_classic.memory import ConversationSummaryBufferMemory
            
        # max_token_limit=1024 as requested for summarization threshold
        memory = ConversationSummaryBufferMemory(
            llm=llm,
            max_token_limit=1024,
            memory_key="history",
            return_messages=False
        )
        
        # Load summary from DB
        try:
            with get_db_context() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT summary FROM chatbot_memory_state WHERE session_id = ?", (session_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    memory.moving_summary_buffer = row[0]
                
                # Load some recent messages to pre-populate buffer
                cursor.execute("SELECT role, content FROM chatbot_messages WHERE session_id = ? ORDER BY id DESC LIMIT 5", (session_id,))
                msgs = cursor.fetchall()
                # They are in DESC order, reverse for memory
                for m in reversed(msgs):
                    if m['role'] == 'user':
                        memory.chat_memory.add_user_message(m['content'])
                    else:
                        memory.chat_memory.add_ai_message(m['content'])
        except Exception as e:
            logger.error(f"Error loading memory from DB: {e}")
            
        _memory_cache[session_id] = memory
        
    return _memory_cache[session_id]

@bp.route('/ask', methods=['POST'])
def ask():
    """Send a message to Buddy"""
    try:
        data = request.json or {}
        user_input = data.get('message', '').strip()
        session_id = data.get('session_id', 'omar_default')

        if not user_input:
            return jsonify({"success": False, "error": "Message is required"}), 400

        llm = get_llm()
        memory = get_buddy_memory(session_id, llm)
        
        try:
            from langchain.chains import ConversationChain
            from langchain.prompts import PromptTemplate
        except ImportError:
            from langchain_classic.chains import ConversationChain
            from langchain_core.prompts import PromptTemplate
            
        prompt = PromptTemplate(
            input_variables=["history", "input"],
            template=BUDDY_TEMPLATE
        )
        
        conversation = ConversationChain(
            llm=llm,
            memory=memory,
            prompt=prompt,
            verbose=True
        )

        # Generate Response
        try:
            buddy_response = conversation.predict(input=user_input)
        except Exception as e:
            # Automatic fallback to Gemini if OpenAI fails (likely quota)
            if "insufficient_quota" in str(e) or "429" in str(e):
                logger.warning("OpenAI quota hit, falling back to Gemini for this message...")
                from langchain_google_genai import ChatGoogleGenerativeAI
                fallback_llm = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=os.environ.get('GOOGLE_API_KEY'),
                    temperature=0.7
                )
                conversation.llm = fallback_llm
                buddy_response = conversation.predict(input=user_input)
            else:
                raise e

        # Persist to DB
        try:
            with get_db_context() as conn:
                cursor = conn.cursor()
                # Save Messages
                cursor.execute("INSERT INTO chatbot_messages (session_id, role, content) VALUES (?, ?, ?)", (session_id, 'user', user_input))
                cursor.execute("INSERT INTO chatbot_messages (session_id, role, content) VALUES (?, ?, ?)", (session_id, 'buddy', buddy_response))
                
                # Save Summary (LangChain updates this automatically in memory)
                summary = memory.moving_summary_buffer
                cursor.execute("INSERT OR REPLACE INTO chatbot_memory_state (session_id, summary, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (session_id, summary))
        except Exception as e:
            logger.error(f"Error persisting chat to DB: {e}")

        return jsonify({
            "success": True,
            "response": buddy_response,
            "has_summary": bool(memory.moving_summary_buffer)
        })

    except Exception as e:
        logger.error(f"Chatbot Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/history', methods=['GET'])
def get_history():
    """Get chat history for UI"""
    session_id = request.args.get('session_id', 'omar_default')
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT role, content, created_at FROM chatbot_messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
            messages = [dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "messages": messages})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/reset', methods=['POST'])
def reset_chat():
    """Reset the conversation"""
    session_id = request.json.get('session_id', 'omar_default')
    try:
        if session_id in _memory_cache:
            del _memory_cache[session_id]
            
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chatbot_messages WHERE session_id = ?", (session_id,))
            cursor.execute("DELETE FROM chatbot_memory_state WHERE session_id = ?", (session_id,))
            
        return jsonify({"success": True, "message": "Conversation reset"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
