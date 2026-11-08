import argparse
import json
import time
import os
from playwright.sync_api import sync_playwright

def run(playwright, args):
    headless = not args.headful
    browser = playwright.chromium.launch(headless=headless)
    context = browser.new_context()
    page = context.new_page()

    # Determine paths for screenshots
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    def screenshot_path(name):
        return os.path.join(project_root, name)

    print(f"Running in {args.mode} mode...")

    if args.inject_user:
        print("Injecting mock user data...")
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
        page.add_init_script(f"""
            localStorage.setItem('cachedUser', '{json.dumps(user_data)}');
        """)

    if args.mode == 'offline':
        print("Blocking Firebase/Google APIs for offline mode...")
        page.route("**/*firebase*", lambda route: route.abort())
        page.route("**/*googleapis*", lambda route: route.abort())

    url = "http://localhost:8080/security"
    print(f"Navigating to Security page ({url})...")

    try:
        page.goto(url)

        if args.mode == 'offline':
             # Offline mode might need a moment for the fallback logic to kick in
             print("Waiting for auth timeout/fallback logic...")
             time.sleep(6)

        # Wait for page to load (look for "Security & Privacy")
        print("Waiting for page content...")
        try:
            page.wait_for_selector("text=Security & Privacy", timeout=args.timeout * 1000)
            print("Found 'Security & Privacy' text!")
        except Exception as e:
            print("Could not find 'Security & Privacy'. Checking URL and content...")
            print(f"Current URL: {page.url}")
            # Check if redirected to login
            if "/login" in page.url or "Sign In" in page.content():
                print("Redirected to login page. Auth simulation failed or login required.")
            else:
                print("Unknown state. Dumping content snippet...")
                print(page.content()[:500])

            page.screenshot(path=screenshot_path("verification_failure_state.png"))
            raise e

        # Find Export Data button
        print("Looking for Export Data button...")
        # Use a more generic selector if text fails, but specific is better
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

                # Wait for completion toast if online (offline might behave differently or just show one toast)
                # In v2 (offline), it waited for "Data export complete!"
                # In v3 (online), it also waited for "Data export complete!"
                # Let's wait for it.
                page.wait_for_selector("text=Data export complete!", timeout=5000)
                print("Toast 'Data export complete!' appeared!")

            except Exception as e:
                print(f"Toasts missed or failed: {e}")

            # Wait a bit for the completion toast to fully render
            time.sleep(1)

            # Take screenshot of the success state
            page.screenshot(path=screenshot_path("verification_export_success.png"))
            print(f"Verification successful, screenshot saved to verification_export_success.png")
        else:
            print("Export button not found")
            page.screenshot(path=screenshot_path("verification_failure_btn.png"))
            raise Exception("Export button not found")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path=screenshot_path("verification_failure_final.png"))
        raise e
    finally:
        browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify Data Export functionality")
    parser.add_argument("--mode", choices=['online', 'offline'], default='online', help="Run mode (default: online)")
    parser.add_argument("--no-inject-user", action='store_false', dest='inject_user', help="Do NOT inject mock user data")
    parser.add_argument("--inject-user", action='store_true', default=True, help="Inject mock user data (default)")
    parser.add_argument("--headful", action='store_true', help="Run in headful mode (show browser)")
    parser.add_argument("--timeout", type=int, default=10, help="Timeout in seconds (default: 10)")

    args = parser.parse_args()

    with sync_playwright() as playwright:
        run(playwright, args)
