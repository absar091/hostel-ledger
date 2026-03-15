import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'iOS' | 'Android' | 'Desktop' | 'Unknown'>('Unknown');

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(standalone || isIOSStandalone);
      setIsInstalled(standalone || isIOSStandalone);
    };

    // Check platform
    const checkPlatform = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
      setIsDesktop(!isIOSDevice && !isAndroidDevice);
      
      if (isIOSDevice) setPlatform('iOS');
      else if (isAndroidDevice) setPlatform('Android');
      else setPlatform('Desktop');
    };

    checkInstalled();
    checkPlatform();

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsInstallable(true);
      console.log('📱 PWA install prompt available');
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('✅ PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('⚠️ Install prompt not available');
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted install');
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      } else {
        console.log('❌ User dismissed install');
        return false;
      }
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isStandalone,
    platform,
    promptInstall,
    showInstallPrompt: promptInstall,
    dismissPrompt: () => {
      setInstallPrompt(null);
      setIsInstallable(false);
    }
  };
};
