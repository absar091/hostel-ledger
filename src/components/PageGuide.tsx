import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";

interface PageGuideProps {
  title: string;
  description: string;
  tips?: string[];
  emoji?: string;
  show: boolean;
  onClose: () => void;
}

const PageGuide = ({ title, description, tips = [], emoji = "💡", show, onClose }: PageGuideProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  if (!show || !isVisible) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-sm">{emoji}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight pr-2">
                {title}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              {description}
            </p>
            
            {tips.length > 0 && (
              <div className="space-y-1.5">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Info className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600 leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="w-full mt-3 py-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default PageGuide;