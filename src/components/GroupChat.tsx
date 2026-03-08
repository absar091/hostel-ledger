import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ref, onValue, query, limitToLast, orderByChild, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { callSecureApi } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { Send, MessageCircle, Loader2, ChevronUp, Info } from "lucide-react";
import Avatar from "./Avatar";

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string | null;
    type: "text" | "system";
    event?: string;
    actorName?: string;
    data?: Record<string, any>;
    timestamp: number;
}

interface GroupChatProps {
    groupId: string;
    groupName: string;
    expenseId?: string;
    fullHeight?: boolean;
}

const SystemMessage = memo(({ message, formatAmount }: { message: ChatMessage; formatAmount: (n: number) => string }) => {
    const { t } = useTranslation();

    const getSystemText = () => {
        switch (message.event) {
            case "expense_added":
                return t("chat.system.expense_added", {
                    actor: message.actorName,
                    amount: formatAmount(message.data?.amount || 0),
                    title: message.data?.title || "",
                });
            case "payment_recorded":
                return t("chat.system.payment_recorded", {
                    actor: message.actorName,
                    amount: formatAmount(message.data?.amount || 0),
                });
            case "member_joined":
                return t("chat.system.member_joined", { actor: message.actorName });
            default:
                return `${message.actorName}: ${message.event}`;
        }
    };

    return (
        <div className="flex justify-center my-3">
            <div className="bg-[#4a6850]/10 text-[#4a6850] text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 max-w-[85%]">
                <Info className="w-3 h-3 shrink-0" />
                <span className="truncate">{getSystemText()}</span>
            </div>
        </div>
    );
});

const ChatBubble = memo(({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) => {
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}>
                {!isOwn && <Avatar name={message.senderName} size="sm" />}
                <div>
                    {!isOwn && (
                        <div className="text-[10px] font-black text-[#4a6850]/60 mb-0.5 px-1 tracking-wide">
                            {message.senderName}
                        </div>
                    )}
                    <div
                        className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isOwn
                            ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white rounded-br-md"
                            : "bg-white text-gray-900 border border-[#4a6850]/10 rounded-bl-md"
                            }`}
                    >
                        {message.text}
                    </div>
                    <div
                        className={`text-[10px] font-bold text-gray-400 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "text-right" : ""
                            }`}
                    >
                        {time}
                    </div>
                </div>
            </div>
        </div>
    );
});

const GroupChat = ({ groupId, groupName, expenseId, fullHeight = false }: GroupChatProps) => {
    const { t } = useTranslation();
    const { user } = useFirebaseAuth();
    const { formatAmount } = useCurrency();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? "smooth" : "instant",
        });
    }, []);

    // Realtime listener for new messages
    useEffect(() => {
        if (!groupId || !database) {
            setInitialLoad(false);
            return;
        }

        // Safety timeout: if messages don't load in 5 seconds, show empty state instead of spinner
        const timer = setTimeout(() => {
            setInitialLoad(false);
        }, 5000);

        const messagePath = expenseId
            ? `expenseMessages/${groupId}/${expenseId}`
            : `groupMessages/${groupId}`;

        const messagesRef = query(
            ref(database, messagePath),
            limitToLast(50)
        );

        const unsubscribe = onValue(messagesRef, (snapshot) => {
            clearTimeout(timer);
            if (!snapshot.exists()) {
                setMessages([]);
                setInitialLoad(false);
                return;
            }

            const msgs: ChatMessage[] = [];
            snapshot.forEach((child) => {
                msgs.push({ ...child.val(), id: child.key! });
            });

            // Sort by timestamp just in case
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(msgs);
            setInitialLoad(false);

            // Scroll to bottom on new messages
            setTimeout(() => scrollToBottom(true), 100);
        }, (error) => {
            console.error("Firebase listener error:", error);
            clearTimeout(timer);
            setInitialLoad(false);
        });

        return () => {
            const messagePath = expenseId
                ? `expenseMessages/${groupId}/${expenseId}`
                : `groupMessages/${groupId}`;
            off(ref(database, messagePath));
            clearTimeout(timer);
        };
    }, [groupId, expenseId, database, scrollToBottom]);

    // Scroll to bottom on initial load
    useEffect(() => {
        if (!initialLoad && messages.length > 0) {
            scrollToBottom(false);
        }
    }, [initialLoad]);

    // Load older messages
    const loadOlderMessages = async () => {
        if (!hasMore || isLoadingOlder || messages.length === 0) return;

        setIsLoadingOlder(true);
        try {
            const oldestTimestamp = messages[0]?.timestamp;
            const result = await callSecureApi("/api/get-messages", {
                groupId,
                expenseId,
                limit: 30,
                beforeTimestamp: oldestTimestamp,
            });

            if (result.success && result.messages.length > 0) {
                // Filter out duplicates that might have come via real-time listener
                setMessages((prev) => {
                    const newMsgs = result.messages.filter(
                        (nm: any) => !prev.some((pm) => pm.id === nm.id)
                    );
                    return [...newMsgs, ...prev];
                });
                setHasMore(result.hasMore);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Failed to load older messages:", err);
        } finally {
            setIsLoadingOlder(false);
        }
    };

    // Send message
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || isSending) return;

        setIsSending(true);
        setInputText("");

        try {
            await callSecureApi("/api/send-message", { groupId, expenseId, text });
            // Realtime listener will pick up the new message
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: any) {
            console.error("Failed to send message:", err);
            setInputText(text); // Restore on failure
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Empty state or Error state
    if (initialLoad) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-white/80 rounded-3xl border border-[#4a6850]/10 shadow-inner">
                {!database ? (
                    <div className="text-center px-6">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Info className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-sm font-black text-red-600 mb-1">Database Connection Error</p>
                        <p className="text-xs font-bold text-gray-500">Firebase failed to initialize. Please check your internet connection and refresh.</p>
                    </div>
                ) : (
                    <>
                        <Loader2 className="w-10 h-10 text-[#4a6850] animate-spin mb-4 opacity-50" />
                        <p className="text-sm font-black text-gray-500 tracking-tight">{t("chat.loading")}</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${fullHeight ? 'h-full mb-0' : 'h-[calc(100vh-320px)] lg:h-[600px] mb-6'} bg-gradient-to-b from-[#f0f4f1] to-[#e8ece9] rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] overflow-hidden`}>
            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 scroll-smooth"
            >
                {/* Load more button */}
                {hasMore && messages.length > 0 && (
                    <div className="flex justify-center mb-3">
                        <button
                            onClick={loadOlderMessages}
                            disabled={isLoadingOlder}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#4a6850]/70 bg-white/80 px-4 py-2 rounded-full shadow-sm border border-[#4a6850]/10 hover:bg-white transition-all disabled:opacity-50"
                        >
                            {isLoadingOlder ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ChevronUp className="w-3.5 h-3.5" />
                            )}
                            {t("chat.load_older")}
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-[#4a6850]" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 mb-1">
                            {expenseId ? t("chat.thread_empty_title") : t("chat.empty_title")}
                        </h3>
                        <p className="text-xs font-bold text-gray-500 max-w-[200px]">
                            {expenseId ? t("chat.thread_empty_desc") : t("chat.empty_desc")}
                        </p>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg) =>
                    msg.type === "system" ? (
                        <SystemMessage key={msg.id} message={msg} formatAmount={formatAmount} />
                    ) : (
                        <ChatBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === user?.uid}
                        />
                    )
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 bg-white/90 backdrop-blur-sm border-t border-[#4a6850]/10">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("chat.input_placeholder")}
                        maxLength={2000}
                        className="flex-1 bg-[#f0f4f1] border border-[#4a6850]/10 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a6850]/30 focus:border-[#4a6850]/30 transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isSending}
                        className="w-11 h-11 bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
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
    );
};

export default memo(GroupChat);
