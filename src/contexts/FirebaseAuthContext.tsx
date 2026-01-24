import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import { ref, set, get, update, push, onValue, off } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { retryOperation } from "@/lib/transaction";
import {
  sanitizeInput,
  isValidEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateAmount
} from "@/lib/security";

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
  name: string;
  phone?: string | null;
  avatar?: string | null;
  photoURL?: string | null; // Profile picture URL from Cloudinary
  paymentDetails: PaymentDetails;
  walletBalance: number; // Available Budget (actual money you have)
  createdAt: string;
  emailVerified?: boolean; // Email verification status
  favoriteGroups?: string[]; // Array of favorite group IDs
}

interface FirebaseAuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    university?: string;
    emailVerified?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailExists: (email: string) => Promise<boolean>;
  markEmailAsVerified: (uid: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeProfilePicture: () => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number) => Promise<{ success: boolean; error?: string }>;
  deductMoneyFromWallet: (amount: number) => Promise<{ success: boolean; error?: string }>;
  getWalletBalance: () => number;
  // Favorite groups
  toggleFavoriteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  getFavoriteGroups: () => string[];
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Shorter timeout when offline (2s), longer when online (5s)
    const timeoutDuration = navigator.onLine ? 5000 : 2000;
    
    // Set a timeout to force loading to complete
    // This prevents infinite loading when offline
    const loadingTimeout = setTimeout(() => {
      console.warn(`⚠️ Auth loading timeout (${timeoutDuration}ms) - checking localStorage cache`);
      
      // Try to load cached user from localStorage
      try {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          console.log('✅ Loaded cached user from localStorage', parsedUser.uid);
          setUser(parsedUser);
          setFirebaseUser(null); // No Firebase user when offline
        }
      } catch (error) {
        console.error('Failed to load cached user:', error);
      }
      
      setIsLoading(false);
    }, timeoutDuration);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(loadingTimeout); // Clear timeout if auth completes normally
      
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setFirebaseUser(null);
        setUser(null);
        // Clear cached user when logging out
        localStorage.removeItem('cachedUser');
      }
      setIsLoading(false);
    }, (error) => {
      clearTimeout(loadingTimeout);
      logger.error("Auth state change error", { error: error.message });
      
      // Try to load cached user from localStorage on error
      try {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          console.log('✅ Loaded cached user from localStorage after auth error', parsedUser.uid);
          setUser(parsedUser);
        }
      } catch (cacheError) {
        console.error('Failed to load cached user:', cacheError);
      }
      
      setIsLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (uid: string) => {
    try {
      logger.debug("Fetching user profile", { uid });
      const userRef = ref(database, `users/${uid}`);
      const verificationRef = ref(database, `emailVerification/${uid}`);

      const [userSnapshot, verificationSnapshot] = await Promise.all([
        retryOperation(() => get(userRef)),
        retryOperation(() => get(verificationRef))
      ]);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const verificationData = verificationSnapshot.exists() ? verificationSnapshot.val() : {};

        logger.debug("User profile loaded from database", { uid });

        const userProfile: UserProfile = {
          uid,
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          avatar: userData.avatar,
          photoURL: userData.photoURL || null, // Load profile picture URL
          paymentDetails: userData.paymentDetails || {},
          walletBalance: isNaN(userData.walletBalance) ? 0 : (userData.walletBalance || 0),
          createdAt: userData.createdAt,
          emailVerified: verificationData.emailVerified || false
        };

        setUser(userProfile);
        logger.setUserId(uid);
        
        // Cache user profile to localStorage for offline access
        try {
          localStorage.setItem('cachedUser', JSON.stringify(userProfile));
          console.log('✅ Cached user profile to localStorage');
        } catch (error) {
          console.error('Failed to cache user profile:', error);
        }
      } else {
        logger.info("Creating new user profile", { uid });

        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const newUserProfile: UserProfile = {
            uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "User",
            phone: null,
            avatar: null,
            paymentDetails: {},
            walletBalance: 0,
            createdAt: new Date().toISOString(),
            emailVerified: false
          };

          await retryOperation(() => set(userRef, newUserProfile));
          setUser(newUserProfile);
          logger.setUserId(uid);
          logger.info("User profile created successfully", { uid });
        } else {
          logger.warn("No Firebase user found, cannot create profile");
          setUser(null);
        }
      }
    } catch (error: any) {
      logger.error("Error fetching/creating user profile", { uid, error: error.message });
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

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
      logger.info("Login successful", { uid: userCredential.user.uid });

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
      setIsLoading(false);
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    university?: string;
    emailVerified?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

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
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: sanitizedEmail,
          name: sanitizedName,
          phone: sanitizedPhone,
          paymentDetails: {},
          walletBalance: 0,
          createdAt: new Date().toISOString()
        };

        const userRef = ref(database, `users/${firebaseUser.uid}`);
        await set(userRef, userProfile);

        // Store email verification status and creation time for cleanup
        const verificationRef = ref(database, `emailVerification/${firebaseUser.uid}`);
        await set(verificationRef, {
          emailVerified: data.emailVerified || false,
          createdAt: new Date().toISOString(),
          email: sanitizedEmail
        });

        return { success: true };

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
      setIsLoading(false);
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

      // Primary check: Use backend API with Firebase Admin SDK
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
              logger.info('Email exists', { email });
              return true;
            } else {
              logger.info('Email is available', { email });
              return false;
            }
          }
        } else {
          logger.warn('Backend email check failed, falling back to Firebase Auth', { email });
        }
      } catch (backendError: any) {
        console.warn('⚠️ Backend email check error, falling back to Firebase Auth:', backendError.message);
      }

      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          logger.info('Email exists in Firebase Auth', { email, methods });
          return true;
        }
      } catch (authError: any) {
        console.warn('⚠️ Firebase Auth check failed:', authError.message);
        // If auth check fails, we can't determine if email exists
        // Return false to allow signup attempt (Firebase will catch duplicates during signup)
      }

      console.log('✅ Email is available:', email);
      return false;

    } catch (error: any) {
      console.error("❌ Error checking email existence:", error);
      // In case of error, return false to allow signup (Firebase will catch duplicates during actual signup)
      return false;
    }
  };

  const markEmailAsVerified = async (uid: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Update email verification status in database
      const verificationRef = ref(database, `emailVerification/${uid}`);
      await update(verificationRef, {
        emailVerified: true,
        verifiedAt: new Date().toISOString()
      });

      // Update user profile in memory
      if (user && user.uid === uid) {
        setUser({
          ...user,
          emailVerified: true
        });
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

  const addMoneyToWallet = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // const validation = validateAmount(amount);
    // if (!validation.isValid) {
    //   return { success: false, error: validation.error || "Invalid amount" };
    // }

    try {
      // const sanitizedAmount = sanitizeAmount(amount);
      const sanitizedAmount = Math.max(0, Math.min(amount, 1000000));
      const newWalletBalance = user.walletBalance + sanitizedAmount;

      const userRef = ref(database, `users/${user.uid}`);
      await retryOperation(() => update(userRef, {
        walletBalance: newWalletBalance
      }));

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        walletBalance: newWalletBalance
      } : null);

      logger.logTransaction("wallet_add", sanitizedAmount, true);
      return { success: true };
    } catch (error: any) {
      logger.error("Add money to wallet failed", { amount, error: error.message });
      return { success: false, error: error.message || "Failed to add money" };
    }
  };

  const deductMoneyFromWallet = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || amount <= 0) {
      return { success: false, error: "Invalid amount or user not authenticated" };
    }

    if (user.walletBalance < amount) {
      return { success: false, error: "Insufficient wallet balance" };
    }

    try {
      const newBalance = user.walletBalance - amount;
      const userRef = ref(database, `users/${user.uid}/walletBalance`);
      await set(userRef, newBalance);

      // Update local state
      setUser(prev => prev ? { ...prev, walletBalance: newBalance } : null);

      return { success: true };
    } catch (error: any) {
      logger.error("Deduct money error", { uid: user.uid, amount, error: error.message });
      return { success: false, error: error.message || "Failed to deduct money" };
    }
  };

  // CORRECTED: Enterprise-grade settlement management functions with group awareness
  const getWalletBalance = (): number => {
    const balance = user?.walletBalance || 0;
    return isNaN(balance) ? 0 : balance;
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

  return (
    <FirebaseAuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading,
      login,
      signup,
      logout,
      resetPassword,
      sendPasswordResetEmail: sendPasswordResetEmailFirebase,
      confirmPasswordReset: confirmPasswordResetFirebase,
      checkEmailExists,
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
      updateSettlement,
      addToReceivable,
      addToPayable,
      markPaymentReceived,
      markDebtPaid,
      getIndividualDebts,
      addIndividualDebt,
      settleIndividualDebt,
      settleNetAmount,
      toggleFavoriteGroup,
      getFavoriteGroups
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