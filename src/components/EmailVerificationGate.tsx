import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import VerifyEmail from "@/pages/VerifyEmail";

/**
 * EmailVerificationGate - Blocks unverified users from accessing the app
 * This prevents fake users and database pollution
 */
const EmailVerificationGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useFirebaseAuth();

  // Check if user email is verified
  const isEmailVerified = user?.emailVerified === true;

  // If email is verified, render the app
  if (isEmailVerified) {
    return <>{children}</>;
  }

  // If not verified, show verification page (which handles resend/logout internally)
  return <VerifyEmail />;
};

export default EmailVerificationGate;
