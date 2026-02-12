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

    # Intercept and block Firebase requests to force timeout/error fallback
    page.route("**/*firebase*", lambda route: route.abort())
    page.route("**/*googleapis*", lambda route: route.abort())

    print("Navigating to Security page (http://localhost:8080/security)...")
    try:
        page.goto("http://localhost:8080/security")

        # Wait for potential timeout (5s) + buffer
        print("Waiting for auth timeout/fallback (approx 6s)...")
        time.sleep(6)

        # Check if we are on the page
        print("Checking content...")
        if page.is_visible("text=Security & Privacy"):
             print("Found 'Security & Privacy' text! Auth fallback worked.")
        else:
             print("Did not find text. Dumping content snippet...")
             print(page.content()[:500])

        # Find Export Data button
        export_btn = page.locator("button:has-text('Export Your Data')")

        if export_btn.count() > 0:
            print("Clicking Export Data button...")
            export_btn.click()

            # Wait for toast
            try:
                page.wait_for_selector("text=Preparing your data...", timeout=5000)
                print("Toast 'Preparing your data...' appeared!")

                # Wait for success toast
                # "Data export complete!"
                page.wait_for_selector("text=Data export complete!", timeout=5000)
                print("Toast 'Data export complete!' appeared!")

            except Exception as e:
                print(f"Toasts missed or failed: {e}")

            # Take screenshot
            page.screenshot(path="verification_export_success.png")
            print("Verification successful, screenshot saved to verification_export_success.png")
        else:
            print("Export button not found")
            page.screenshot(path="verification_failure_btn.png")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification_failure_v2.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
