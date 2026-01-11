import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  phone?: string | null;
  avatar?: string | null;
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
      console.log("🔥 Fetching user profile for UID:", uid); // Debug log
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log("🔥 Raw user data from database:", userData); // Debug log
        const userProfile: UserProfile = {
          uid,
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          avatar: userData.avatar,
          paymentDetails: userData.paymentDetails || {},
          walletBalance: userData.walletBalance || 0,
          createdAt: userData.createdAt
        };
        setUser(userProfile);
        console.log("🔥 User profile loaded successfully:", userProfile); // Debug log
      } else {
        console.log("🔥 No user profile found in database for UID:", uid); // Debug log
        console.log("🔥 Creating user profile from Firebase Auth data..."); // Debug log
        
        // Create user profile from Firebase Auth data
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
            createdAt: new Date().toISOString()
          };
          
          // Save to database
          await set(userRef, newUserProfile);
          setUser(newUserProfile);
          console.log("🔥 User profile created successfully:", newUserProfile); // Debug log
        } else {
          console.log("🔥 No Firebase user found, cannot create profile"); // Debug log
          setUser(null);
        }
      }
    } catch (error) {
      console.error("🔥 Error fetching/creating user profile:", error);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log("🔥 Attempting login for:", email); // Debug log
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("🔥 Firebase login successful, UID:", userCredential.user.uid); // Debug log
      console.log("🔥 Firebase user object:", userCredential.user); // Debug log
      
      // The onAuthStateChanged listener will handle fetching the profile
      // So we don't need to manually call fetchUserProfile here
      
      console.log("🔥 Login process completed, waiting for auth state change"); // Debug log
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

      // Create user profile in Realtime Database - Fix undefined values
      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: data.email,
        name: data.name,
        phone: data.phone || null, // Convert undefined to null
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
      // Clean data to remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      // Convert undefined to null for Firebase
      const firebaseData = Object.fromEntries(
        Object.entries(cleanData).map(([key, value]) => [key, value === undefined ? null : value])
      );

      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, firebaseData);
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...cleanData } : null);
      
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