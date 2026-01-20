# Desktop Sidebar Dashboard Plan

## Overview
Create a desktop-optimized dashboard with sidebar navigation for screens ≥1024px (lg breakpoint).

## Layout Strategy
- **Mobile (< 1024px)**: Current design with bottom navigation
- **Desktop (≥ 1024px)**: Sidebar navigation on left, content on right

## Components to Create
1. **Sidebar Component** (`src/components/Sidebar.tsx`)
   - Logo and app name at top
   - Navigation links (Dashboard, Groups, Activity, Settings)
   - User profile section at bottom
   - Fixed position on desktop

2. **Desktop Header** (for desktop only)
   - Search bar
   - Notifications
   - User profile dropdown
   - Dark mode toggle

## Implementation Steps
1. Create Sidebar component with navigation
2. Update Dashboard layout to show sidebar on desktop
3. Hide BottomNav on desktop (lg:hidden)
4. Add responsive padding/margins for sidebar
5. Style sidebar to match reference HTML

## Design Specifications from Reference
- Sidebar width: 256px (w-64)
- Background: white/slate-900
- Border: right border
- Navigation items: rounded-xl with hover states
- Active state: bg-primary with white text
- Logo: Forest green (#1B4332)

## Files to Modify
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/DesktopHeader.tsx`
- Modify: `src/pages/Dashboard.tsx` (add sidebar layout)
- Modify: `src/components/BottomNav.tsx` (hide on desktop)

## Next Steps
After confirmation, I will:
1. Create the Sidebar component
2. Create the DesktopHeader component
3. Update Dashboard to use responsive layout
4. Test on both mobile and desktop viewports
