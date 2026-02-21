import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  fetchSignInMethodsForEmail,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { ref, set, get, update, push, onValue } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { retryOperation } from "@/lib/transaction";
import { IndividualDebt } from "@/lib/debtTracking";
import {
  sanitizeInput,
  isValidEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateAmount
} from "@/lib/security";
import { triggerPushNotification } from "@/lib/transactionNotifications";
import { callSecureApi } from "@/lib/api";

export interface PaymentDetails {
  jazzCash?: string;
  easypaisa?: string;
  bankName?: string;
  accountNumber?: string;
  raastId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string; // Unique username for friend invitations (e.g., @john_doe)
  name: string;
  phone?: string | null;
  avatar?: string | null;
  photoURL?: string | null; // Profile picture URL from Cloudinary
  paymentDetails: PaymentDetails;
  walletBalance: number; // Available Budget (actual money you have)
  settlements: { [groupId: string]: { [personId: string]: { toReceive: number; toPay: number } } }; // CORRECTED: Group-aware settlement tracking
  createdAt: string;
  emailVerified?: boolean; // Email verification status
  is2FAEnabled?: boolean; // Two-Factor Authentication status
  favoriteGroups?: string[]; // Array of favorite group IDs
  showBalanceToOthers: boolean; // Privacy setting for wallet balance visibility
  currency?: string; // Currency code (e.g., 'PKR', 'USD', 'EUR') — defaults to PKR
  language?: string; // Language code (e.g., 'en', 'ur', 'hi') — defaults to en
}

interface FirebaseAuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    email: string;
    password: string;
    username?: string; // Optional - will generate from name if not provided
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    university?: string;
    emailVerified?: boolean;
  }) => Promise<{ success: boolean; error?: string; uid?: string }>;
  createGroup: (groupData: any) => Promise<{ success: boolean; groupId?: string; error?: string }>;
  checkUsernameAvailable: (username: string) => Promise<boolean>; // Check if username is available
  logout: () => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailExists: (email: string) => Promise<boolean>;
  markEmailAsVerified: (uid: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeProfilePicture: () => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number, note?: string) => Promise<{ success: boolean; error?: string; transaction?: any }>;
  deductMoneyFromWallet: (amount: number, note?: string) => Promise<{ success: boolean; error?: string }>;
  getWalletBalance: () => number;
  getSettlements: (groupId?: string) => { [personId: string]: { toReceive: number; toPay: number } };
  getTotalToReceive: (groupId?: string) => number;
  getTotalToPay: (groupId?: string) => number;
  getSettlementDelta: (groupId?: string) => number;
  markPaymentReceived: (groupId: string, personId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  markDebtPaid: (groupId: string, personId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  // New debt tracking methods
  getIndividualDebts: (groupId: string, personId: string) => Promise<{ youOwe: IndividualDebt[]; theyOwe: IndividualDebt[]; totalYouOwe: number; totalTheyOwe: number; netAmount: number }>;
  addIndividualDebt: (groupId: string, personId: string, debt: any) => Promise<{ success: boolean; error?: string }>;
  settleIndividualDebt: (groupId: string, personId: string, debtId: string, amount?: number) => Promise<{ success: boolean; error?: string }>;
  settleNetAmount: (groupId: string, personId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  // Favorite groups
  toggleFavoriteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  getFavoriteGroups: () => string[];
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  is2FAVerified: boolean;
  verify2FA: (token: string) => Promise<{ success: boolean; error?: string }>;
  setup2FA: () => Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }>;
  confirm2FASetup: (token: string) => Promise<{ success: boolean; error?: string }>;
  disable2FA: (token: string) => Promise<{ success: boolean; error?: string }>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  // Effect to handle Firebase Auth state changes
  useEffect(() => {
    let authResolved = false;

    const loadCachedUser = (reason: string): boolean => {
      try {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          console.log(`✅ Loaded cached user from localStorage (${reason})`, parsedUser.uid);
          setUser(parsedUser);
          setFirebaseUser(null);
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        console.error('Failed to load cached user:', error);
      }
      return false;
    };

    // Immediate offline path
    if (!navigator.onLine && loadCachedUser('offline immediate')) {
      return;
    }

    // Safety timeout: on some devices/networks Firebase auth callback can hang,
    // leaving the app stuck on splash forever. Fallback to cached session.
    // Safety timeout: on some devices/networks Firebase auth callback can hang,
    // leaving the app stuck on splash forever. Fallback to cached session.
    // OPTIMIZATION: Reduced timeout from 5000ms to 2500ms
    const authTimeout = window.setTimeout(() => {
      if (authResolved) return;

      console.warn('⏱️ Auth initialization timeout - using cached/offline fallback');
      authResolved = true;

      if (!loadCachedUser('auth timeout fallback')) {
        setIsLoading(false);
      }
    }, 2500);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Always update firebaseUser state, even if we loaded from cache
      setFirebaseUser(user);

      if (authResolved) return;
      authResolved = true;
      clearTimeout(authTimeout);
      if (!user) {
        setUser(null);
        localStorage.removeItem('cachedUser');
        setIsLoading(false);
      } else {
        // User authenticated, wait for profile data to load
        setIsLoading(true);
      }
      // If user exists, the second useEffect will handle profile subscription
    }, (error) => {
      logger.error("Auth state change error", { error: error.message });

      if (authResolved) return;
      authResolved = true;
      clearTimeout(authTimeout);

      if (!loadCachedUser('auth error fallback')) {
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribeAuth();
    };
  }, []);

  // Effect to handle Real-time User Profile Subscription
  useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribeVerification: () => void;

    const setupSubscription = async () => {
      if (!firebaseUser) return;

      const uid = firebaseUser.uid;
      const userRef = ref(database, `users/${uid}`);
      const verificationRef = ref(database, `emailVerification/${uid}`);

      logger.debug("Setting up real-time profile listener", { uid });

      try {
        // Added Safety Timeout: If profile fetch hangs, force app entry after 3s
        // OPTIMIZATION: Reduced timeout from 5000ms to 3000ms
        const profileTimeout = setTimeout(() => {
          console.warn('⏱️ Profile load timeout - forcing app entry (offline/partial state)');
          setIsLoading(false);
        }, 3000);

        // User Profile Listener
        unsubscribeUser = onValue(userRef, async (snapshot) => {
          clearTimeout(profileTimeout); // Success: clear timeout

          if (snapshot.exists()) {
            const userData = snapshot.val();

            // Get verification status (one-time fetch or separate listener? Separate is better)
            // But we need to combine them. We'll use a local variable or state for verification.
            // Actually, let's just listen to verification as well.

            // We need to fetch/listen to verification status to merge it.
            // For simplicity in this callback, we will read the LATEST verification status available in state?
            // No, that might be stale.
            // Let's use a nested listener approach or independent states? 
            // Independent states are hard because `user` object combines them.
            // We will fetch verification snapshot ONCE here for the specific update, 
            // OR we can just rely on the separate verification listener to update the user object?
            // "merging" updates is tricky with a single `user` state object.

            // Simplified approach: Just fetch verification status once on profile update.
            // Real-time verification status is less critical than profile.

            // Get verification status (async/non-blocking for performance)
            // OPTIMIZATION: Don't await this call to prevent blocking app load
            get(verificationRef).then((vSnap) => {
              if (vSnap.exists() && vSnap.val().emailVerified) {
                // If verified in emailVerification but NOT in user profile, fix the mismatch
                if (!userData.emailVerified) {
                  // Self-healing: persist the fix to user profile so gate works on next load
                  update(ref(database, `users/${uid}`), { emailVerified: true })
                    .catch(e => console.warn("Failed to persist emailVerified fix", e));
                }
                setUser(prev => prev && !prev.emailVerified ? ({ ...prev, emailVerified: true }) : prev);
              }
            }).catch(e => console.warn("Failed to fetch verification", e));

            // Use profile data immediately (optimistic)
            const isVerified = userData.emailVerified || false;

            const userProfile: UserProfile = {
              uid,
              email: userData.email,
              username: userData.username || '',
              name: userData.name,
              phone: userData.phone,
              avatar: userData.avatar,
              photoURL: userData.photoURL || null,
              paymentDetails: userData.paymentDetails || {},
              walletBalance: isNaN(userData.walletBalance) ? 0 : (userData.walletBalance || 0),
              settlements: userData.settlements || {},
              createdAt: userData.createdAt,
              emailVerified: isVerified,
              is2FAEnabled: userData.is2FAEnabled || false,
              favoriteGroups: userData.favoriteGroups || [],
              showBalanceToOthers: userData.showBalanceToOthers ?? false
            };

            setUser(userProfile);
            logger.setUserId(uid);
            setIsLoading(false);

            // Cache user profile
            try {
              localStorage.setItem('cachedUser', JSON.stringify(userProfile));
            } catch (error) {
              console.error('Failed to cache user profile:', error);
            }

            // DEFERRED: Sync balance to groups ONLY when showBalanceToOthers is enabled
            // This was previously blocking initial load with N+1 queries
            if (userProfile.showBalanceToOthers) {
              // NOTE: Balance-to-groups sync is DISABLED because Firebase security rules
              // block direct writes to groups/{gid}/members/ from the frontend.
              // If "show balance to others" needs to work, move this sync to a backend API endpoint.
            }
          } else {
            // Profile doesn't exist - Create it
            logger.info("Creating new user profile", { uid });
            const newUserProfile: UserProfile = {
              uid,
              email: firebaseUser.email || "",
              username: '',
              name: firebaseUser.displayName || "User",
              phone: null,
              avatar: null,
              paymentDetails: {},
              walletBalance: 0,
              settlements: {},
              createdAt: new Date().toISOString(),
              emailVerified: false,
              showBalanceToOthers: false
            };

            try {
              await set(userRef, newUserProfile);
              // The listener will fire again with the new data
            } catch (e: any) {
              logger.error("Failed to create profile", e);
              setIsLoading(false);
            }
          }
        }, (error) => {
          console.error("Profile listener error", error);
          setIsLoading(false);
        });

      } catch (error: any) {
        console.error("Error setting up listeners", error);
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeVerification) unsubscribeVerification();
    };
  }, [firebaseUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // setIsLoading(true);

      // Input validation
      if (!isValidEmail(email)) {
        return { success: false, error: "Please enter a valid email address" };
      }

      if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      logger.info("Login attempt", { email: sanitizedEmail });

      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);

      // OPTIMISTIC UPDATE: Update state immediately to force UI transition
      // This bypasses potential delay in onAuthStateChanged listener
      logger.info("Login successful - applying optimistic update", { uid: userCredential.user.uid });
      setFirebaseUser(userCredential.user);
      setIsLoading(true); // Force loading state to trigger Splash Screen

      return { success: true };
    } catch (error: any) {
      logger.error("Login failed", { email: sanitizeInput(email), error: error.message });
      let errorMessage = "Login failed";

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password. Please check your credentials or create an account.";
          break;
        default:
          errorMessage = error.message || "Login failed";
      }

      return { success: false, error: errorMessage };
    } finally {
      // setIsLoading(false);
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    username?: string; // Optional - will generate from name if not provided
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    university?: string;
    emailVerified?: boolean;
  }): Promise<{ success: boolean; error?: string; uid?: string }> => {
    try {
      // setIsLoading(true);

      // Input validation
      if (!isValidEmail(data.email)) {
        return { success: false, error: "Please enter a valid email address" };
      }

      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors[0] };
      }

      // Validate and sanitize name
      const fullName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'User';
      const nameValidation = validateName(fullName);
      if (!nameValidation.isValid) {
        return { success: false, error: nameValidation.error };
      }

      // Validate phone if provided
      if (data.phone) {
        const phoneValidation = validatePhone(data.phone);
        if (!phoneValidation.isValid) {
          return { success: false, error: phoneValidation.error };
        }
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(data.email.toLowerCase().trim());
      const sanitizedName = nameValidation.sanitizedName!;
      const sanitizedPhone = data.phone ? validatePhone(data.phone).sanitizedPhone : null;

      // Try Firebase Auth first
      try {
        logger.info('Attempting Firebase Auth signup', { email: sanitizedEmail });

        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, data.password);
        const firebaseUser = userCredential.user;

        logger.info('Firebase Auth user created', { uid: firebaseUser.uid });

        // Update Firebase Auth profile
        await updateProfile(firebaseUser, {
          displayName: sanitizedName
        });

        // Create user profile in Realtime Database
        // Generate username from data or create from name
        const sanitizedUsername = data.username
          ? data.username.toLowerCase().replace(/[^a-z0-9._]/g, '')
          : sanitizedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._]/g, '');

        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: sanitizedEmail,
          username: sanitizedUsername,
          name: sanitizedName,
          phone: sanitizedPhone,
          paymentDetails: {},
          walletBalance: 0,
          settlements: {},
          createdAt: new Date().toISOString(),
          showBalanceToOthers: false
        };

        const userRef = ref(database, `users/${firebaseUser.uid}`);
        await set(userRef, userProfile);

        // Create username index for lookups
        const usernameRef = ref(database, `usernames/${sanitizedUsername}`);
        await set(usernameRef, {
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString()
        });

        // Store email verification status and creation time for cleanup
        const verificationRef = ref(database, `emailVerification/${firebaseUser.uid}`);
        await set(verificationRef, {
          emailVerified: data.emailVerified || false,
          createdAt: new Date().toISOString(),
          email: sanitizedEmail
        });

        // --- NEW: Create Personal Space ---
        try {
          const groupId = `personal_${firebaseUser.uid}`;
          const personalGroup = {
            id: groupId,
            name: "Personal Space",
            emoji: "👤",
            isPersonal: true,
            members: [
              {
                id: firebaseUser.uid,
                name: "You",
                userId: firebaseUser.uid,
                isAdmin: true
              }
            ],
            createdBy: firebaseUser.uid,
            createdAt: new Date().toISOString()
          };

          // 1. Create the group entry
          await set(ref(database, `groups/${groupId}`), personalGroup);

          // 2. Add to user's group index
          await set(ref(database, `userGroups/${firebaseUser.uid}/${groupId}`), {
            name: "Personal Space",
            emoji: "👤",
            isPersonal: true,
            memberCount: 1,
            role: 'admin',
            createdAt: personalGroup.createdAt
          });

          logger.info('Personal Space created for new user', { uid: firebaseUser.uid });
        } catch (personalError: any) {
          logger.error("Failed to create Personal Space during signup", personalError);
          // Don't fail the whole signup if just personal space creation fails
        }
        // ---------------------------------

        return { success: true, uid: firebaseUser.uid };

      } catch (authError: any) {
        logger.error("Firebase Auth signup failed", { email: sanitizedEmail, error: authError.message });

        // If Firebase Auth is disabled, show helpful error message
        if (authError.code === 'auth/admin-restricted-operation') {
          return {
            success: false,
            error: "Account creation is currently disabled. Please contact support or enable Email/Password authentication in Firebase Console."
          };
        }

        // Handle other auth errors
        let errorMessage = "Signup failed";

        switch (authError.code) {
          case 'auth/email-already-in-use':
            errorMessage = "An account with this email already exists";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address";
            break;
          case 'auth/weak-password':
            errorMessage = "Password should be at least 6 characters";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Email/password accounts are not enabled. Please contact support.";
            break;
          default:
            errorMessage = authError.message || "Signup failed";
        }

        return { success: false, error: errorMessage };
      }

    } catch (error: any) {
      logger.error("Signup error", { email: data.email, error: error.message });
      return { success: false, error: error.message || "Signup failed" };
    } finally {
      // setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      // Clear cached user on logout
      localStorage.removeItem('cachedUser');
    } catch (error: any) {
      logger.error("Logout error", { error: error.message });
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser || !auth.currentUser.email) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      logger.info("Password updated successfully", { uid: auth.currentUser.uid });
      return { success: true };
    } catch (error: any) {
      logger.error("Update password error", { error: error.message });
      let errorMessage = "Failed to update password";

      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log in again before changing your password";
      }

      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Since we're using Firebase Auth, we need to use Firebase's password reset flow
      // But we're sending our own emails, so we need a different approach

      // Option 1: Use Firebase's sendPasswordResetEmail (this will send Firebase's email)
      // Option 2: Create a custom solution that updates the user's password

      // For now, let's use Firebase's built-in password reset
      // This will send a Firebase email, but it's the most secure approach
      await sendPasswordResetEmail(auth, email);

      return {
        success: true,
        error: "Please check your email for Firebase's password reset link. Our custom email system is for notifications only."
      };
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email";

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many requests. Please try again later";
          break;
        default:
          errorMessage = error.message || "Failed to send password reset email";
      }

      return { success: false, error: errorMessage };
    }
  };

  const sendPasswordResetEmailFirebase = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error("Send password reset email error:", error);
      let errorMessage = "Failed to send password reset email";

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many requests. Please try again later";
          break;
        default:
          errorMessage = error.message || "Failed to send password reset email";
      }

      return { success: false, error: errorMessage };
    }
  };

  const confirmPasswordResetFirebase = async (code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
      return { success: true };
    } catch (error: any) {
      console.error("Confirm password reset error:", error);
      let errorMessage = "Failed to reset password";

      switch (error.code) {
        case 'auth/expired-action-code':
          errorMessage = "Reset code has expired. Please request a new password reset";
          break;
        case 'auth/invalid-action-code':
          errorMessage = "Invalid reset code. Please request a new password reset";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak. Please choose a stronger password";
          break;
        default:
          errorMessage = error.message || "Failed to reset password";
      }

      return { success: false, error: errorMessage };
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      console.log('🔍 Checking if email exists:', email);

      // Primary check: Use backend API with Firebase Admin SDK (checks DB and Auth)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/check-email-exists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            if (result.exists) {
              logger.info('Email exists (Backend Check)', { email, source: result.source });
              return true;
            } else {
              logger.info('Email is available (Backend Check)', { email });
              return false;
            }
          }
        } else {
          logger.warn('Backend email check failed, falling back to Firebase Auth', { email });
        }
      } catch (backendError: any) {
        console.warn('⚠️ Backend email check error, falling back to Firebase Auth:', backendError.message);
      }

      // Fallback: Check Firebase Auth directly (Client SDK)
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          logger.info('Email exists in Firebase Auth', { email, methods });
          return true;
        }
      } catch (authError: any) {
        // fetchSignInMethodsForEmail throws error if user doesn't exist or on network error
        // We only care if it CONFIRMS existence.
        console.log('ℹ️ Firebase Auth check result:', authError.code);
      }

      console.log('✅ Email appears available:', email);
      return false;

    } catch (error: any) {
      console.error("❌ Error checking email existence:", error);
      // In case of error, return false to allow signup (Firebase will catch duplicates during actual signup)
      return false;
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      await auth.currentUser.delete();
      return { success: true };
    } catch (error: any) {
      console.error("Delete account error:", error);
      let errorMessage = "Failed to delete account";

      if (error.code === 'auth/requires-recent-login') {
        errorMessage = "For security, please log out and log in again before deleting your account.";
      }

      return { success: false, error: errorMessage };
    }
  };

  const markEmailAsVerified = async (uid: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Update email verification status in BOTH locations atomically
      const db = database;
      const updates: Record<string, any> = {};
      updates[`emailVerification/${uid}/emailVerified`] = true;
      updates[`emailVerification/${uid}/verifiedAt`] = new Date().toISOString();
      updates[`users/${uid}/emailVerified`] = true; // <-- THIS WAS MISSING! Gate reads from here

      await update(ref(db), updates);

      // Update user profile in memory + cache
      if (user && user.uid === uid) {
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        try {
          localStorage.setItem('cachedUser', JSON.stringify(updatedUser));
        } catch (e) { /* ignore cache error */ }
      }

      logger.info('Email marked as verified', { uid });
      return { success: true };
    } catch (error: any) {
      logger.error("Error marking email as verified", { uid, error: error.message });
      return { success: false, error: error.message || "Failed to mark email as verified" };
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user || !firebaseUser) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Clean data to remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      console.log('[updateUserProfile] Clean data:', cleanData);

      // Convert undefined to null for Firebase (though they're already filtered)
      const firebaseData = Object.fromEntries(
        Object.entries(cleanData).map(([key, value]) => [key, value === undefined ? null : value])
      );

      console.log('[updateUserProfile] Firebase data:', firebaseData);

      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, firebaseData);

      console.log('[updateUserProfile] Firebase update successful');

      // Update local state
      setUser(prev => {
        const newUser = prev ? { ...prev, ...cleanData } : null;
        console.log('[updateUserProfile] New local user state:', newUser);
        return newUser;
      });

      // Sync privacy settings if changed
      if ('showBalanceToOthers' in cleanData) {
        // Fire and forget - don't block the UI response
        callSecureApi('/api/sync-balance-to-groups', {
          showBalanceToOthers: cleanData.showBalanceToOthers
        }).catch(err => console.error("Failed to sync balance privacy:", err));
      }

      return { success: true };
    } catch (error: any) {
      logger.error("Update profile error", { uid: user.uid, error: error.message });
      return { success: false, error: error.message || "Failed to update profile" };
    }
  };

  const uploadProfilePicture = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user || !firebaseUser) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Import upload function
      const { uploadToCloudinary } = await import('@/lib/cloudinary');

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file);

      if (!result.success || !result.url) {
        return { success: false, error: result.error || "Failed to upload image" };
      }

      // Update user profile with new photo URL
      const updateResult = await updateUserProfile({ photoURL: result.url });

      if (!updateResult.success) {
        return { success: false, error: "Failed to save profile picture" };
      }

      return { success: true, url: result.url };
    } catch (error: any) {
      console.error("Upload profile picture error:", error);
      return { success: false, error: error.message || "Failed to upload profile picture" };
    }
  };

  const removeProfilePicture = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !firebaseUser) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Remove photo URL from profile
      const result = await updateUserProfile({ photoURL: null });

      if (!result.success) {
        return { success: false, error: "Failed to remove profile picture" };
      }

      return { success: true };
    } catch (error: any) {
      logger.error("Remove profile picture error", { uid: user.uid, error: error.message });
      return { success: false, error: error.message || "Failed to remove profile picture" };
    }
  };

  const addMoneyToWallet = async (amount: number, note?: string): Promise<{ success: boolean; error?: string; transaction?: any }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      logger.info("Adding money to wallet via secure API", { amount, note });

      const result = await callSecureApi('/api/update-wallet', {
        amount,
        type: 'add',
        note: note || 'Manual deposit'
      });

      if (result.success) {
        logger.info("Wallet updated successfully via server");
        // No need to manually update local state as the onValue listener will sync it
        return { success: true, transaction: result.transaction };
      }

      return { success: false, error: "Failed to add money" };
    } catch (error: any) {
      logger.error("Add money API error", { amount, error: error.message });
      return { success: false, error: error.message || "Failed to add money" };
    }
  };

  const deductMoneyFromWallet = async (amount: number, note?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      logger.info("Deducting money from wallet via secure API", { amount, note });

      const result = await callSecureApi('/api/update-wallet', {
        amount,
        type: 'deduct',
        note: note || 'Manual withdrawal'
      });

      if (result.success) {
        logger.info("Wallet deducted successfully via server");
        return { success: true };
      }

      return { success: false, error: "Failed to deduct money" };
    } catch (error: any) {
      logger.error("Deduct money API error", { amount, error: error.message });
      return { success: false, error: error.message || "Failed to deduct money" };
    }
  };

  // CORRECTED: Enterprise-grade settlement management functions with group awareness
  const getWalletBalance = (): number => {
    const balance = user?.walletBalance || 0;
    return isNaN(balance) ? 0 : balance;
  };

  const getSettlements = (groupId?: string): { [personId: string]: { toReceive: number; toPay: number } } => {
    if (!user?.settlements) return {};

    if (groupId) {
      // Return settlements for specific group
      return user.settlements[groupId] || {};
    } else {
      // Return aggregated settlements across all groups
      const aggregated: { [personId: string]: { toReceive: number; toPay: number } } = {};

      Object.values(user.settlements).forEach(groupSettlements => {
        Object.entries(groupSettlements).forEach(([personId, settlement]) => {
          if (!aggregated[personId]) {
            aggregated[personId] = { toReceive: 0, toPay: 0 };
          }
          aggregated[personId].toReceive += settlement.toReceive;
          aggregated[personId].toPay += settlement.toPay;
        });
      });

      return aggregated;
    }
  };

  const getTotalToReceive = (groupId?: string): number => {
    const settlements = getSettlements(groupId);
    if (!settlements || Object.keys(settlements).length === 0) return 0;

    return Object.values(settlements).reduce((sum, settlement) => {
      const amount = settlement?.toReceive || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  const getTotalToPay = (groupId?: string): number => {
    const settlements = getSettlements(groupId);
    if (!settlements || Object.keys(settlements).length === 0) return 0;

    return Object.values(settlements).reduce((sum, settlement) => {
      const amount = settlement?.toPay || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  const getSettlementDelta = (groupId?: string): number => {
    const toReceive = getTotalToReceive(groupId);
    const toPay = getTotalToPay(groupId);

    if (isNaN(toReceive) || isNaN(toPay)) return 0;
    return toReceive - toPay;
  };



  const markPaymentReceived = async (groupId: string, personId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || amount <= 0) {
      return { success: false, error: "Invalid amount or user not authenticated" };
    }

    try {
      logger.info("Marking payment received via secure API", { groupId, personId, amount });

      const result = await callSecureApi('/api/record-payment', {
        groupId,
        fromMember: personId,
        toMember: user.uid,
        amount,
        method: "cash",
        note: `Payment received from settlement`
      });

      if (result.success) {
        logger.info("Payment marked received successfully via server", { transactionId: result.transactionId });
        return { success: true };
      }

      return { success: false, error: "Failed to mark payment as received" };
    } catch (error: any) {
      logger.error("Mark payment received API error", { uid: user.uid, groupId, personId, amount, error: error.message });
      return { success: false, error: error.message || "Failed to mark payment as received" };
    }
  };

  const markDebtPaid = async (groupId: string, personId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || amount <= 0) {
      return { success: false, error: "Invalid amount or user not authenticated" };
    }

    try {
      logger.info("Marking debt paid via secure API", { groupId, personId, amount });

      const result = await callSecureApi('/api/record-payment', {
        groupId,
        fromMember: user.uid,
        toMember: personId,
        amount,
        method: "online",
        note: `Debt payment from wallet`
      });

      if (result.success) {
        logger.info("Debt marked paid successfully via server", { transactionId: result.transactionId });
        return { success: true };
      }

      return { success: false, error: "Failed to mark debt as paid" };
    } catch (error: any) {
      logger.error("Mark debt paid API error", { uid: user.uid, groupId, personId, amount, error: error.message });
      return { success: false, error: error.message || "Failed to mark debt as paid" };
    }
  };

  // Stub implementations for new interface methods
  const getIndividualDebts = async (groupId: string, personId: string) => {
    if (!user) return { youOwe: [], theyOwe: [], totalYouOwe: 0, totalTheyOwe: 0, netAmount: 0 };

    try {
      // Use backend endpoint for performance (server-side filtering)
      const result = await callSecureApi('/api/get-individual-debts', { groupId, personId });

      if (result.success) {
        // Return summary directly (stripping success flag if needed, but the interface accepts extra props)
        const { success, ...summary } = result;
        return summary;
      }

      return { youOwe: [], theyOwe: [], totalYouOwe: 0, totalTheyOwe: 0, netAmount: 0 };

    } catch (error) {
      console.error("Error fetching individual debts:", error);
      return { youOwe: [], theyOwe: [], totalYouOwe: 0, totalTheyOwe: 0, netAmount: 0 };
    }
  };

  const addIndividualDebt = async (groupId: string, personId: string, debt: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: "Not authenticated" };

      const amount = parseFloat(debt.amount);
      if (isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" };

      const isYouOwe = debt.direction === 'youOwe';

      const payerId = isYouOwe ? personId : user.uid;
      const debtorId = isYouOwe ? user.uid : personId;

      const payload = {
        groupId,
        amount,
        note: debt.note || 'Manual debt',
        place: 'Manual Entry',
        paidBy: payerId,
        participants: [
          // Explicitly define consumer and amount to ensure correct debt calculation
          // If debtor is the only participant, they are responsible for the full amount
          { id: debtorId, amount: amount }
        ],
      };

      return await callSecureApi('/api/add-expense', payload);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const settleIndividualDebt = async (groupId: string, personId: string, debtId: string, amount?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: "Not authenticated" };
      if (!amount) return { success: false, error: "Amount is required for settlement" };
      return await markDebtPaid(groupId, personId, amount);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const settleNetAmount = async (groupId: string, personId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const debts = await getIndividualDebts(groupId, personId);
      if (debts.netAmount < 0) {
        return await markDebtPaid(groupId, personId, amount);
      } else if (debts.netAmount > 0) {
        return await markPaymentReceived(groupId, personId, amount);
      } else {
        return { success: false, error: "No debt to settle" };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Favorite groups functions
  const toggleFavoriteGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const currentFavorites = user.favoriteGroups || [];
      const newFavorites = currentFavorites.includes(groupId)
        ? currentFavorites.filter(id => id !== groupId)
        : [...currentFavorites, groupId];

      const userRef = ref(database, `users/${user.uid}/favoriteGroups`);
      await set(userRef, newFavorites);

      // Update local state
      setUser(prev => prev ? { ...prev, favoriteGroups: newFavorites } : null);

      return { success: true };
    } catch (error: any) {
      logger.error("Failed to toggle favorite group", { error: error.message, groupId });
      return { success: false, error: error.message };
    }
  };

  const getFavoriteGroups = (): string[] => {
    return user?.favoriteGroups || [];
  };

  const createGroup = async (groupData: any): Promise<{ success: boolean; groupId?: string; error?: string }> => {
    try {
      const result = await callSecureApi('/api/create-group', groupData);
      if (result.success && result.groupId) {
        // Optionally refresh user profile or groups here if needed
        // But existing listeners should handle it
        return { success: true, groupId: result.groupId };
      }
      return { success: false, error: result.error || "Failed to create group" };
    } catch (e: any) {
      console.error("Create Group Error", e);
      return { success: false, error: e.message };
    }
  };

  // Check if a username is available
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
      // Normalize username: lowercase, alphanumeric + underscore only
      const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9._]/g, '');

      if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
        return false; // Invalid length
      }

      const usernameRef = ref(database, `usernames/${normalizedUsername}`);
      const snapshot = await get(usernameRef);

      return !snapshot.exists(); // Available if doesn't exist
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false; // Assume not available on error
    }
  };

  // Check 2FA verification status in session
  useEffect(() => {
    if (user && user.is2FAEnabled) {
      const isSessionVerified = sessionStorage.getItem(`2fa_verified_${user.uid}`);
      if (isSessionVerified === 'true') {
        setIs2FAVerified(true);
      } else {
        setIs2FAVerified(false);
      }
    } else {
      setIs2FAVerified(false);
    }
  }, [user?.uid, user?.is2FAEnabled]);

  const verify2FA = async (token: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };
    try {
      const result = await callSecureApi('/api/2fa/verify', { token });
      if (result.success) {
        setIs2FAVerified(true);
        sessionStorage.setItem(`2fa_verified_${user.uid}`, 'true');
        return { success: true };
      }
      return { success: false, error: result.error || "Verification failed" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const setup2FA = async (): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };
    try {
      const result = await callSecureApi('/api/2fa/setup', {});
      if (result.success) {
        return { success: true, secret: result.secret, qrCode: result.qrCode };
      }
      return { success: false, error: result.error || "Setup failed" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const confirm2FASetup = async (token: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };
    try {
      const result = await callSecureApi('/api/2fa/verify-setup', { token });
      if (result.success) {
        // Optimistic update
        const updatedUser = { ...user, is2FAEnabled: true };
        setUser(updatedUser);
        setIs2FAVerified(true); // Auto-verify on setup
        sessionStorage.setItem(`2fa_verified_${user.uid}`, 'true');
        return { success: true };
      }
      return { success: false, error: result.error || "Confirmation failed" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const disable2FA = async (token: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };
    try {
      const result = await callSecureApi('/api/2fa/disable', { token });
      if (result.success) {
        // Optimistic update
        const updatedUser = { ...user, is2FAEnabled: false };
        setUser(updatedUser);
        setIs2FAVerified(false);
        sessionStorage.removeItem(`2fa_verified_${user.uid}`);
        return { success: true };
      }
      return { success: false, error: result.error || "Disable failed" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <FirebaseAuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading,
      login,
      signup,
      logout,
      updateUserPassword,
      resetPassword,
      sendPasswordResetEmail: sendPasswordResetEmailFirebase,
      confirmPasswordReset: confirmPasswordResetFirebase,
      checkEmailExists,
      checkUsernameAvailable,
      markEmailAsVerified,
      updateUserProfile,
      uploadProfilePicture,
      removeProfilePicture,
      addMoneyToWallet,
      deductMoneyFromWallet,
      getWalletBalance,
      getSettlements,
      getTotalToReceive,
      getTotalToPay,
      getSettlementDelta,
      markPaymentReceived,
      markDebtPaid,
      getIndividualDebts,
      addIndividualDebt,
      settleIndividualDebt,
      settleNetAmount,
      toggleFavoriteGroup,
      getFavoriteGroups,
      createGroup,
      deleteAccount,
      is2FAVerified,
      verify2FA,
      setup2FA,
      confirm2FASetup,
      disable2FA
    }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
};