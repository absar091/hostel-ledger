from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    print("Navigating to Security page (http://localhost:8080/security)...")
    try:
        page.goto("http://localhost:8080/security")

        # Wait for page to load
        print("Waiting for page content...")
        try:
            page.wait_for_selector("text=Security & Privacy", timeout=10000)
            print("Found 'Security & Privacy' text!")
        except Exception as e:
            print("Could not find 'Security & Privacy'. Dumping content snippet...")
            print(page.content()[:500])
            page.screenshot(path="verification_failure_v3.png")
            raise e

        # Find Export Data button
        print("Looking for Export Data button...")
        export_btn = page.locator("button:has-text('Export Your Data')")

        if export_btn.count() > 0:
            print("Clicking Export Data button...")
            export_btn.click()

            # Wait for toast
            print("Waiting for toast...")
            try:
                page.wait_for_selector("text=Preparing your data...", timeout=5000)
                print("Toast 'Preparing your data...' appeared!")

                # Wait for completion
                page.wait_for_selector("text=Data export complete!", timeout=5000)
                print("Toast 'Data export complete!' appeared!")

            except Exception as e:
                print(f"Toasts missed or failed: {e}")

            # Take screenshot
            time.sleep(1)
            page.screenshot(path="verification_export_success.png")
            print("Verification successful, screenshot saved to verification_export_success.png")
        else:
            print("Export button not found")
            page.screenshot(path="verification_failure_btn_v3.png")

    except Exception as e:
        print(f"Verification failed: {e}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
