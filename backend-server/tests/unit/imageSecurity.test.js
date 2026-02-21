import { describe, it, expect, vi } from 'vitest';
import { verifyImageOwnership } from '../../utils/imageSecurity';

describe('verifyImageOwnership', () => {
  // Mock DB helper
  const createMockDb = (userData, userGroups) => {
    return {
      ref: vi.fn((path) => {
        if (path.startsWith('users/')) {
           const uid = path.split('/')[1];
           if (uid === 'user123') {
             return {
               get: vi.fn().mockResolvedValue({
                 exists: () => !!userData,
                 val: () => userData
               })
             };
           }
           return {
             get: vi.fn().mockResolvedValue({
               exists: () => false,
               val: () => null
             })
           };
        }
        if (path === 'groups') {
          return {
            orderByChild: vi.fn().mockReturnThis(),
            equalTo: vi.fn((uid) => {
              if (uid === 'user123') {
                return {
                  get: vi.fn().mockResolvedValue({
                    exists: () => !!userGroups,
                    val: () => userGroups
                  })
                };
              }
              return {
                get: vi.fn().mockResolvedValue({
                  exists: () => false,
                  val: () => null
                })
              };
            })
          };
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: () => false })
        };
      })
    };
  };

  it('should return true if publicId matches user photoURL', async () => {
    const db = createMockDb({ photoURL: 'https://res.cloudinary.com/demo/image/upload/v1234/profile_pic.jpg' }, null);
    const result = await verifyImageOwnership(db, 'user123', 'profile_pic');
    expect(result).toBe(true);
  });

  it('should return true if publicId matches group coverPhoto created by user', async () => {
    const db = createMockDb(
      { photoURL: 'other.jpg' },
      {
        group1: { createdBy: 'user123', coverPhoto: 'https://res.cloudinary.com/demo/image/upload/v5678/group_cover.jpg' }
      }
    );
    const result = await verifyImageOwnership(db, 'user123', 'group_cover');
    expect(result).toBe(true);
  });

  it('should return false if publicId is not found in either', async () => {
    const db = createMockDb(
        { photoURL: 'https://res.cloudinary.com/demo/image/upload/v1234/profile_pic.jpg' },
        { group1: { createdBy: 'user123', coverPhoto: 'https://res.cloudinary.com/demo/image/upload/v5678/group_cover.jpg' } }
    );
    const result = await verifyImageOwnership(db, 'user123', 'random_image');
    expect(result).toBe(false);
  });

  it('should return false if user does not exist', async () => {
    const db = createMockDb(null, null);
    const result = await verifyImageOwnership(db, 'user123', 'any-pic');
    expect(result).toBe(false);
  });

  it('should return false if publicId is missing', async () => {
    const db = createMockDb({}, {});
    const result = await verifyImageOwnership(db, 'user123', null);
    expect(result).toBe(false);
  });

  it('should handle DB errors gracefully', async () => {
    const db = {
      ref: vi.fn().mockImplementation(() => { throw new Error('DB Error'); })
    };
    const result = await verifyImageOwnership(db, 'user123', 'pic');
    expect(result).toBe(false);
  });

  it('should prevent substring IDOR attacks', async () => {
    // Attack: User owns 'user_profile.jpg' but requests to delete 'user' (which might be another valid ID)
    // The user should ONLY be able to delete 'user_profile', not 'user'.
    const db = createMockDb({ photoURL: 'https://res.cloudinary.com/demo/image/upload/v1234/user_profile.jpg' }, null);

    // Attempt to delete 'user' (substring of user_profile)
    const result = await verifyImageOwnership(db, 'user123', 'user');
    expect(result).toBe(false);

    // Verify correct ID still works
    const correctResult = await verifyImageOwnership(db, 'user123', 'user_profile');
    expect(correctResult).toBe(true);
  });

  it('should handle publicId with folders correctly', async () => {
    const db = createMockDb({ photoURL: 'https://res.cloudinary.com/demo/image/upload/v1234/folder/sub/my_pic.jpg' }, null);
    const result = await verifyImageOwnership(db, 'user123', 'folder/sub/my_pic');
    expect(result).toBe(true);
  });
});
