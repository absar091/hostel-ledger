import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const LogoutConfirmDialog = ({ open, onOpenChange, onConfirm }: LogoutConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm mx-auto rounded-3xl border-2 border-gray-200">
        <AlertDialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <AlertDialogTitle className="text-xl font-bold text-gray-900">
            Leaving so soon?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 leading-relaxed">
            Are you sure you want to log out? You'll need to sign in again to access your expenses and groups.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 rounded-2xl transition-all duration-200"
          >
            Yes, Log Out
          </AlertDialogAction>
          <AlertDialogCancel className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl border-0 transition-all duration-200">
            Stay Logged In
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutConfirmDialog;