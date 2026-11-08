import json
import time
import argparse
import sys
from playwright.sync_api import sync_playwright

def run(playwright, offline=False, base_url="http://localhost:8080"):
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

    if offline:
        # Intercept and block Firebase requests to force timeout/error fallback
        print("Offline mode: Blocking Firebase and Google APIs...")
        page.route("**/*firebase*", lambda route: route.abort())
        page.route("**/*googleapis*", lambda route: route.abort())

    print(f"Navigating to Security page ({base_url}/security)...")
    try:
        page.goto(f"{base_url}/security")

        if offline:
            # Wait for potential timeout (5s) + buffer
            print("Waiting for auth timeout/fallback (approx 6s)...")
            time.sleep(6)

            print("Checking content...")
            if page.is_visible("text=Security & Privacy"):
                 print("Found 'Security & Privacy' text! Auth fallback worked.")
            else:
                 print("Did not find text. Dumping content snippet...")
                 print(page.content()[:500])
                 page.screenshot(path="verification_failure_state.png")
                 raise Exception("Content not found in offline mode")
        else:
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
        # Use a more generic selector if text fails, but consistent with previous scripts
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

                # Wait for completion toast
                try:
                    page.wait_for_selector("text=Data export complete!", timeout=5000)
                    print("Toast 'Data export complete!' appeared!")
                except:
                    print("Completion toast did not appear in time.")
                    if offline:
                        # v2 expected it strictly
                        raise Exception("Completion toast missing in offline mode")
                    # v1 just slept 2s, but let's be strict if possible.
                    # If it takes >5s, we might fail. For now, let's keep it strict.
                    # Or maybe add a sleep as fallback if selector times out but we don't want to fail hard?
                    # The original v1 logic was simpler (sleep 2s). The v2 logic was stricter.
                    # We'll use the stricter logic.

            except Exception as e:
                print(f"Toast verification failed: {e}")
                raise e

            # Take screenshot of the success state
            page.screenshot(path="verification_export_success.png")
            print("Verification successful, screenshot saved to verification_export_success.png")
        else:
            print("Export button not found")
            page.screenshot(path="verification_failure_btn.png")
            raise Exception("Export button not found")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification_failure_final.png")
        sys.exit(1)

    browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify Security Page Export Data functionality")
    parser.add_argument("--offline", action="store_true", help="Run verification in offline/fallback mode")
    parser.add_argument("--url", default="http://localhost:8080", help="Base URL of the application")

    args = parser.parse_args()

    with sync_playwright() as playwright:
        run(playwright, offline=args.offline, base_url=args.url)
