import { AlertCircle, Wifi, DollarSign, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  type: "insufficient_funds" | "network_error" | "invalid_amount" | "validation_error" | "general";
  message?: string;
  amount?: number;
  availableAmount?: number;
  onRetry?: () => void;
  onAddMoney?: () => void;
  onDismiss?: () => void;
}

const ErrorAlert = ({ 
  type, 
  message, 
  amount, 
  availableAmount, 
  onRetry, 
  onAddMoney, 
  onDismiss 
}: ErrorAlertProps) => {
  const getErrorContent = () => {
    switch (type) {
      case "insufficient_funds":
        return {
          icon: <DollarSign className="w-5 h-5 text-red-600" />,
          title: "💰 Insufficient Available Budget",
          description: `You need Rs ${amount?.toLocaleString()} but only have Rs ${availableAmount?.toLocaleString()} available`,
          actions: (
            <div className="flex gap-2 mt-3">
              {onAddMoney && (
                <Button size="sm" onClick={onAddMoney} className="bg-blue-600 hover:bg-blue-700">
                  Add Money
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="outline" onClick={onDismiss}>
                  Cancel
                </Button>
              )}
            </div>
          )
        };
      
      case "network_error":
        return {
          icon: <Wifi className="w-5 h-5 text-red-600" />,
          title: "🌐 Connection Error",
          description: message || "Please check your internet connection and try again",
          actions: (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button size="sm" onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="outline" onClick={onDismiss}>
                  Cancel
                </Button>
              )}
            </div>
          )
        };
      
      case "invalid_amount":
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          title: "❌ Invalid Amount",
          description: message || "Please enter a valid amount greater than Rs 0",
          actions: onDismiss && (
            <Button size="sm" variant="outline" onClick={onDismiss} className="mt-3">
              OK
            </Button>
          )
        };
      
      case "validation_error":
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          title: "⚠️ Validation Error",
          description: message || "Please check your input and try again",
          actions: onDismiss && (
            <Button size="sm" variant="outline" onClick={onDismiss} className="mt-3">
              OK
            </Button>
          )
        };
      
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          title: "❌ Error",
          description: message || "Something went wrong. Please try again.",
          actions: (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button size="sm" onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="outline" onClick={onDismiss}>
                  OK
                </Button>
              )}
            </div>
          )
        };
    }
  };

  const content = getErrorContent();

  return (
    <Alert className="border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        {content.icon}
        <div className="flex-1">
          <h4 className="font-medium text-red-800 mb-1">{content.title}</h4>
          <AlertDescription className="text-red-700 text-sm">
            {content.description}
          </AlertDescription>
          {content.actions}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </Alert>
  );
};

export default ErrorAlert;