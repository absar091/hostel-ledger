import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Send } from "@/lib/icons";
import { toast } from "sonner";

interface ShareButtonProps {
  className?: string;
  variant?: "icon" | "button" | "card";
  size?: "sm" | "md" | "lg";
}

const ShareButton = ({ className = "", variant = "button", size = "md" }: ShareButtonProps) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://hostelledger.aarx.online";
  const shareTitle = "Hostel Ledger - Split Expenses with Ease 💰";
  const shareText = "🎯 Check out this amazing app for splitting expenses with friends and roommates! Perfect for students and groups. Track shared expenses and settle debts instantly! 💸✨";

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Thanks for sharing! 🎉");
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          handleCopyLink();
        }
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 2000);
      setShowShareMenu(false);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
    setShowShareMenu(false);
    toast.success("Opening WhatsApp... 📱");
  };

  const handleTelegramShare = () => {
    const telegramText = encodeURIComponent(shareText);
    const telegramUrl = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${telegramUrl}&text=${telegramText}`, '_blank');
    setShowShareMenu(false);
    toast.success("Opening Telegram... 📱");
  };

  const handleFacebookShare = () => {
    const facebookUrl = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${facebookUrl}`, '_blank');
    setShowShareMenu(false);
    toast.success("Opening Facebook... 📘");
  };

  const handleTwitterShare = () => {
    const twitterText = encodeURIComponent(`${shareText} ${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${twitterText}`, '_blank');
    setShowShareMenu(false);
    toast.success("Opening Twitter... 🐦");
  };

  // Icon variant
  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={handleNativeShare}
          className={`w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors ${className}`}
        >
          <Share2 className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    );
  }

  // Card variant
  if (variant === "card") {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Share Hostel Ledger</h3>
          <p className="text-sm text-gray-500 mb-6">
            Help your friends discover the easiest way to split expenses and manage group finances!
          </p>
          <button
            onClick={handleNativeShare}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
          >
            Share with Friends 🎉
          </button>
        </div>
      </div>
    );
  }

  // Button variant (default)
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base"
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className={`bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 ${sizeClasses[size]} ${className}`}
      >
        <Share2 className="w-4 h-4" />
        Share App
      </button>

      {/* Share Menu Modal */}
      {showShareMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Share Hostel Ledger</h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-600 text-lg">×</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Choose how you'd like to share this amazing expense splitting app!
              </p>
            </div>

            {/* Share Options */}
            <div className="p-6 space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                  {copied ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Copy className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {copied ? "Link Copied!" : "Copy Link"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {copied ? "Ready to paste anywhere" : "Copy URL to clipboard"}
                  </div>
                </div>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">WhatsApp</div>
                  <div className="text-sm text-gray-500">Share with contacts</div>
                </div>
              </button>

              <button
                onClick={handleTelegramShare}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Telegram</div>
                  <div className="text-sm text-gray-500">Share in chats</div>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleFacebookShare}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">f</span>
                  </div>
                  <span className="text-sm font-medium text-blue-700">Facebook</span>
                </button>

                <button
                  onClick={handleTwitterShare}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors"
                >
                  <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">𝕏</span>
                  </div>
                  <span className="text-sm font-medium text-sky-700">Twitter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;