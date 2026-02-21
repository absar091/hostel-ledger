/**
 * Verifies if the user owns the image (Profile Picture or Group Cover Photo)
 * @param {object} db - Firebase Admin Database instance
 * @param {string} userId - The UID of the requesting user
 * @param {string} publicId - The Cloudinary Public ID to verify
 * @returns {Promise<boolean>} - True if owned, False otherwise
 */
async function verifyImageOwnership(db, userId, publicId) {
  if (!publicId || !userId || !db) return false;

  // Stricter check to prevent substring IDOR (e.g. publicId "user" matching "user_profile.jpg")
  // We check if the URL contains '/<publicId>.' (with extension) or ends with '/<publicId>' (no extension)
  const isMatch = (url, pid) => {
    if (!url || typeof url !== 'string') return false;
    // Check for exact match segment in URL path
    return url.includes(`/${pid}.`) || url.endsWith(`/${pid}`);
  };

  try {
    // 1. Check User Profile Picture
    const userSnap = await db.ref(`users/${userId}`).get();
    if (userSnap.exists()) {
      const userData = userSnap.val();
      if (userData.photoURL && isMatch(userData.photoURL, publicId)) {
        return true;
      }
    }

    // 2. Check Groups created by user (Cover Photo)
    // Only the creator can change/delete the cover photo
    const groupsRef = db.ref('groups');
    const query = groupsRef.orderByChild('createdBy').equalTo(userId);
    const groupsSnap = await query.get();

    if (groupsSnap.exists()) {
      const groups = groupsSnap.val();
      for (const groupId in groups) {
        const group = groups[groupId];
        if (group.coverPhoto && isMatch(group.coverPhoto, publicId)) {
          return true; // Match found in a group owned by user
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error verifying image ownership:', error);
    return false; // Fail secure
  }
}

module.exports = { verifyImageOwnership };
