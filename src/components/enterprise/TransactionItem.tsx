interface TransactionItemProps {
  title: string;
  metaLine1: string;
  metaLine2?: string;
  amount: number;
  isLast?: boolean;
}

const TransactionItem = ({ 
  title, 
  metaLine1, 
  metaLine2, 
  amount,
  isLast = false 
}: TransactionItemProps) => {
  return (
    <div className={`p-4 flex justify-between items-start ${!isLast ? 'border-b border-border-subtle' : ''}`}>
      <div className="flex-1">
        <div className="text-body text-text-primary font-medium">
          {title}
        </div>
        <div className="text-caption text-text-secondary mt-1">
          {metaLine1}
        </div>
        {metaLine2 && (
          <div className="text-caption text-text-muted mt-0.5">
            {metaLine2}
          </div>
        )}
      </div>
      <div className="text-body text-text-primary font-medium ml-4">
        Rs {amount.toLocaleString()}
      </div>
    </div>
  );
};

export default TransactionItem;