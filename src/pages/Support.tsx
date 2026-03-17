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
    <AppContainer className="bg-white">
      <Sidebar />
      <DesktopHeader />
      <MobileHeader title="Support Center" showBackButton={true} />

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 pb-24 lg:pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white border border-[#4a6850]/10 flex items-center justify-center shadow-sm hover:bg-[#4a6850]/5 transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-[#4a6850]" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-[#4a6850] tracking-tight">Support Center</h1>
            <p className="text-sm text-[#4a6850]/60 font-bold uppercase tracking-wider">How can we help you today?</p>
          </div>
        </div>

        {/* Current Ticket Info */}
        {currentTicket && (
          <div className="bg-gradient-to-br from-[#EAF5EF] to-[#F1F8F4] rounded-[2rem] p-6 mb-8 border border-[#4a6850]/10 shadow-lg shadow-[#4a6850]/5 relative overflow-hidden">
            {/* Decorative circles to match dashboard style */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#4a6850]/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#4a6850]" />
                    </div>
                    <h3 className="text-xs font-black text-[#4a6850]/70 uppercase tracking-widest">Active Request</h3>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm",
                        getStatusColor(currentTicket.status)
                      )}
                    >
                      {getStatusIcon(currentTicket.status)}
                      {currentTicket.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-black text-[#4a6850] tracking-tighter tabular-nums">{currentTicket.ticketNumber}</p>
                    <button
                      onClick={copyTicketNumber}
                      className="p-1.5 hover:bg-[#4a6850]/10 rounded-lg transition-colors active:scale-90"
                    >
                      {copiedTicket ? (
                        <Check className="w-4 h-4 text-[#4a6850]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#4a6850]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-3">
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] text-[#4a6850]/50 font-black uppercase tracking-wider mb-0.5">Created On</p>
                    <p className="text-sm font-black text-[#4a6850]">
                      {new Date(currentTicket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!currentTicket.talkToAgent && currentTicket.status !== "closed" && (
                    <button
                      onClick={handleTalkToAgent}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4a6850] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3d5642] transition-all shadow-md active:scale-95"
                    >
                      <User className="w-3.5 h-3.5" />
                      Talk to Agent
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#4a6850]/80 font-bold leading-relaxed">{currentTicket.subject}</p>
            </div>
          </div>
        )}

        {/* Contact Methods Tabs */}
        <div className="bg-white rounded-[2rem] border border-[#4a6850]/10 overflow-hidden mb-8 shadow-xl shadow-[#4a6850]/5">
          <div className="flex p-2 gap-1 bg-gray-50/50">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 px-4 py-3.5 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-2.5",
                activeTab === "chat"
                  ? "bg-[#4a6850] text-white shadow-lg shadow-[#4a6850]/20"
                  : "text-[#4a6850]/40 hover:text-[#4a6850]/70 hover:bg-white"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              Live Chat
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "flex-1 px-4 py-3.5 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-2.5",
                activeTab === "email"
                  ? "bg-[#4a6850] text-white shadow-lg shadow-[#4a6850]/20"
                  : "text-[#4a6850]/40 hover:text-[#4a6850]/70 hover:bg-white"
              )}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={cn(
                "flex-1 px-4 py-3.5 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-2.5",
                activeTab === "whatsapp"
                  ? "bg-[#4a6850] text-white shadow-lg shadow-[#4a6850]/20"
                  : "text-[#4a6850]/40 hover:text-[#4a6850]/70 hover:bg-white"
              )}
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          {/* Live Chat */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-[500px]">
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
                          "flex",
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] md:max-w-[75%] rounded-[1.5rem] px-5 py-4 shadow-sm",
                            msg.sender === "user"
                              ? "bg-[#4a6850] text-white rounded-br-none"
                              : "bg-white border border-[#4a6850]/5 text-[#4a6850] rounded-bl-none"
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
                          <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
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
                      <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center"
                          )}>
                            <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                          </div>
                          <div className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                            <span className="text-[10px] font-bold text-purple-600 ml-1 uppercase tracking-wider">AI typing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200 relative">
                {/* Referencing Hint */}
                {showTxnHint && (
                  <div className="absolute bottom-full left-4 mb-2 p-3 bg-white border border-emerald-100 rounded-2xl shadow-xl z-10 max-w-xs animate-in slide-in-from-bottom-2 zoom-in-95">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 mb-1">Pro Tip: Referencing</p>
                        <p className="text-[10px] text-gray-600 leading-relaxed">
                          To reference a transaction, type its <span className="font-mono bg-gray-100 px-1 rounded text-emerald-700">GROUP_ID/TRANSACTION_ID</span>. 
                          A preview card will automatically appear for you!
                        </p>
                      </div>
                      <button onClick={() => setShowTxnHint(false)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Preview */}
                {referencedTxn && (
                  <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 relative animate-in slide-in-from-bottom-2">
                    <button 
                      onClick={() => setReferencedTxn(null)}
                      className="absolute top-2 right-2 p-1 hover:bg-emerald-100 rounded-full"
                    >
                      <X className="w-4 h-4 text-emerald-600" />
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-800">Referencing Transaction</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{referencedTxn.title}</p>
                    <p className="text-xs text-emerald-700">{referencedTxn.amount} • {referencedTxn.paidByName}</p>
                  </div>
                )}

                {/* Image Preview */}
                {attachedImage && (
                  <div className="mb-3 relative inline-block group animate-in zoom-in-95">
                    <img 
                      src={attachedImage} 
                      alt="Preview" 
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                    />
                    <button 
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
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
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !!attachedImage}
                      className="w-12 h-12 flex items-center justify-center text-[#4a6850]/40 hover:text-[#4a6850] hover:bg-[#4a6850]/5 rounded-2xl transition-all disabled:opacity-50 active:scale-90 shrink-0"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowTxnHint(!showTxnHint)}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 shrink-0",
                        showTxnHint ? "bg-[#4a6850]/10 text-[#4a6850]" : "text-[#4a6850]/40 hover:text-[#4a6850] hover:bg-[#4a6850]/5"
                      )}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      detectTransactionId(e.target.value);
                    }}
                    onKeyPress={(e) => e.key === "Enter" && !isSending && sendMessage()}
                    placeholder="Type message..."
                    className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl border border-[#4a6850]/10 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#4a6850]/20 focus:bg-white text-sm font-bold transition-all"
                    disabled={isSending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!message.trim() && !attachedImage) || isSending}
                    className="w-12 md:w-auto px-0 md:px-6 h-12 bg-[#4a6850] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#3d5642] transition-all shadow-lg shadow-[#4a6850]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span className="hidden md:block">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}          {/* Email Support */}
          {activeTab === "email" && (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-[#EAF5EF] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                <Mail className="w-12 h-12 text-[#4a6850]" />
              </div>
              <h3 className="text-2xl font-black text-[#4a6850] mb-3 tracking-tight">Email Support</h3>
              <p className="text-[#4a6850]/60 font-bold mb-8 max-w-sm mx-auto leading-relaxed">
                Send us an email and our dedicated team will respond within 24 hours.
              </p>
              <div className="bg-[#EAF5EF]/50 rounded-[1.5rem] p-5 mb-8 inline-block border border-[#4a6850]/5">
                <p className="text-[10px] text-[#4a6850]/50 font-black uppercase tracking-widest mb-1">Support Email</p>
                <p className="text-lg font-black text-[#4a6850]">{SUPPORT_EMAIL}</p>
              </div>
              <div>
                <button
                  onClick={openEmail}
                  className="px-8 py-4 bg-[#4a6850] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#3d5642] transition-all shadow-lg shadow-[#4a6850]/20 active:scale-95 flex items-center gap-3 mx-auto"
                >
                  <Mail className="w-5 h-5" />
                  Compose Email
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Support */}
          {activeTab === "whatsapp" && (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-[#EAF5EF] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                <Phone className="w-12 h-12 text-[#4a6850]" />
              </div>
              <h3 className="text-2xl font-black text-[#4a6850] mb-3 tracking-tight">WhatsApp Support</h3>
              <p className="text-[#4a6850]/60 font-bold mb-8 max-w-sm mx-auto leading-relaxed">
                Instant help via WhatsApp. Best for quick questions and urgent issues.
              </p>
              <div className="bg-[#EAF5EF]/50 rounded-[1.5rem] p-5 mb-8 inline-block border border-[#4a6850]/5">
                <p className="text-[10px] text-[#4a6850]/50 font-black uppercase tracking-widest mb-1">Contact Number</p>
                <p className="text-lg font-black text-[#4a6850]">{SUPPORT_WHATSAPP}</p>
              </div>
              <div>
                <button
                  onClick={openWhatsApp}
                  className="px-8 py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/20 active:scale-95 flex items-center gap-3 mx-auto"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                How do I split expenses with my group?
              </summary>
              <p className="mt-2 text-sm text-gray-600 pl-4">
                Go to your group, tap "Add Expense", enter the amount, select who paid and who participated. The app will automatically calculate everyone's share.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                How do I record a payment?
              </summary>
              <p className="mt-2 text-sm text-gray-600 pl-4">
                When someone pays you back, go to "To Receive" section, find the person, and tap "Record Payment" to mark it as paid.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                Can I use the app offline?
              </summary>
              <p className="mt-2 text-sm text-gray-600 pl-4">
                Yes! The app works offline and will sync your data automatically when you're back online.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                How do I invite members to my group?
              </summary>
              <p className="mt-2 text-sm text-gray-600 pl-4">
                When creating a group, you can add members by their username or email. They'll receive an invitation to join.
              </p>
            </details>
          </div>
        </div>
      </main>
    </AppContainer>
  );
};

export default Support;
