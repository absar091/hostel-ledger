import { cn } from "@/lib/utils";
import { useState } from "react";

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const getInitials = (name: string) => {
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
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const Avatar = ({ name, photoURL, size = "md", className }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const showImage = photoURL && !imageError;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0 relative overflow-hidden",
        !showImage && getColorFromName(name),
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
            alt={name}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </>
      ) : (
        getInitials(name)
      )}
    </div>
  );
};

export default Avatar;
