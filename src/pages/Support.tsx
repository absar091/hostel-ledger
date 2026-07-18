import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Mail,
  Phone,
  ArrowLeft,
  CircleCheck,
  Clock,
  CircleAlert,
  User,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ImageIcon,
  Paperclip,
  Trash2,
  FileText,
  X,
  Info,
  Sparkles,
} from "@/lib/icons";
import { ref, push, set, update, onValue, off, serverTimestamp } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AppContainer from "@/components/AppContainer";
import DesktopHeader from "@/components/DesktopHeader";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";

interface Message {
  id: string;
  text: string;
  sender: "user" | "admin";
  isBot?: boolean;
  timestamp: number;
  read?: boolean;
  image?: string;
  transactionRef?: {
    id: string;
    groupId: string;
    details?: any;
  };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  isAIActive?: boolean;
  talkToAgent?: boolean;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

const Support = () => {
  const navigate = useNavigate();
  const { user, firebaseUser } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "email" | "whatsapp">("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [referencedTxn, setReferencedTxn] = useState<any>(null);
  const [txnGroupId, setTxnGroupId] = useState<string>("");
  const [showTxnHint, setShowTxnHint] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const BOT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

  const SUPPORT_EMAIL = "support@aarx.online";
  const SUPPORT_WHATSAPP = "+923124029044";

  // Auto-scroll and handle bot sound/typing
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Play sound if bot message is new
    if (messages.length > lastMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === "admin" && lastMsg.isBot) {
        setIsBotTyping(false);
        const audio = new Audio(BOT_SOUND_URL);
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Sound play failed:", e));
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Load or create ticket
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    // Check for existing open tickets for this specific user
    const userTicketsRef = ref(database, `supportTickets/${user.uid}`);
    const unsubscribe = onValue(userTicketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const tickets = snapshot.val();
        
        // Find the most recent open/in-progress ticket
        const ticketsList = Object.entries(tickets)
          .map(([id, data]: [string, any]) => ({ id, ...data }))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        const userTicket = ticketsList.find(t => t.status !== "closed");

        if (userTicket) {
          const ticketData = userTicket as any;
          setCurrentTicket({
            ...ticketData,
            messages: ticketData.messages
              ? Object.entries(ticketData.messages).map(([id, msg]: [string, any]) => ({
                  id,
                  ...msg,
                }))
              : [],
          });
          setMessages(
            ticketData.messages
              ? Object.entries(ticketData.messages)
                  .map(([id, msg]: [string, any]) => ({
                    id,
                    ...msg,
                  }))
                  .sort((a, b) => a.timestamp - b.timestamp)
              : []
          );
        }
      }
      setIsLoading(false);
    });

    return () => off(userTicketsRef, "value", unsubscribe);
  }, [user]);

  const createNewTicket = async (initialMessage: string) => {
    if (!user) return;

    try {
      const ticketsRef = ref(database, `supportTickets/${user.uid}`);
      const newTicketRef = push(ticketsRef);
      // Use cryptographically secure random values instead of Date.now()
      const randomValue = new Uint32Array(1);
      globalThis.crypto.getRandomValues(randomValue);
      const randomHex = randomValue[0].toString(16).toUpperCase().padStart(8, '0');
      const ticketNumber = `TKT-${randomHex}`;

      const newTicket: Omit<Ticket, "id" | "messages"> & { messages: any } = {
        ticketNumber,
        userId: user.uid,
        userName: user.name || "User",
        userEmail: user.email || "",
        subject: initialMessage.substring(0, 50),
        status: "open",
        priority: "medium",
        isAIActive: true,
        talkToAgent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: {},
      };

      await set(newTicketRef, newTicket);

      // Add initial message
      const messagesRef = ref(database, `supportTickets/${user.uid}/${newTicketRef.key}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: initialMessage,
        sender: "user",
        timestamp: Date.now(),
        read: false,
      });

      // Send notification to admin dashboard
      const notificationRef = ref(database, `adminNotifications/${newTicketRef.key}`);
      await set(notificationRef, {
        type: "new_ticket",
        ticketId: newTicketRef.key,
        ticketNumber,
        userName: user.name || "User",
        userEmail: user.email || "",
        message: initialMessage.substring(0, 100),
        timestamp: Date.now(),
        read: false,
      });

      setIsBotTyping(true);
      toast.success(`Ticket Created: ${ticketNumber}`, {
        description: "Our support team will respond shortly",
      });

      return newTicketRef.key;
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create support ticket");
      return null;
    }
  };

  const handleTalkToAgent = async () => {
    if (!user || !currentTicket) return;

    try {
      const ticketRef = ref(database, `supportTickets/${user.uid}/${currentTicket.id}`);
      await update(ticketRef, {
        talkToAgent: true,
        isAIActive: false,
        status: "in_progress",
        updatedAt: Date.now()
      });

      // Add a message from user requesting agent
      const messagesRef = ref(database, `supportTickets/${user.uid}/${currentTicket.id}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: "I'd like to talk to a live agent, please.",
        sender: "user",
        timestamp: Date.now(),
        read: false
      });

      toast.success("Request sent", {
        description: "A live agent will join the chat shortly."
      });
    } catch (error) {
      console.error("Error requesting agent:", error);
      toast.error("Failed to request agent");
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && !attachedImage) || !user) return;

    setIsSending(true);

    try {
      let ticketId = currentTicket?.id;

      // Create new ticket if none exists
      if (!ticketId) {
        ticketId = await createNewTicket(message);
        if (!ticketId) {
          setIsSending(false);
          return;
        }
      } else {
        // Add message to existing ticket
        const messagesRef = ref(database, `supportTickets/${user.uid}/${ticketId}/messages`);
        const newMessageRef = push(messagesRef);
        
        const msgData: any = {
          text: message.trim(),
          sender: "user",
          timestamp: Date.now(),
          read: false,
        };

        if (attachedImage) {
          msgData.image = attachedImage;
        }

        if (referencedTxn) {
          msgData.transactionRef = {
            id: referencedTxn.id,
            groupId: txnGroupId,
            details: referencedTxn
          };
        }

        await set(newMessageRef, msgData);

        // Update ticket status and timestamp
        const ticketRef = ref(database, `supportTickets/${user.uid}/${ticketId}`);
        await update(ticketRef, {
          status: currentTicket.status === "resolved" ? "open" : currentTicket.status,
          updatedAt: Date.now(),
        });

        // Notify admin of new message
        const notificationRef = push(ref(database, `adminNotifications`));
        await set(notificationRef, {
          type: "new_message",
          ticketId,
          ticketNumber: currentTicket.ticketNumber,
          userName: user.name || "User",
          message: message.substring(0, 100),
          timestamp: Date.now(),
          read: false,
        });
      }

      setMessage("");
      setAttachedImage(null);
      setReferencedTxn(null);
      setTxnGroupId("");
      
      // If AI is active, show typing indicator
      if (currentTicket && !currentTicket.talkToAgent && currentTicket.status !== "closed") {
        setIsBotTyping(true);
      }
      
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const result = await uploadToCloudinary(file);
      
      if (result.success && result.url) {
        setAttachedImage(result.url);
        toast.success("Image attached");
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const detectTransactionId = async (text: string) => {
    // Robust detection: handles GROUP/ID, GROUP / ID, GROUP \ ID
    // Standard Firebase push IDs start with - and are alphanumeric/underscore/dash, ~20 chars
    const txnMatch = text.match(/([a-zA-Z0-9_-]+)\s*[\/\\]\s*([-a-zA-Z0-9_]{10,})/i);
    if (txnMatch) {
      const gId = txnMatch[1];
      const tId = txnMatch[2];
      fetchTxnPreview(tId, gId);
    }
  };

  const fetchTxnPreview = async (tId: string, gId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/get-transaction-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await (firebaseUser as any).getIdToken()}`
        },
        body: JSON.stringify({ transactionId: tId, groupId: gId })
      });
      const data = await response.json();
      if (data.success) {
        setReferencedTxn(data.transaction);
        setTxnGroupId(gId);
      }
    } catch (err) {
      console.error("Preview fetch error:", err);
    }
  };

  const copyTicketNumber = () => {
    if (currentTicket) {
      navigator.clipboard.writeText(currentTicket.ticketNumber);
      setCopiedTicket(true);
      toast.success("Ticket number copied");
      setTimeout(() => setCopiedTicket(false), 2000);
    }
  };

  const openWhatsApp = () => {
    const text = currentTicket
      ? `Hi, I need help with ticket ${currentTicket.ticketNumber}`
      : "Hi, I need help with Hostel Ledger";
    window.open(`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openEmail = () => {
    const subject = currentTicket
      ? `Support Request - ${currentTicket.ticketNumber}`
      : "Support Request - Hostel Ledger";
    const body = currentTicket
      ? `Ticket Number: ${currentTicket.ticketNumber}\n\nPlease describe your issue:\n\n`
      : "Please describe your issue:\n\n";
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-50 text-blue-600 border border-blue-100";
      case "in_progress":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "resolved":
        return "bg-[#EAF5EF] text-[#4a6850] border border-[#4a6850]/10";
      case "closed":
        return "bg-gray-50 text-gray-400 border border-gray-100";
      default:
        return "bg-gray-50 text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <CircleAlert className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CircleCheck className="w-4 h-4" />;
      case "closed":
        return <CircleCheck className="w-4 h-4" />;
      default:
        return <CircleAlert className="w-4 h-4" />;
    }
  };

  return (
    <AppContainer className="bg-white flex flex-col min-h-screen">
      <Sidebar />
      <DesktopHeader />
      <MobileHeader title="Support Center" showBackButton={true} />

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col lg:p-6 pb-0 overflow-hidden">
        {/* Modern Header - Hidden on mobile if redundant with MobileHeader */}
        <div className="hidden lg:flex items-center gap-4 mb-8 p-6 pb-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-11 h-11 rounded-2xl bg-white border border-[#4a6850]/10 flex items-center justify-center shadow-sm hover:bg-[#4a6850]/5 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#4a6850]" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#4a6850] tracking-tight">Support Center</h1>
            <p className="text-[10px] text-[#4a6850]/50 font-black uppercase tracking-widest">How can we help you?</p>
          </div>
        </div>

        {/* Current Ticket Info - Compact & Premium */}
        {currentTicket && (
          <div className="px-4 lg:px-0 mb-4 lg:mb-8">
            <div className="bg-gradient-to-br from-[#EAF5EF] to-[#F1F8F4] rounded-3xl p-5 border border-[#4a6850]/10 shadow-sm relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm",
                        getStatusColor(currentTicket.status)
                      )}
                    >
                      {getStatusIcon(currentTicket.status)}
                      {currentTicket.status.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-1.5 ml-1">
                      <p className="text-sm font-black text-[#4a6850] tabular-nums">{currentTicket.ticketNumber}</p>
                      <button
                        onClick={copyTicketNumber}
                        aria-label={copiedTicket ? "Ticket number copied" : "Copy ticket number"}
                        className="p-1 hover:bg-[#4a6850]/10 rounded-md transition-colors active:scale-90"
                      >
                        {copiedTicket ? (
                          <Check className="w-3 h-3 text-[#4a6850]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#4a6850]" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {!currentTicket.talkToAgent && currentTicket.status !== "closed" && (
                    <button
                      onClick={handleTalkToAgent}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4a6850] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#3d5642] transition-all shadow-md active:scale-95"
                    >
                      <User className="w-3 h-3" />
                      Agent
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-[#4a6850]/80 font-bold leading-tight line-clamp-1">{currentTicket.subject}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Methods - iOS Segmented Control Style */}
        <div className="flex-1 flex flex-col bg-white rounded-[2rem] lg:rounded-[3rem] shadow-xl shadow-[#4a6850]/5 border border-[#4a6850]/5 overflow-hidden">
          <div className="px-4 py-3 lg:p-2 lg:bg-gray-50/50">
            <div className="flex p-1 bg-gray-100/80 rounded-2xl relative z-20">
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 relative z-10",
                  activeTab === "chat" ? "text-[#4a6850]" : "text-[#4a6850]/40"
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat</span>
                {activeTab === "chat" && (
                  <div className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10 animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className={cn(
                  "flex-1 px-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 relative z-10",
                  activeTab === "email" ? "text-[#4a6850]" : "text-[#4a6850]/40"
                )}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
                {activeTab === "email" && (
                  <div className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10 animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("whatsapp")}
                className={cn(
                  "flex-1 px-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 relative z-10",
                  activeTab === "whatsapp" ? "text-[#4a6850]" : "text-[#4a6850]/40"
                )}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
                {activeTab === "whatsapp" && (
                  <div className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10 animate-in fade-in zoom-in-95 duration-200" />
                )}
              </button>
            </div>
          </div>

          {/* Live Chat */}
          {activeTab === "chat" && (
            <div className="flex flex-col flex-1 min-h-0 bg-gray-50/30 overflow-hidden relative">
              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-[#4a6850]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-20 h-20 bg-[#EAF5EF] rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                      <MessageCircle className="w-10 h-10 text-[#4a6850]" />
                    </div>
                    <h3 className="text-xl font-black text-[#4a6850] mb-2 tracking-tight">Need some help?</h3>
                    <p className="text-sm text-[#4a6850]/60 font-bold leading-relaxed max-w-[240px]">
                      Send us a message and our team will get back to you shortly!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex mb-4 last:mb-0",
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                      <div
                        className={cn(
                          "max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                          msg.sender === "user"
                            ? "bg-[#4a6850] text-white rounded-tr-none"
                            : "bg-white border border-[#4a6850]/5 text-[#4a6850] rounded-tl-none"
                        )}
                      >
                          {msg.sender === "admin" && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                msg.isBot ? "bg-purple-100" : "bg-[#EAF5EF]"
                              )}>
                                {msg.isBot ? (
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <User className="w-3 h-3 text-[#4a6850]" />
                                )}
                              </div>
                              <span className={cn(
                                "text-xs font-semibold",
                                msg.isBot ? "text-purple-700" : "text-gray-700"
                              )}>
                                {msg.isBot ? "AI Assistant" : "Support Team"}
                              </span>
                            </div>
                          )}
                          {msg.image && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-emerald-500/20">
                              <img src={msg.image} alt="Attachment" className="max-w-full h-auto" />
                            </div>
                          )}
                          {msg.transactionRef && (
                            <div className="mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-800">Transaction Reference</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{msg.transactionRef.details?.title}</p>
                              <p className="text-xs text-emerald-700">
                                {msg.transactionRef.details?.amount} • {msg.transactionRef.details?.paidByName}
                              </p>
                            </div>
                          )}
                          <p className="text-[13px] font-bold leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          <p
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider mt-2 opacity-50",
                              msg.sender === "user" ? "text-white" : "text-[#4a6850]/60"
                            )}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                    {isBotTyping && (
                      <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white border border-[#4a6850]/5 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0"
                          )}>
                            <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                          </div>
                          <div className="flex gap-0.5 items-center">
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></span>
                            <span className="text-[9px] font-black text-purple-600 ml-1.5 uppercase tracking-widest">AI assistant typing</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Support Chat Input - Compact & Mobile Optimized */}
              <div className="p-3 lg:p-4 bg-white border-t border-[#4a6850]/5 relative">
                {/* Referencing Hint */}
                {showTxnHint && (
                  <div className="absolute bottom-full left-3 right-3 mb-3 p-3 bg-white border border-emerald-100 rounded-2xl shadow-xl z-10 animate-in slide-in-from-bottom-2 zoom-in-95">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-900 mb-0.5 uppercase tracking-wide">Referencing Pro-Tip</p>
                        <p className="text-[9px] text-gray-600 leading-relaxed font-bold">
                          Type <span className="font-mono bg-gray-100 px-1 rounded text-emerald-700">GROUP/ID</span> to auto-generate a preview card for your transactions.
                        </p>
                      </div>
                      <button onClick={() => setShowTxnHint(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Preview */}
                {referencedTxn && (
                  <div className="mb-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 relative animate-in slide-in-from-bottom-2">
                    <button 
                      onClick={() => setReferencedTxn(null)}
                      aria-label="Remove transaction reference"
                      className="absolute top-1.5 right-1.5 p-1 hover:bg-emerald-100 rounded-full"
                    >
                      <X className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wide">Included Transaction</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-gray-900">{referencedTxn.title}</p>
                      <p className="text-[10px] font-black text-emerald-700">{referencedTxn.amount}</p>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {attachedImage && (
                  <div className="mb-2 relative inline-block animate-in zoom-in-95">
                    <img 
                      src={attachedImage} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                    />
                    <button 
                      onClick={() => setAttachedImage(null)}
                      aria-label="Remove attached image"
                      className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex shrink-0">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !!attachedImage}
                      aria-label="Upload image"
                      className="w-10 h-10 flex items-center justify-center text-[#4a6850]/40 hover:text-[#4a6850] hover:bg-[#4a6850]/5 rounded-xl transition-all disabled:opacity-50 active:scale-90"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        detectTransactionId(e.target.value);
                      }}
                      onKeyPress={(e) => e.key === "Enter" && !isSending && sendMessage()}
                      placeholder="Type message..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#4a6850]/10 bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-[#4a6850]/20 focus:bg-white text-[13px] font-bold transition-all placeholder:text-[#4a6850]/30"
                      disabled={isSending}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={(!message.trim() && !attachedImage) || isSending}
                    aria-label="Send message"
                    className="w-10 h-10 bg-[#4a6850] text-white rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center active:scale-90 transition-all shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === "email" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center animate-in fade-in zoom-in-98 duration-300 overflow-y-auto">
              <div className="w-20 h-20 bg-[#EAF5EF] rounded-[2rem] flex items-center justify-center mb-8 shadow-sm">
                <Mail className="w-10 h-10 text-[#4a6850]" />
              </div>
              <h3 className="text-2xl font-black text-[#4a6850] mb-3 tracking-tight">Email Support</h3>
              <p className="text-sm text-[#4a6850]/60 font-bold mb-8 max-w-[280px] leading-relaxed">
                Send us an email and our team will get back to you within 24 hours.
              </p>
              
              <div className="bg-[#EAF5EF]/50 rounded-2xl p-4 mb-8 w-full max-w-[320px] border border-[#4a6850]/5">
                <p className="text-[9px] text-[#4a6850]/40 font-black uppercase tracking-widest mb-1.5">Official Support Channel</p>
                <p className="text-base font-black text-[#4a6850] tracking-tight">{SUPPORT_EMAIL}</p>
              </div>

              <button
                onClick={openEmail}
                className="w-full max-w-[280px] py-4 bg-[#4a6850] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#3d5642] transition-all shadow-lg shadow-[#4a6850]/10 active:scale-95 flex items-center justify-center gap-3"
              >
                <Mail className="w-5 h-5" />
                Compose Now
              </button>
            </div>
          )}

          {/* WhatsApp Support Tab */}
          {activeTab === "whatsapp" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center animate-in fade-in zoom-in-98 duration-300 overflow-y-auto">
              <div className="w-20 h-20 bg-[#EAF5EF] rounded-[2rem] flex items-center justify-center mb-8 shadow-sm">
                <Phone className="w-10 h-10 text-[#4a6850]" />
              </div>
              <h3 className="text-2xl font-black text-[#4a6850] mb-3 tracking-tight">WhatsApp Support</h3>
              <p className="text-sm text-[#4a6850]/60 font-bold mb-8 max-w-[280px] leading-relaxed">
                Connect with us instantly on WhatsApp for any urgent queries.
              </p>

              <div className="bg-[#EAF5EF]/50 rounded-2xl p-4 mb-8 w-full max-w-[320px] border border-[#4a6850]/5">
                <p className="text-[9px] text-[#4a6850]/40 font-black uppercase tracking-widest mb-1.5">Direct Help Line</p>
                <p className="text-base font-black text-[#4a6850] tracking-tight">{SUPPORT_WHATSAPP}</p>
              </div>

              <button
                onClick={openWhatsApp}
                className="w-full max-w-[280px] py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/10 active:scale-95 flex items-center justify-center gap-3"
              >
                <MessageCircle className="w-5 h-5" />
                Open WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* FAQ Section - Clean & Modern */}
        <div className="px-4 lg:px-0 py-8 lg:py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-[#4a6850] rounded-full" />
            <h3 className="text-lg font-black text-[#4a6850] uppercase tracking-tight">Quick Help</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {[
              { q: "How do I split expenses?", a: "Go to your group, tap 'Add Expense', enter amount, and select participants." },
              { q: "How do I record a payment?", a: "Visit 'To Receive' section, find the member, and tap 'Record Payment'." },
              { q: "Can I use the app offline?", a: "Yes! The app works offline and syncs automatically when you're back online." },
              { q: "How do I invite members?", a: "Add members by username or email when creating or editing a group." }
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white border border-[#4a6850]/5 rounded-2xl p-4 transition-all hover:border-[#4a6850]/20 shadow-sm overflow-hidden">
                <summary className="cursor-pointer font-bold text-[#4a6850] text-[13px] flex items-center justify-between list-none">
                  {faq.q}
                  <div className="w-6 h-6 rounded-full bg-[#4a6850]/5 flex items-center justify-center group-open:rotate-180 transition-transform">
                    <Sparkles className="w-3 h-3 text-[#4a6850]/40" />
                  </div>
                </summary>
                <p className="mt-3 text-[12px] text-[#4a6850]/60 font-bold leading-relaxed animate-in slide-in-from-top-1">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </AppContainer>
  );
};

export default Support;
