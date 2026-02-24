// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateGroupPage from '../CreateGroup';
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
    user: { name: 'Test User', uid: '123' },
    createGroup: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  getValidUserDetails: vi.fn(),
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadToCloudinary: vi.fn(),
}));

vi.mock('@/components/AppContainer', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/Avatar', () => ({
  default: () => <div>Avatar</div>,
}));

vi.mock('sonner', () => ({
  toast: {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      promise: vi.fn(),
  }
}));

import { fireEvent, waitFor } from '@testing-library/react';

describe('CreateGroup Page Accessibility', () => {
  it('should have accessible inputs in all steps', async () => {
    render(
      <BrowserRouter>
        <CreateGroupPage />
      </BrowserRouter>
    );

    // Step 1: Group Name
    const groupNameInput = screen.getByLabelText('Group Name');
    expect(groupNameInput).toBeDefined();

    // Fill name to proceed
    fireEvent.change(groupNameInput, { target: { value: 'Test Group' } });

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextButton);

    // Step 2: Member Inputs
    await waitFor(() => {
        expect(screen.getByText('Add Members')).toBeDefined();
    });

    const searchInput = screen.getByLabelText('Search username');
    expect(searchInput).toBeDefined();

    // Check search button accessibility
    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).toBeDefined();

    // Manual Member Input
    const manualInput = screen.getByLabelText('Manual member name');
    expect(manualInput).toBeDefined();
  });
});
