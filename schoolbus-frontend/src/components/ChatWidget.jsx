import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, User } from 'lucide-react';
import apiClient from '../api/axiosConfig';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const ChatWidget = () => {
    const { user } = useAuth();
    const { socket, on, isConnected } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const scrollRef = useRef(null);

    // 1. Fetch unread count on load
    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await apiClient.get('/chat/unread');
                setUnreadCount(res.data.count);
            } catch (err) {
                console.error('Failed to get unread count', err);
            }
        };
        fetchUnread();
    }, []);

    // 2. Fetch contacts when opened
    useEffect(() => {
        if (!isOpen || contacts.length > 0) return;
        const fetchContacts = async () => {
            try {
                const res = await apiClient.get('/chat/contacts');
                setContacts(res.data);
                if (res.data.length > 0) setActiveContact(res.data[0]);
            } catch (err) {
                console.error('Failed to load contacts', err);
            }
        };
        fetchContacts();
    }, [isOpen, contacts.length]);

    // 3. Fetch messages & mark as read when active contact changes
    useEffect(() => {
        if (!activeContact || !isOpen) return;
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get(`/chat/messages/${activeContact.id}`);
                setMessages(res.data);
                
                await apiClient.put(`/chat/messages/${activeContact.id}/read`);
                setUnreadCount(0);
            } catch (err) {
                console.error('Failed to load messages', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [activeContact, isOpen]);

    // 4. Listen for real-time messages
    useEffect(() => {
        if (!socket || !isConnected) return;
        
        const unsub = on('new-chat-message', (msg) => {
            if (msg.receiver_id === user.id) {
                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                } else if (msg.sender_id !== activeContact?.id) {
                    setUnreadCount(prev => prev + 1);
                }
            }

            if (
                (msg.sender_id === activeContact?.id && msg.receiver_id === user.id) ||
                (msg.sender_id === user.id && msg.receiver_id === activeContact?.id)
            ) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        });

        return () => unsub?.();
    }, [socket, isConnected, on, activeContact, user.id, isOpen]);

    // 5. Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || !activeContact || sending) return;
        setSending(true);
        const text = input.trim();
        setInput('');

        const tempMsg = {
            id: Date.now(),
            sender_id: user.id,
            receiver_id: activeContact.id,
            message: text,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await apiClient.post('/chat/messages', {
                receiver_id: activeContact.id,
                message: text,
            });
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.data : m));
        } catch (err) {
            console.error('Failed to send', err);
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleOpen = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) setUnreadCount(0);
    };

    if (user?.role !== 'parent' && user?.role !== 'admin') return null;

    return (
        <>
            {/* 🆕 Chat Button with Badge */}
            <button
                onClick={toggleOpen}
                className="fixed bottom-6 right-24 z-[999] w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-24 z-[999] w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
                            <div>
                                <p className="font-semibold text-sm">Transport Support</p>
                                <p className="text-xs text-blue-200">
                                    {activeContact ? `Chat with ${activeContact.full_name}` : 'Loading...'}
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Admin: Contact List */}
                        {user?.role === 'admin' && contacts.length > 1 && (
                            <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-2 flex overflow-x-auto gap-2">
                                {contacts.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setActiveContact(c)}
                                        className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                                            activeContact?.id === c.id 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600'
                                        }`}
                                    >
                                        {c.full_name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900/50">
                            {loading ? (
                                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-600" /></div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm mt-10">No messages yet. Start the conversation!</div>
                            ) : (
                                messages.map((m, i) => {
                                    const isMe = m.sender_id === user.id;
                                    return (
                                        <div key={i} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                                    <User size={14} className="text-gray-600 dark:text-gray-300" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                                isMe 
                                                    ? 'bg-blue-600 text-white rounded-br-sm' 
                                                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-bl-sm'
                                            }`}>
                                                {m.message}
                                                <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 dark:border-slate-700 p-3 flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Type a message..."
                                disabled={sending || !activeContact}
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-800 dark:text-white disabled:opacity-50"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={sending || !input.trim() || !activeContact}
                                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatWidget;