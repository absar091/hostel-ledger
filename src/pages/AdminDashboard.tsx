import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Search,
  Filter,
  CircleCheck,
  Clock,
  CircleAlert,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  X,
  ArrowLeft,
  Bell,
  TrendingUp,
  Users,
  MessageSquare,
} from "@/lib/icons";
import { ref, onValue, off, set, push, update } from "firebase/database";
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is admin using role
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Access Denied");
      navigate("/");
      return;
    }

    // Load all tickets
    const ticketsRef = ref(database, "supportTickets");
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = snapshot.val();
        const ticketsList: Ticket[] = Object.entries(ticketsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
          messages: data.messages
            ? Object.entries(data.messages)
                .map(([msgId, msg]: [string, any]) => ({
                  id: msgId,
                  ...msg,
                }))
                .sort((a, b) => a.timestamp - b.timestamp)
            : [],
        }));

        // Sort by most recent first
        ticketsList.sort((a, b) => b.updatedAt - a.updatedAt);
        setTickets(ticketsList);

        // Calculate unread messages
        const unread = ticketsList.reduce((count, ticket) => {
          return (
            count +
            ticket.messages.filter((msg) => msg.sender === "user" && !msg.read).length
          );
        }, 0);
        setUnreadCount(unread);
      } else {
        setTickets([]);
      }
      setIsLoading(false);
    });

    return () => off(ticketsRef, "value", unsubscribe);
  }, [isAdmin, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  const sendReply = async () => {
    if (!message.trim() || !selectedTicket) return;

    setIsSending(true);

    try {
      const messagesRef = ref(database, `supportTickets/${selectedTicket.id}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: message,
        sender: "admin",
        timestamp: Date.now(),
        read: false,
      });

      // Update ticket status and timestamp
      const ticketRef = ref(database, `supportTickets/${selectedTicket.id}`);
      await update(ticketRef, {
        status: selectedTicket.status === "open" ? "in_progress" : selectedTicket.status,
        updatedAt: Date.now(),
      });

      setMessage("");
      toast.success("Reply sent");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: Ticket["status"]) => {
    try {
      const ticketRef = ref(database, `supportTickets/${ticketId}`);
      await update(ticketRef, {
        status,
        updatedAt: Date.now(),
      });
      toast.success(`Ticket marked as ${status}`);
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: Ticket["priority"]) => {
    try {
      const ticketRef = ref(database, `supportTickets/${ticketId}`);
      await update(ticketRef, {
        priority,
        updatedAt: Date.now(),
      });
      toast.success(`Priority updated to ${priority}`);
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const markMessagesAsRead = async (ticketId: string) => {
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;

      const updates: any = {};
      ticket.messages.forEach((msg) => {
        if (msg.sender === "user" && !msg.read) {
          updates[`supportTickets/${ticketId}/messages/${msg.id}/read`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "low":
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

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AppContainer>
      <DesktopHeader />
      <MobileHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 pb-24 lg:pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support Admin</h1>
              <p className="text-sm text-gray-500">Manage support tickets</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">{unreadCount} unread</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-600">Total Tickets</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                <p className="text-xs text-gray-600">Open</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-xs text-gray-600">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CircleCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                <p className="text-xs text-gray-600">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Tickets */}
            <div className="overflow-y-auto max-h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No tickets found</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const unreadMessages = ticket.messages.filter(
                    (msg) => msg.sender === "user" && !msg.read
                  ).length;

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        markMessagesAsRead(ticket.id);
                      }}
                      className={cn(
                        "w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left",
                        selectedTicket?.id === ticket.id && "bg-emerald-50 hover:bg-emerald-50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {ticket.ticketNumber}
                          </span>
                          {unreadMessages > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {unreadMessages}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                            getStatusColor(ticket.status)
                          )}
                        >
                          {getStatusIcon(ticket.status)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {ticket.userName}
                      </p>
                      <p className="text-xs text-gray-600 mb-2 truncate">{ticket.subject}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-semibold",
                            getPriorityColor(ticket.priority)
                          )}
                        >
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="p-5 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {selectedTicket.ticketNumber}
                      </h2>
                      <p className="text-sm text-gray-600">{selectedTicket.subject}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="lg:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Customer</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedTicket.userName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Email</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedTicket.userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Created</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedTicket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Updated</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedTicket.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        updateTicketStatus(selectedTicket.id, e.target.value as Ticket["status"])
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        updateTicketPriority(
                          selectedTicket.id,
                          e.target.value as Ticket["priority"]
                        )
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex", msg.sender === "admin" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-3",
                          msg.sender === "admin"
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        )}
                      >
                        {msg.sender === "user" && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">
                              {selectedTicket.userName}
                            </span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.sender === "admin" ? "text-emerald-100" : "text-gray-500"
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
                </div>

                {/* Reply Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !isSending && sendReply()}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      disabled={isSending}
                    />
                    <button
                      onClick={sendReply}
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center">
                <div>
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Select a Ticket</h3>
                  <p className="text-sm text-gray-600">
                    Choose a ticket from the list to view details and reply
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppContainer>
  );
};

export default AdminDashboard;
