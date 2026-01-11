interface MetricCardProps {
  label: string;
  amount: string | number;
  helperText?: string;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  size?: 'large' | 'medium';
  className?: string;
}

const MetricCard = ({ 
  label, 
  amount, 
  helperText, 
  variant = 'default',
  size = 'medium',
  className = '' 
}: MetricCardProps) => {
  const getAmountColor = () => {
    switch (variant) {
      case 'positive': return 'text-signal-positive';
      case 'negative': return 'text-signal-negative';
      case 'neutral': return 'text-signal-neutral';
      default: return 'text-text-primary';
    }
  };

  const getAmountSize = () => {
    return size === 'large' ? 'text-amount-l' : 'text-amount-m';
  };

  return (
    <div className={`bg-bg-card border border-border-subtle rounded-card p-5 flex flex-col gap-2 ${className}`}>
      <div className="text-caption text-text-secondary">
        {label}
      </div>
      <div className={`${getAmountSize()} ${getAmountColor()} font-semibold`}>
        {typeof amount === 'number' ? `Rs ${amount.toLocaleString()}` : amount}
      </div>
      {helperText && (
        <div className="text-caption text-text-muted">
          {helperText}
        </div>
      )}
    </div>
  );
};

export default MetricCard;