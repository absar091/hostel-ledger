import { CheckCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuccessAlertProps {
  message: string;
  onDismiss?: () => void;
}

const SuccessAlert = ({ message, onDismiss }: SuccessAlertProps) => {
  return (
    <Alert className="border-green-200 bg-green-50">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <AlertDescription className="text-green-700 text-sm font-medium">
            {message}
          </AlertDescription>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </Alert>
  );
};

export default SuccessAlert;