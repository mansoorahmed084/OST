"""
OST - Omar's Speech Teacher
Main Flask Application
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from database import init_db, get_db
from routes import stories, speech, quiz, chatmode, generator

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

# Initialize database
init_db()

# Register blueprints
app.register_blueprint(stories.bp, url_prefix='/api/stories')
app.register_blueprint(speech.bp, url_prefix='/api/speech')
app.register_blueprint(quiz.bp, url_prefix='/api/quiz')
app.register_blueprint(chatmode.bp, url_prefix='/api/chatmode')
app.register_blueprint(generator.bp, url_prefix='/api/generator')

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
    app.run(host='0.0.0.0', port=port, debug=True)
