import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotificationIcon = () => {
  const handleNotificationClick = () => {
    // Future: Handle notification center or settings
    console.log("Notification center clicked");
  };

  return (
    <Button
      onClick={handleNotificationClick}
      variant="outline"
      size="sm"
      className="flex items-center justify-center w-10 h-10 p-0 bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-full"
    >
      <Bell className="w-5 h-5" />
    </Button>
  );
};

export default NotificationIcon;