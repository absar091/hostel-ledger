from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify Sheets
        print("Navigating to /verify-sheets")
        try:
            page.goto("http://localhost:5173/verify-sheets", timeout=10000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Check Add Money Sheet
        print("Opening Add Money Sheet")
        page.get_by_role("button", name="Open Add Money").click()
        time.sleep(1) # Wait for animation
        page.screenshot(path="verification/add_money_sheet.png")
        print("Captured add_money_sheet.png")

        # Reload to close sheet
        page.reload()

        # Check Group Settings Sheet
        print("Opening Group Settings Sheet")
        page.get_by_role("button", name="Open Group Settings").click()
        time.sleep(1)
        page.screenshot(path="verification/group_settings_sheet.png")
        print("Captured group_settings_sheet.png")

        # Verify 2FA Page
        print("Navigating to /verify-2fa")
        page.goto("http://localhost:5173/verify-2fa")
        time.sleep(1)
        page.screenshot(path="verification/two_factor.png")
        print("Captured two_factor.png")

        browser.close()

if __name__ == "__main__":
    run()
