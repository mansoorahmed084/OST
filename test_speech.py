import requests
import json
import sys

URL = "http://127.0.0.1:5000"

def test_speech(story_id):
    print(f"Testing speech for Story ID: {story_id}")
    try:
        url = f"{URL}/api/speech/story/{story_id}"
        print(f"POST {url}")
        
        # Test Normal Speed
        payload = {"speed": 1.0}
        resp = requests.post(url, json=payload)
        
        print(f"Status Code: {resp.status_code}")
        try:
            print(f"Response: {resp.json()}")
        except:
            print(f"Raw Response: {resp.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        story_id = sys.argv[1]
    else:
        # Default to latest if not provided (just a guess, user can provide)
        print("Please provide a story ID to test. Usage: python test_speech.py <story_id>")
        sys.exit(1)
        
    test_speech(story_id)
