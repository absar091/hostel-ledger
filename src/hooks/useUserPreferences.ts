import { useState, useEffect } from 'react';

interface UserPreferences {
  hasSeenOnboarding: boolean;
  hasSeenPageGuides: Record<string, boolean>;
  tourCompleted: boolean;
  lastLoginDate: string | null;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  hasSeenOnboarding: false,
  hasSeenPageGuides: {},
  tourCompleted: false,
  lastLoginDate: null,
};

export const useUserPreferences = (userId?: string) => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = userId ? `user_preferences_${userId}` : 'user_preferences_guest';

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = (newPreferences: Partial<UserPreferences>) => {
    try {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  const markOnboardingComplete = () => {
    savePreferences({ 
      hasSeenOnboarding: true, 
      tourCompleted: true,
      lastLoginDate: new Date().toISOString()
    });
  };

  const markPageGuideShown = (pageId: string) => {
    savePreferences({
      hasSeenPageGuides: {
        ...preferences.hasSeenPageGuides,
        [pageId]: true,
      },
    });
  };

  const shouldShowOnboarding = () => {
    return !preferences.hasSeenOnboarding && !isLoading;
  };

  const shouldShowPageGuide = (pageId: string) => {
    return preferences.hasSeenOnboarding && !preferences.hasSeenPageGuides[pageId] && !isLoading;
  };

  const isFirstTimeUser = () => {
    return !preferences.lastLoginDate && !isLoading;
  };

  const resetPreferences = () => {
    try {
      localStorage.removeItem(storageKey);
      setPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  };

  return {
    preferences,
    isLoading,
    markOnboardingComplete,
    markPageGuideShown,
    shouldShowOnboarding,
    shouldShowPageGuide,
    isFirstTimeUser,
    resetPreferences,
    savePreferences,
  };
};