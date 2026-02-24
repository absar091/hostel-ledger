// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Groups from '../../pages/Groups';
import { BrowserRouter } from 'react-router-dom';

// Mocking modules
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => ({
    user: { name: 'Test User' },
    getSettlements: () => ({}),
    toggleFavoriteGroup: vi.fn(),
    getFavoriteGroups: () => [],
  }),
}));

vi.mock('@/contexts/FirebaseDataContext', () => ({
  useFirebaseData: () => ({
    groups: [
      { id: '1', name: 'Group 1', members: [] },
    ],
    createGroup: vi.fn(),
    fetchGroupDetail: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    shouldShowPageGuide: () => false,
    markPageGuideShown: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/Sidebar', () => ({
  default: () => <div>Sidebar</div>,
}));

vi.mock('@/components/DesktopHeader', () => ({
  default: () => <div>DesktopHeader</div>,
}));

vi.mock('@/components/MobileHeader', () => ({
  default: () => <div>MobileHeader</div>,
}));

vi.mock('@/components/AppContainer', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>BottomNav</div>,
}));

vi.mock('@/components/PageGuide', () => ({
  default: () => null,
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
    }
}));

describe('Groups Page Accessibility', () => {
  it('should have an accessible search input', () => {
    render(
      <BrowserRouter>
        <Groups />
      </BrowserRouter>
    );

    const searchInput = screen.getByLabelText('Search groups, members, or expenses');
    expect(searchInput).toBeDefined();
    expect(searchInput.getAttribute('placeholder')).toBe('Search groups, members, or expenses...');
  });
});
