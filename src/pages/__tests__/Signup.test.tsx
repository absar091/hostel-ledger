// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Signup from '../Signup';
import { BrowserRouter } from 'react-router-dom';

// Mocking modules
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => ({
    signup: vi.fn(),
    checkUsernameAvailable: vi.fn().mockResolvedValue(true),
    checkEmailExists: vi.fn().mockResolvedValue(false),
    user: null,
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    shouldShowPageGuide: () => false,
    markPageGuideShown: vi.fn(),
  }),
}));

vi.mock('@/components/PageGuide', () => ({
  default: () => <div data-testid="page-guide" />,
}));

vi.mock('@/components/LanguageSelector', () => ({
  default: () => <div data-testid="language-selector" />,
}));

describe('Signup Page Accessibility', () => {
  const renderSignup = () => {
    return render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );
  };

  it('should have accessible form fields in basic view', () => {
    renderSignup();

    expect(screen.getByLabelText('auth.first_name')).toBeDefined();
    expect(screen.getByLabelText('auth.last_name')).toBeDefined();
    expect(screen.getByLabelText('auth.email')).toBeDefined();
    expect(screen.getByLabelText('auth.username')).toBeDefined();
    expect(screen.getByLabelText('auth.university')).toBeDefined();
  });

  it('should have accessible password fields and toggles in step 2', async () => {
    renderSignup();

    // Fill Step 1
    fireEvent.change(screen.getByLabelText('auth.first_name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('auth.last_name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('auth.email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('auth.username'), { target: { value: 'johndoe' } });
    fireEvent.change(screen.getByLabelText('auth.university'), { target: { value: 'Test Uni' } });

    // Click Continue
    // The button might have an icon, so searching by text might target the span inside.
    // Use getByRole to be safer or closest.
    const continueBtn = screen.getByRole('button', { name: /auth.continue/i });
    fireEvent.click(continueBtn);

    // Wait for Step 2
    await waitFor(() => {
        expect(screen.getByLabelText('auth.password')).toBeDefined();
    });

    expect(screen.getByLabelText('auth.confirm_password')).toBeDefined();

    // Check Password Toggles
    const toggles = screen.getAllByRole('button', { name: /Show password/i });
    expect(toggles.length).toBeGreaterThanOrEqual(1);

    // Click toggle
    fireEvent.click(toggles[0]);
    expect(screen.getAllByRole('button', { name: /Hide password/i }).length).toBeGreaterThanOrEqual(1);

    // Check Terms Checkbox
    // For checkbox, label text might be "auth.terms_privacy_agree"
    expect(screen.getByLabelText('auth.terms_privacy_agree')).toBeDefined();
  });
});
