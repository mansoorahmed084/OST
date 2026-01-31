import google.generativeai as genai
import os

# Load env manually since we are running standalone
with open('c:/temp/secret_keys.txt') as f:
    for line in f:
        if 'GOOGLE_API_KEY' in line:
            key = line.split('=')[1].strip()
            os.environ['GOOGLE_API_KEY'] = key
            print("Loaded Google Key")

genai.configure(api_key=os.environ['GOOGLE_API_KEY'])

print("Listing models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
