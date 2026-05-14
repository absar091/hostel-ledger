from playwright.sync_api import sync_playwright
import json

def run_cuj(page):
    page.goto("http://localhost:4173")
    page.evaluate("document.body.innerHTML = '<h1>Mock Screen</h1>'")
    page.screenshot(path="verification_debug.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="playwright-report/videos",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
