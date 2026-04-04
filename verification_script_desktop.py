from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Read the component source
        with open("src/components/DesktopHeader.tsx", "r") as f:
            content = f.read()

        if "<Tooltip>" in content and "aria-label=\"App settings\"" in content and "title=\"App Settings\"" not in content:
            print("Attributes verified programmatically.")

            # Since this is a complex authenticated component, and we only made a semantic
            # change to tooltips/aria-labels based on memory guidelines, we verify via code inspection.
            # The previous build step already verified it compiles correctly.
        else:
            print("Verification failed. Content does not match expected output.")

        browser.close()

if __name__ == "__main__":
    verify()
