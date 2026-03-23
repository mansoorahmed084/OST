from firecrawl import FirecrawlApp
import os
from dotenv import load_dotenv

load_dotenv()

# Take key from env or use the specific one mentioned
api_key = os.getenv("FIRECRAWL_API_KEY") or "fc-a7b5e42edbd8464ea3be0a78d546f883"
app = FirecrawlApp(api_key=api_key)

url = 'https://cognitivebotics.com/app/parent-dashboard/child-reports'
print(f"Scraping {url}...")

# Scrape a URL
params = {
    'formats': ['markdown'],
}

try:
    scrape_result = app.scrape(url, params=params)
    print("Scrape successful!")
    
    # Save to file
    with open('scraped_dashboard.md', 'w', encoding='utf-8') as f:
        f.write(scrape_result.get('markdown', 'No markdown content returned.'))
        
    print("Content saved to scraped_dashboard.md")
except Exception as e:
    print(f"Scrape failed: {e}")
