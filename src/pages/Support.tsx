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
      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;

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
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-amber-100 text-amber-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
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
    <AppContainer>
      <DesktopHeader />
      <MobileHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 pb-24 lg:pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <p className="text-sm text-gray-500">We're here to help you</p>
          </div>
        </div>

        {/* Current Ticket Info */}
        {currentTicket && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 mb-6 border border-emerald-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Active Ticket</h3>
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                      getStatusColor(currentTicket.status)
                    )}
                  >
                    {getStatusIcon(currentTicket.status)}
                    {currentTicket.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-emerald-900">{currentTicket.ticketNumber}</p>
                  <button
                    aria-label="Copy ticket number"
                    onClick={copyTicketNumber}
                    className="p-1 hover:bg-emerald-100 rounded transition-colors"
                  >
                    {copiedTicket ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <p className="text-xs text-gray-600">Created</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {new Date(currentTicket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!currentTicket.talkToAgent && currentTicket.status !== "closed" && (
                  <button
                    onClick={handleTalkToAgent}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-200 transition-all shadow-sm"
                  >
                    <User className="w-3 h-3" />
                    Talk to Agent
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700">{currentTicket.subject}</p>
          </div>
        )}

        {/* Contact Methods Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                activeTab === "chat"
                  ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              Live Chat
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                activeTab === "email"
                  ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                activeTab === "whatsapp"
                  ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600"
                  : "text-gray-600 hover:bg-gray-50"
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
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Start a Conversation</h3>
                    <p className="text-sm text-gray-600 max-w-xs">
                      Send us a message and we'll get back to you as soon as possible
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
                            "max-w-[75%] rounded-2xl px-4 py-3",
                            msg.sender === "user"
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-gray-200 text-gray-900"
                          )}
                        >
                          {msg.sender === "admin" && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                msg.isBot ? "bg-purple-100" : "bg-emerald-100"
                              )}>
                                {msg.isBot ? (
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <User className="w-3 h-3 text-emerald-600" />
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
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              msg.sender === "user" ? "text-emerald-100" : "text-gray-500"
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
                      <button aria-label="Dismiss hint" onClick={() => setShowTxnHint(false)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Preview */}
                {referencedTxn && (
                  <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 relative animate-in slide-in-from-bottom-2">
                    <button 
                      aria-label="Remove referenced transaction"
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
                      aria-label="Remove attached image"
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                   <button
                    aria-label="Attach image"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !!attachedImage}
                    className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    aria-label="Reference transaction hint"
                    aria-expanded={showTxnHint}
                    onClick={() => setShowTxnHint(!showTxnHint)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      showTxnHint ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    )}
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      detectTransactionId(e.target.value);
                    }}
                    onKeyPress={(e) => e.key === "Enter" && !isSending && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isSending}
                  />
                  <button
                    aria-label="Send message"
                    onClick={sendMessage}
                    disabled={(!message.trim() && !attachedImage) || isSending}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Support */}
          {activeTab === "email" && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Email Support</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Send us an email and we'll respond within 24 hours
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
                <p className="text-sm text-gray-600 mb-1">Email Address</p>
                <p className="text-lg font-bold text-gray-900">{SUPPORT_EMAIL}</p>
              </div>
              <button
                onClick={openEmail}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Send Email
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WhatsApp Support */}
          {activeTab === "whatsapp" && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">WhatsApp Support</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Chat with us on WhatsApp for instant support
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
                <p className="text-sm text-gray-600 mb-1">WhatsApp Number</p>
                <p className="text-lg font-bold text-gray-900">{SUPPORT_WHATSAPP}</p>
              </div>
              <button
                onClick={openWhatsApp}
                className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Open WhatsApp
                <ExternalLink className="w-4 h-4" />
              </button>
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
