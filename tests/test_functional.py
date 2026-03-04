import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5000"

# 1. Dashboard & Navigation (Home)
def test_tc_db_01_page_load_and_rendering(page: Page):
    """TC_DB_01: Page Load & Rendering"""
    page.goto(BASE_URL)
    
    # Check Welcome Message
    expect(page.locator(".hero-title")).to_contain_text("Welcome")
    
    # Check Daily Mission Progress Bar
    expect(page.locator(".adventure-header")).to_be_visible()
    
    # Check Feature Cards (should be 8 visible feature cards based on HTML structure)
    cards = page.locator(".hero-card")
    expect(cards).to_have_count(8)

def test_tc_db_02_navigation_bar(page: Page):
    """TC_DB_02: Navigation Bar"""
    page.goto(BASE_URL)
    
    # Click Stories
    page.click('.nav-btn[data-page="stories"]')
    expect(page.locator("#stories-page")).to_have_class("page active")
    
    # Click Practice
    page.click('.nav-btn[data-page="practice"]')
    expect(page.locator("#practice-page")).to_have_class("page active")
    
    # Click Quiz
    page.click('.nav-btn[data-page="quiz"]')
    expect(page.locator("#quiz-page")).to_have_class("page active")

# 2. Read Stories
def test_tc_st_01_list_stories(page: Page):
    """TC_ST_01: List Stories"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="stories"]')
    
    # Wait for the stories grid to load
    expect(page.locator(".story-generator")).to_be_visible()
    # At least the grid exists, might be empty or loading
    expect(page.locator("#stories-list")).to_be_visible()

# 3. Practice Speaking
def test_tc_sp_01_practice_page_loads(page: Page):
    """TC_SP_01: Practice Speaking basic render (skipping mic permission for automated test)"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="practice"]')
    
    expect(page.locator("h1")).to_contain_text("Speaking Practice")
    expect(page.locator("#start-practice")).to_be_visible()

# 4. Take Quiz
def test_tc_qz_01_quiz_fetching(page: Page):
    """TC_QZ_01: Quiz Fetching interface"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="quiz"]')
    
    expect(page.locator("h1")).to_contain_text("Quiz Time")
    expect(page.locator("#quiz-story-selection")).to_be_visible()

# 5. Read & Learn ("TinyStories")
def test_tc_rl_01_read_and_learn_interface(page: Page):
    """TC_RL_01: Read & Learn Interface loads successfully"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="tinystories"]')
    
    expect(page.locator("h1")).to_contain_text("Read & Learn")
    expect(page.locator("#ts-topic")).to_be_visible()
    expect(page.locator("#ts-generate-btn")).to_be_visible()

# 6. Vocabulary & Words Gallery
def test_tc_vc_01_vocabulary_gallery(page: Page):
    """TC_VC_01: Vocabulary Gallery Loads"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="vocabulary"]')
    
    expect(page.locator("h1")).to_contain_text("My Word Collection")
    expect(page.locator("#vocab-total-count")).to_be_visible()

# 7. Scramble Game
def test_tc_sc_01_scramble_mode(page: Page):
    """TC_SC_01: Scramble Game modes exist"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="scramble"]')
    
    expect(page.locator("h1")).to_contain_text("Story Builder")
    expect(page.locator(".sp-diff-btn[data-diff='easy']")).to_be_visible()
    expect(page.locator(".sp-diff-btn[data-diff='medium']")).to_be_visible()
    expect(page.locator(".sp-diff-btn[data-diff='hard']")).to_be_visible()

# 8. Chat & Explore
def test_tc_ch_01_chat_interface(page: Page):
    """TC_CH_01: Chat interface renders correctly"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="chat"]')
    
    expect(page.locator("h1")).to_contain_text("Chat with Buddy")
    expect(page.locator("#buddy-input")).to_be_visible()
    expect(page.locator("#buddy-send")).to_be_visible()

# 9. Daily Challenge
def test_tc_dc_01_daily_challenge(page: Page):
    """TC_DC_01: Daily Challenge map/missions render"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="recall"]')
    
    expect(page.locator("h1")).to_contain_text("Daily Adventure")
    missions = page.locator(".mission-card")
    expect(missions).to_have_count(4)

# 10. Achievements
def test_tc_ac_01_achievements_dashboard(page: Page):
    """TC_AC_01: Achievements/Badges Dashboard renders calculations"""
    page.goto(BASE_URL)
    page.click('.nav-btn[data-page="achievements"]')
    
    expect(page.locator("h1")).to_contain_text("My Badges")
    expect(page.locator("#badge-unlocked-count")).to_be_visible()
