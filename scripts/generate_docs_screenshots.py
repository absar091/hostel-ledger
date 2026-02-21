import subprocess
import time
import os
import signal
from playwright.sync_api import sync_playwright

def generate_screenshots():
    # Start the dev server
    print("Starting dev server...")
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid  # Allow killing the process group later
    )

    # Wait for server to start (simple sleep for now, could be smarter)
    time.sleep(10)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Screenshot Login Page
            print("Navigating to Login page...")
            page.goto("http://localhost:8080/login")
            # Wait for any network idle or specific element if needed
            page.wait_for_load_state("networkidle")
            page.screenshot(path="docs/screenshots/login.png")
            print("Saved login.png")

            # Screenshot Signup Page
            print("Navigating to Signup page...")
            page.goto("http://localhost:8080/signup")
            page.wait_for_load_state("networkidle")
            page.screenshot(path="docs/screenshots/signup.png")
            print("Saved signup.png")

            # Screenshot Landing Page (if exists or redirects to login, might be redundant but useful)
            print("Navigating to Landing page...")
            page.goto("http://localhost:8080/")
            page.wait_for_load_state("networkidle")
            # Usually redirects to login if not authenticated, but let's capture it.
            page.screenshot(path="docs/screenshots/landing.png")
            print("Saved landing.png")

            browser.close()

    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        # Kill the dev server
        print("Stopping dev server...")
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        process.wait()
        print("Dev server stopped.")

if __name__ == "__main__":
    generate_screenshots()
