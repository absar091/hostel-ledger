# TWA Detection Usage Examples

After building your Android app with Bubblewrap, you can detect when users are using the Android app vs the website. Here are some practical examples:

## Basic Usage

```tsx
import { useTWA } from '@/hooks/useTWA';

function MyComponent() {
  const isTWA = useTWA();

  return (
    <div>
      {isTWA ? (
        <p>Welcome to the Android app! 📱</p>
      ) : (
        <p>Welcome to the website! 🌐</p>
      )}
    </div>
  );
}
```

## Hide "Download App" Button in TWA

```tsx
import { useTWA } from '@/hooks/useTWA';
import { Button } from '@/components/ui/button';

function Header() {
  const isTWA = useTWA();

  return (
    <header>
      <h1>Hostel Ledger</h1>
      {!isTWA && (
        <Button asChild>
          <a href="/download">Download App</a>
        </Button>
      )}
    </header>
  );
}
```

## Show Different Navigation

```tsx
import { useTWA } from '@/hooks/useTWA';
import { Link } from 'react-router-dom';

function Navigation() {
  const isTWA = useTWA();

  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/groups">Groups</Link>
      
      {isTWA ? (
        // Show app-specific links
        <>
          <Link to="/settings">Settings</Link>
          <Link to="/notifications">Notifications</Link>
        </>
      ) : (
        // Show website-specific links
        <>
          <Link to="/download">Download</Link>
          <Link to="/features">Features</Link>
        </>
      )}
    </nav>
  );
}
```

## Conditional Features

```tsx
import { useTWAInfo } from '@/hooks/useTWA';

function Dashboard() {
  const { isTWA, platform } = useTWAInfo();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {isTWA && (
        <div className="app-only-feature">
          <h2>App-Only Features</h2>
          <p>Push notifications enabled!</p>
          <p>Offline mode available!</p>
        </div>
      )}
      
      <p>Platform: {platform}</p>
    </div>
  );
}
```

## Update InstallApp Page

You can update your existing `InstallApp.tsx` to hide on TWA:

```tsx
import { useTWA } from '@/hooks/useTWA';
import { Navigate } from 'react-router-dom';

function InstallApp() {
  const isTWA = useTWA();

  // Redirect to dashboard if already in app
  if (isTWA) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <h1>Install Hostel Ledger</h1>
      {/* Your install instructions */}
    </div>
  );
}
```

## Show App Rating Prompt (TWA Only)

```tsx
import { useTWA } from '@/hooks/useTWA';
import { Button } from '@/components/ui/button';

function RatingPrompt() {
  const isTWA = useTWA();

  if (!isTWA) return null;

  const handleRateApp = () => {
    // Open Play Store rating page
    window.open('market://details?id=online.aarx.hostelledger.twa', '_blank');
  };

  return (
    <div className="rating-prompt">
      <p>Enjoying Hostel Ledger?</p>
      <Button onClick={handleRateApp}>
        Rate us on Play Store ⭐
      </Button>
    </div>
  );
}
```

## Analytics Tracking

```tsx
import { useTWA } from '@/hooks/useTWA';
import { useEffect } from 'react';

function AnalyticsProvider({ children }) {
  const isTWA = useTWA();

  useEffect(() => {
    // Track platform in your analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('set', 'user_properties', {
        platform: isTWA ? 'android_app' : 'web'
      });
    }
  }, [isTWA]);

  return <>{children}</>;
}
```

## Different Styling for TWA

```tsx
import { useTWA } from '@/hooks/useTWA';
import { cn } from '@/lib/utils';

function AppContainer({ children }) {
  const isTWA = useTWA();

  return (
    <div className={cn(
      "app-container",
      isTWA && "twa-mode" // Add special class for TWA
    )}>
      {children}
    </div>
  );
}
```

Then in your CSS:

```css
.twa-mode {
  /* Remove extra padding since there's no browser chrome */
  padding-top: 0;
}

.twa-mode .header {
  /* Adjust header for app mode */
  position: sticky;
  top: 0;
}
```

## Best Practices

1. **Don't overuse**: Only show different content when it makes sense
2. **Maintain consistency**: Keep core functionality the same
3. **Test both modes**: Always test website and TWA separately
4. **Progressive enhancement**: Website should work perfectly without TWA features
5. **Clear localStorage**: For testing, clear localStorage to reset TWA detection

## Testing TWA Detection

To test TWA mode without building the app:

```tsx
// Add this temporarily to your app
function TWADebugger() {
  const handleSetTWA = () => {
    localStorage.setItem('isTWA', 'true');
    window.location.reload();
  };

  const handleClearTWA = () => {
    localStorage.removeItem('isTWA');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded">
      <p>TWA Debug</p>
      <button onClick={handleSetTWA}>Enable TWA Mode</button>
      <button onClick={handleClearTWA}>Disable TWA Mode</button>
    </div>
  );
}
```
