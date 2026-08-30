import { cn } from "@/lib/utils";
import { useState, memo } from "react";

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getColorFromName = (name: string) => {
  const colors = [
    "bg-emerald-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
  ];
  if (!name || typeof name !== 'string') return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  // Handle NaN if charCodeAt is weird (shouldn't be for non-empty string)
  if (isNaN(index)) return colors[0];
  return colors[index];
};

const Avatar = ({ name, photoURL, size = "md", className }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Fallback for invalid name
  const safeName = name || "User";

  const sizeClasses = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const showImage = photoURL && !imageError;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0 relative overflow-hidden ring-1 ring-inset ring-black/5",
        !showImage && getColorFromName(safeName),
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={photoURL}
            alt={safeName}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </>
      ) : (
        getInitials(safeName)
      )}
    </div>
  );
};

// ⚡ Bolt Optimization: Wrapped Avatar component in React.memo to prevent unnecessary re-renders when parent components re-render, as Avatar props (name, photoURL) rarely change for a given user.
// Expected Impact: Reduces re-renders of Avatar components in long lists like TransactionList or GroupDetail.
export default memo(Avatar);
