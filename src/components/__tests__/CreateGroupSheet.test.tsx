// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateGroupSheet from '../CreateGroupSheet';

// Mocks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
        if (key === 'sheets.create_group.group_name_label') return 'Group Name';
        if (key === 'common.continue') return 'Continue';
        return key;
    },
  }),
}));

vi.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => ({
    checkUsernameAvailable: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadToCloudinary: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

vi.mock('../Avatar', () => ({
  default: () => <div>Avatar</div>,
}));

describe('CreateGroupSheet Accessibility', () => {
  it('should have accessible inputs', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <CreateGroupSheet open={true} onClose={onClose} onSubmit={onSubmit} />
    );

    // Group Name (Step 1)
    const groupNameInput = screen.getByLabelText('Group Name');
    expect(groupNameInput).toBeDefined();

    // Fill name to enable next
    fireEvent.change(groupNameInput, { target: { value: 'Test Group' } });

    // Continue to Step 2
    const nextButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(nextButton);

    // Step 2
    // Manual Member Input
    await waitFor(() => {
        // We need to find the input by aria-label "Manual member name"
        expect(screen.getByLabelText('Manual member name')).toBeDefined();
    });
  });
});
