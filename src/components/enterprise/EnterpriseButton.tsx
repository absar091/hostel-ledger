import { ReactNode } from "react";

interface EnterpriseButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const EnterpriseButton = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false,
  className = '' 
}: EnterpriseButtonProps) => {
  const baseClasses = "h-12 rounded-button text-body font-medium flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-signal-neutral text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-transparent border border-border-subtle text-text-primary hover:bg-bg-surface"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default EnterpriseButton;