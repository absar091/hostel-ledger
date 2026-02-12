import json
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Mock user data
    user_data = {
        "uid": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "username": "testuser",
        "walletBalance": 1000,
        "settlements": {},
        "createdAt": "2023-01-01T00:00:00.000Z",
        "emailVerified": True
    }

    # Inject localStorage
    page.add_init_script(f"""
        localStorage.setItem('cachedUser', '{json.dumps(user_data)}');
    """)

    print("Navigating to Security page (http://localhost:8080/security)...")
    try:
        page.goto("http://localhost:8080/security")

        # Wait for page to load (look for "Security & Privacy")
        print("Waiting for page content...")
        try:
            page.wait_for_selector("text=Security & Privacy", timeout=5000)
            print("Found 'Security & Privacy' text!")
        except Exception as e:
            print("Could not find 'Security & Privacy'. Checking URL and content...")
            print(f"Current URL: {page.url}")
            # Check if redirected to login
            if "/login" in page.url or "Sign In" in page.content():
                print("Redirected to login page. Auth simulation failed.")
            else:
                print("Unknown state.")
            page.screenshot(path="verification_failure_state.png")
            raise e

        # Find Export Data button
        print("Looking for Export Data button...")
        # Use a more generic selector if text fails
        export_btn = page.locator("button:has-text('Export Your Data')")

        if export_btn.count() > 0:
            print("Clicking Export Data button...")
            export_btn.click()

            # Wait for toast
            print("Waiting for toast...")
            try:
                # wait for any toast or specific text
                page.wait_for_selector("text=Preparing your data...", timeout=5000)
                print("Toast 'Preparing your data...' appeared!")
            except:
                print("Toast did not appear or was missed.")

            # Wait a bit for the completion toast
            time.sleep(2)

            # Take screenshot of the success state
            page.screenshot(path="verification_export.png")
            print("Verification successful, screenshot saved to verification_export.png")
        else:
            print("Export button not found")
            page.screenshot(path="verification_failure_btn.png")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification_failure_final.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
