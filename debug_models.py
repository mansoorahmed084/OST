
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    # Try reading from file as well, just in case
    try:
        with open('c:/temp/secret_keys.txt', 'r') as f:
            for line in f:
                if 'GOOGLE_API_KEY' in line:
                    api_key = line.split('=')[1].strip()
    except:
        pass

if not api_key:
    print("No API Key found")
    exit()

print(f"Using Key: {api_key[:5]}...")
genai.configure(api_key=api_key)

print("\n--- Available Models ---")
for m in genai.list_models():
    print(f"Name: {m.name}")
    print(f"Supported methods: {m.supported_generation_methods}")
    print("-" * 20)
