import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, database } from "@/lib/firebase";

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
  phone?: string;
  avatar?: string;
  paymentDetails: PaymentDetails;
  walletBalance: number;
  createdAt: string;
}

interface FirebaseAuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; name: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number) => Promise<{ success: boolean; error?: string }>;
  deductMoneyFromWallet: (amount: number) => Promise<{ success: boolean; error?: string }>;
  getWalletBalance: () => number;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        // Fetch user profile from Realtime Database
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          uid,
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          avatar: userData.avatar,
          paymentDetails: userData.paymentDetails || {},
          walletBalance: userData.walletBalance || 0,
          createdAt: userData.createdAt
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(userCredential.user.uid);
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
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
    name: string; 
    phone?: string 
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: data.name
      });

      // Create user profile in Realtime Database
      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: data.email,
        name: data.name,
        phone: data.phone,
        paymentDetails: {},
        walletBalance: 0,
        createdAt: new Date().toISOString()
      };

      const userRef = ref(database, `users/${firebaseUser.uid}`);
      await set(userRef, userProfile);

      setUser(userProfile);
      return { success: true };
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "Signup failed";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "An account with this email already exists";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/weak-password':
          errorMessage = "Password should be at least 6 characters";
          break;
        default:
          errorMessage = error.message || "Signup failed";
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user || !firebaseUser) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, data);
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
      
      return { success: true };
    } catch (error: any) {
      console.error("Update profile error:", error);
      return { success: false, error: error.message || "Failed to update profile" };
    }
  };

  const addMoneyToWallet = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || amount <= 0) {
      return { success: false, error: "Invalid amount or user not authenticated" };
    }

    try {
      const newBalance = user.walletBalance + amount;
      const userRef = ref(database, `users/${user.uid}/walletBalance`);
      await set(userRef, newBalance);
      
      // Update local state
      setUser(prev => prev ? { ...prev, walletBalance: newBalance } : null);
      
      return { success: true };
    } catch (error: any) {
      console.error("Add money error:", error);
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
      console.error("Deduct money error:", error);
      return { success: false, error: error.message || "Failed to deduct money" };
    }
  };

  const getWalletBalance = (): number => {
    return user?.walletBalance || 0;
  };

  return (
    <FirebaseAuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading,
      login,
      signup,
      logout,
      updateUserProfile,
      addMoneyToWallet,
      deductMoneyFromWallet,
      getWalletBalance
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