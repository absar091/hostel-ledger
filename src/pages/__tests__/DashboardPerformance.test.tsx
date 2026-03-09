// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => ({
    user: { uid: 'test-user', name: 'Test User' },
    getWalletBalance: () => 1000,
    getTotalToReceive: () => 500,
    getTotalToPay: () => 200,
    getSettlementDelta: () => 300,
  }),
}));

vi.mock('@/contexts/FirebaseDataContext', () => ({
  useFirebaseData: () => ({
    groups: [],
    createGroup: vi.fn(),
    addExpense: vi.fn(),
    recordPayment: vi.fn(),
    addMoneyToWallet: vi.fn(),
    payMyDebt: vi.fn(),
    getAllTransactions: () => [],
    addMemberToGroup: vi.fn(),
  }),
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (amount: number) => `Rs ${amount}`,
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    shouldShowOnboarding: () => false,
    shouldShowPageGuide: () => false,
    markOnboardingComplete: vi.fn(),
    markPageGuideShown: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({
    isInstalled: false,
  }),
}));

vi.mock('@/hooks/useSync', () => ({
  useSync: () => ({
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    syncData: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOneSignalPush', () => ({
  useOneSignalPush: () => ({
    isSupported: true,
    permission: 'default',
    subscribe: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePendingGroupJoin', () => ({
  usePendingGroupJoin: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock components used in Dashboard to simplify testing
vi.mock('@/components/BottomNav', () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock('@/components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/DesktopHeader', () => ({ default: () => <div data-testid="desktop-header" /> }));
vi.mock('@/components/MobileHeader', () => ({ default: () => <div data-testid="mobile-header" /> }));
vi.mock('@/components/AppContainer', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/InvitationsList', () => ({ default: () => <div data-testid="invitations-list" /> }));
vi.mock('@/components/TransactionList', () => ({ TransactionList: () => <div data-testid="transaction-list" /> }));
vi.mock('@/components/UsernameMigration', () => ({ default: () => <div data-testid="username-migration" /> }));
vi.mock('@/components/OnboardingTour', () => ({ default: () => <div data-testid="onboarding-tour" /> }));
vi.mock('@/components/PageGuide', () => ({ default: () => <div data-testid="page-guide" /> }));
vi.mock('@/components/AddExpenseSheet', () => ({ default: () => <div data-testid="add-expense-sheet" /> }));
vi.mock('@/components/RecordPaymentSheet', () => ({ default: () => <div data-testid="record-payment-sheet" /> }));
vi.mock('@/components/AddMoneySheet', () => ({ default: () => <div data-testid="add-money-sheet" /> }));
vi.mock('@/components/PaymentConfirmationSheet', () => ({ default: () => <div data-testid="payment-confirmation-sheet" /> }));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('Dashboard Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<Dashboard />);
    expect(screen.getByText('AVAILABLE BALANCE')).toBeDefined();
    // Navigation test removed as bottom nav was refactored
  });

  it('calculates settlement delta correctly', () => {
    render(<Dashboard />);
    // Verify that localStorage is written to (side effect of calculateDayToDay)
    // We expect it to write the current delta
    const today = new Date().toISOString().split("T")[0];
    const key = `settlementDelta_test-user_${today}`;
    expect(localStorage.getItem(key)).toBe('300');
  });
});
