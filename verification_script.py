from playwright.sync_api import sync_playwright

def verify_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Provide a minimal HTML template with Tailwind included to render the components exactly as they appear in the app.
        html_content = r"""
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    theme: {
                        extend: {
                            colors: {
                                ring: "hsl(var(--ring))",
                            }
                        }
                    }
                }
            </script>
            <style>
                :root {
                    --ring: 222.2 84% 4.9%;
                }
            </style>
        </head>
        <body class="p-8 bg-gray-100 flex flex-col gap-8">
            <div>
                <p class="mb-2 text-sm text-gray-500">Toggle Button (Collapse/Expand)</p>
                <button
                    class="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-600"><path d="m15 18-6-6 6-6"/></svg>
                </button>
            </div>

            <div class="w-64">
                <p class="mb-2 text-sm text-gray-500">Nav Button (Active)</p>
                <button
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#1B4332] text-white shadow-lg"
                >
                    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 flex-shrink-0 font-bold"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span class="font-bold truncate font-black">Home</span>
                </button>
            </div>

            <div class="w-64">
                <p class="mb-2 text-sm text-gray-500">Logout Button</p>
                <button
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  <span>Logout</span>
                </button>
            </div>

             <div>
                <p class="mb-2 text-sm text-gray-500">Profile Icon Button</p>
                <button
                  class="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  <span class="text-lg font-black text-white">U</span>
                </button>
             </div>
        </body>
        </html>
        """

        page.set_content(html_content)
        page.wait_for_timeout(1000)

        # Focus the first button to show the focus ring
        page.keyboard.press("Tab")
        page.wait_for_timeout(500)
        page.screenshot(path="verify_focus_toggle.png")

        # Focus the second button
        page.keyboard.press("Tab")
        page.wait_for_timeout(500)
        page.screenshot(path="verify_focus_nav.png")

        # Focus the third button
        page.keyboard.press("Tab")
        page.wait_for_timeout(500)
        page.screenshot(path="verify_focus_logout.png")

        # Focus the fourth button
        page.keyboard.press("Tab")
        page.wait_for_timeout(500)
        page.screenshot(path="verify_focus_profile.png")

        browser.close()

if __name__ == "__main__":
    verify_feature()
