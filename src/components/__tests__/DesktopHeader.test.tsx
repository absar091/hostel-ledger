// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DesktopHeader from '../DesktopHeader';
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
    user: { name: 'Test User', photoURL: 'http://example.com/photo.jpg' },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

vi.mock('../NotificationIcon', () => ({
  default: () => <button aria-label="Notifications">Bell</button>,
}));

vi.mock('@/components/Avatar', () => ({
  default: () => <img alt="Avatar" />,
}));

describe('DesktopHeader Accessibility', () => {
  it('should have an accessible search input', () => {
    render(
      <BrowserRouter>
        <DesktopHeader />
      </BrowserRouter>
    );

    const searchInput = screen.getByLabelText('Search transactions, groups, or members');
    expect(searchInput).toBeDefined();
    expect(searchInput.getAttribute('placeholder')).toBe('Search transactions, groups, or members...');
  });
});
