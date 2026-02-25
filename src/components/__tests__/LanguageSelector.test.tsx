// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import LanguageSelector from '../LanguageSelector';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('LanguageSelector Accessibility', () => {
  const renderComponent = () => {
    return render(
      <TooltipProvider>
        <LanguageSelector />
      </TooltipProvider>
    );
  };

  it('should have accessible trigger button', async () => {
    renderComponent();

    // Check for button with aria-label
    const button = screen.getByRole('button', { name: /Change language/i });
    expect(button).toBeDefined();

    // Check for icon with aria-hidden
    // We can't easily query aria-hidden elements with standard queries as they are hidden from accessibility tree
    // But we can check if the button contains an SVG
    const svg = button.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should have accessible menu items', async () => {
    renderComponent();

    // Open the menu
    const button = screen.getByRole('button', { name: /Change language/i });
    fireEvent.pointerDown(button); // Radix often requires pointerDown

    // Wait for menu to appear
    await waitFor(() => {
        expect(screen.getByRole('menu')).toBeDefined();
    });

    // Check for menu items with radio role
    const items = screen.getAllByRole('menuitemradio');
    expect(items.length).toBe(2);

    // Check selection state (mocked as 'en')
    const englishItem = items.find(item => item.textContent?.includes('English'));
    const urduItem = items.find(item => item.textContent?.includes('اردو'));

    expect(englishItem?.getAttribute('aria-checked')).toBe('true');
    expect(urduItem?.getAttribute('aria-checked')).toBe('false');
  });
});
