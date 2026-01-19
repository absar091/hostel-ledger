import { useState, ReactNode, useEffect, useRef } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: string;
  children?: ReactNode;
  showIcon?: boolean;
  iconSize?: "sm" | "md";
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const Tooltip = ({ 
  content, 
  children, 
  showIcon = true, 
  iconSize = "sm",
  position = "top",
  className = ""
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip would go off screen and adjust position
      let newPosition = position;
      
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight - 10) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right';
      } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth - 10) {
        newPosition = 'left';
      }
      
      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isVisible &&
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3"
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900"
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5"
  };

  const toggleTooltip = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    
    // Auto-hide after 4 seconds if showing
    if (newVisibility) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={triggerRef}>
      <div
        className="cursor-pointer touch-target flex items-center justify-center select-none"
        onClick={toggleTooltip}
        onTouchEnd={toggleTooltip}
      >
        {children || (
          showIcon && (
            <HelpCircle className={`${iconSizeClasses[iconSize]} text-gray-400 hover:text-gray-600 transition-colors`} />
          )
        )}
      </div>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`absolute z-[70] ${positionClasses[actualPosition]}`}
          style={{ 
            maxWidth: '320px',
            minWidth: '240px'
          }}
        >
          <div className="bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-2xl border border-gray-700">
            <div className="leading-relaxed font-medium">{content}</div>
            <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[actualPosition]}`}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;