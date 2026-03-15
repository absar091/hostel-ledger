import { Navigate } from 'react-router-dom';
import { useFirebaseAuth as useAuth } from '@/contexts/FirebaseAuthContext';
import { Loader2 } from '@/lib/icons';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user exists, has an admin role, and is active
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin') || user.accountStatus !== 'active') {
    // Redirect unauthorized subjects to the standard dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
