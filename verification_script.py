from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto("http://localhost:4173")

    page.wait_for_timeout(2000)
    page.evaluate('''
        localStorage.setItem('firebase:authUser:dummy', '{"uid":"123","email":"test@example.com"}');
    ''')
    page.reload()
    page.wait_for_timeout(2000)

    # Make the viewport smaller to ensure the sidebar collapses if it's responsive
    page.set_viewport_size({"width": 800, "height": 600})
    page.wait_for_timeout(1000)

    # Try to find the nav items and hover over the 2nd one (index 1 if 0-indexed)
    # The sidebar has aria-label="Groups" or we can just find any button with a tooltip
    buttons = page.get_by_role("button").all()
    if len(buttons) > 1:
        # We hover over the 2nd button which might be a sidebar nav item
        buttons[1].hover()
        page.wait_for_timeout(1000)

    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    page.screenshot(path="/home/jules/verification/screenshots/verification2.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()

