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
} from "@/lib/icons";
import { ref, push, set, onValue, off, serverTimestamp } from "firebase/database";
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
  timestamp: number;
  read?: boolean;
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
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

const Support = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "email" | "whatsapp">("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const SUPPORT_EMAIL = "support@aarx.online";
  const SUPPORT_WHATSAPP = "+923124029044";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load or create ticket
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    // Check for existing open ticket
    const userTicketsRef = ref(database, `supportTickets`);
    const unsubscribe = onValue(userTicketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const tickets = snapshot.val();
        const userTicket = Object.entries(tickets).find(
          ([_, ticket]: [string, any]) =>
            ticket.userId === user.uid && ticket.status !== "closed"
        );

        if (userTicket) {
          const [ticketId, ticketData] = userTicket as [string, any];
          setCurrentTicket({
            id: ticketId,
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
      const ticketsRef = ref(database, "supportTickets");
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: {},
      };

      await set(newTicketRef, newTicket);

      // Add initial message
      const messagesRef = ref(database, `supportTickets/${newTicketRef.key}/messages`);
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

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

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
        const messagesRef = ref(database, `supportTickets/${ticketId}/messages`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, {
          text: message,
          sender: "user",
          timestamp: Date.now(),
          read: false,
        });

        // Update ticket status and timestamp
        const ticketRef = ref(database, `supportTickets/${ticketId}`);
        await set(ticketRef, {
          ...currentTicket,
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
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
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
              <div className="text-right">
                <p className="text-xs text-gray-600">Created</p>
                <p className="text-xs font-semibold text-gray-900">
                  {new Date(currentTicket.createdAt).toLocaleDateString()}
                </p>
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
                              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">
                                Support Team
                              </span>
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
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !isSending && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isSending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || isSending}
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
