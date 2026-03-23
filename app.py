"""
OST - Omar's Speech Teacher
Main Flask Application
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from database import init_db
import logging

# Configure Logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ost_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

# Initialize database
init_db()

# Import and Register blueprints
from routes import stories, speech, quiz, chatmode, generator, recall, settings, images, tinystories, chatbot, achievements, dashboard

app.register_blueprint(stories.bp, url_prefix='/api/stories')
app.register_blueprint(speech.bp, url_prefix='/api/speech')
app.register_blueprint(quiz.bp, url_prefix='/api/quiz')
app.register_blueprint(chatmode.bp, url_prefix='/api/chatmode')
app.register_blueprint(generator.bp, url_prefix='/api/generator')
app.register_blueprint(recall.bp, url_prefix='/api/recall')
app.register_blueprint(settings.bp, url_prefix='/api/settings')
app.register_blueprint(images.bp, url_prefix='/api/images')
app.register_blueprint(tinystories.bp, url_prefix='/api/tinystories')
app.register_blueprint(chatbot.bp, url_prefix='/api/chatbot')
app.register_blueprint(achievements.bp, url_prefix='/api/achievements')
app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'OST is running!'
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    # Disable debug to ensure it doesn't hang on restart in this environment
    logger.info(f"Starting OST on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
