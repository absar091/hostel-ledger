import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { auth, database } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const AuthDebug = () => {
  const { user, firebaseUser, isLoading } = useFirebaseAuth();

  const testFirebaseConnection = () => {
    console.log("🔥 Firebase Auth:", auth);
    console.log("🔥 Firebase Database:", database);
    console.log("🔥 Auth Config:", auth.config);
    console.log("🔥 Current Auth State:", { user, firebaseUser, isLoading });
  };

  const testLogin = async () => {
    try {
      console.log("🔥 Testing Firebase Auth with dummy credentials...");
      // This will fail but show us the exact error
      await signInWithEmailAndPassword(auth, "test@test.com", "password");
    } catch (error: any) {
      console.log("🔥 Auth Test Error Code:", error.code);
      console.log("🔥 Auth Test Error Message:", error.message);
      if (error.code === 'auth/operation-not-allowed') {
        console.log("🚨 FIREBASE AUTHENTICATION IS NOT ENABLED!");
        console.log("🚨 Go to Firebase Console and enable Email/Password authentication");
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-card p-4 rounded-lg shadow-lg border z-50 max-w-sm text-xs">
      <h3 className="font-semibold mb-2">🔐 Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: {isLoading ? "✅ Yes" : "❌ No"}</div>
        <div>Firebase User: {firebaseUser ? "✅ Logged in" : "❌ Not logged in"}</div>
        <div>User Profile: {user ? "✅ Loaded" : "❌ Not loaded"}</div>
        {firebaseUser && (
          <div>UID: {firebaseUser.uid.substring(0, 8)}...</div>
        )}
        {user && (
          <div>Name: {user.name}</div>
        )}
        <div className="space-x-2">
          <button 
            onClick={testFirebaseConnection}
            className="text-blue-500 underline text-xs"
          >
            Test Firebase
          </button>
          <button 
            onClick={testLogin}
            className="text-red-500 underline text-xs"
          >
            Test Auth
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Remove in production
      </div>
    </div>
  );
};

export default AuthDebug;