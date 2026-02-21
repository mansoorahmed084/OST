import os
import requests
from dotenv import load_dotenv

# Load environment variables (for HF_TOKEN)
load_dotenv()

def test_tinystories():
    print("--- Testing TinyStories-33M ---")
    try:
        from transformers import pipeline
        import torch
        print("Loading TinyStories-33M model. This might take a few seconds...")
        # Load local model
        pipe = pipeline("text-generation", model="roneneldan/TinyStories-33M", torch_dtype=torch.float16)
        
        prompt = "Once upon a time, there was a brave little mouse."
        print(f"Generating story for prompt: '{prompt}'")
        result = pipe(prompt, max_new_tokens=100, do_sample=True, temperature=0.7, repetition_penalty=1.1)
        generated_text = result[0]['generated_text']
        
        print("\nGenerated Story:")
        print("-" * 40)
        print(generated_text)
        print("-" * 40)
        print("✅ TinyStories generation successful!\n")
        return prompt # return prompt for image generation
        
    except Exception as e:
        print(f"❌ TinyStories failed: {e}\n")
        return None

def test_hf_image(prompt):
    print("--- Testing Hugging Face Image Generation (FLUX.1-schnell) ---")
    hf_token = os.environ.get('HF_TOKEN', '') or os.environ.get('HUGGINGFACE_API_KEY', '')
    
    if not hf_token:
        print("❌ HF_TOKEN not found in environment variables. Cannot test image generation.")
        return

    api_url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    headers = {
        "Authorization": f"Bearer {hf_token}"
    }
    
    # We use a focused prompt for the illustration model
    full_prompt = f"Children's story book illustration, gentle, colorful, simple: {prompt}"
    print(f"Sending request to Hugging Face API with prompt: '{full_prompt}'...")
    
    try:
        response = requests.post(api_url, headers=headers, json={"inputs": full_prompt})
        
        if response.status_code == 200:
            output_path = "test_hf_kids_illustration.png"
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print(f"✅ Image successfully generated and saved to: {output_path}")
        else:
            print(f"❌ API Error {response.status_code}: {response.text}")
            if 'is currently loading' in response.text:
                 print("💡 Note: The model is cold-starting. Wait a minute and run the test again.")
    except Exception as e:
        print(f"❌ Exception during image generation: {e}")

if __name__ == "__main__":
    print("Starting Integration Test...\n")
    topic_prompt = test_tinystories()
    if topic_prompt:
        test_hf_image(topic_prompt)
    print("\nTest Script Finished.")
