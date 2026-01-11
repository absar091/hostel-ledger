import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface PaymentDetails {
  jazzCash?: string;
  easypaisa?: string;
  bankName?: string;
  accountNumber?: string;
  raastId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  paymentDetails: PaymentDetails;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; name: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = "hostel_wallet_users";
const CURRENT_USER_KEY = "hostel_wallet_current_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUserId) {
      const users = getUsers();
      const foundUser = users.find((u) => u.id === savedUserId);
      if (foundUser) {
        setUser(foundUser);
      }
    }
    setIsLoading(false);
  }, []);

  const getUsers = (): (UserProfile & { password: string })[] => {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const saveUsers = (users: (UserProfile & { password: string })[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = getUsers();
    const foundUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!foundUser) {
      return { success: false, error: "No account found with this email" };
    }
    
    if (foundUser.password !== password) {
      return { success: false, error: "Incorrect password" };
    }

    const { password: _, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem(CURRENT_USER_KEY, foundUser.id);
    
    return { success: true };
  };

  const signup = async (data: { email: string; password: string; name: string; phone?: string }): Promise<{ success: boolean; error?: string }> => {
    const users = getUsers();
    
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: "An account with this email already exists" };
    }

    const newUser: UserProfile & { password: string } = {
      id: crypto.randomUUID(),
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      paymentDetails: {},
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);
    
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!user) return;

    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === user.id);
    
    if (userIndex === -1) return;

    const updatedUser = { ...users[userIndex], ...data };
    users[userIndex] = updatedUser;
    saveUsers(users);

    const { password: _, ...userWithoutPassword } = updatedUser;
    setUser(userWithoutPassword);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
