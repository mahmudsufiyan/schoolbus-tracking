import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Image as ImageIcon, Mic, Square } from 'lucide-react';
import apiClient from '../api/axiosConfig';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const ChatWidget = () => {
    const { user } = useAuth();
    const { socket, on, isConnected } = useSocket();
    const isAdmin = user?.role === 'admin';

    const [isOpen, setIsOpen] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadCounts, setUnreadCounts] = useState({});

    // Media States
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);

    const scrollRef = useRef(null);

    // 1. Fetch unread messages
    const fetchUnread = useCallback(async () => {
        try {
            const res = await apiClient.get('/chat/unread');
            setUnreadCount(Number(res.data.count || 0));
            if (isAdmin) {
                const counts = res.data.byContact || {};
                setUnreadCounts(counts);
                setContacts(previous =>
                    previous.map(contact => ({
                        ...contact,
                        unread_count: Number(counts[contact.id] || 0)
                    }))
                );
            }
        } catch (err) {
            console.error('Failed to get unread count:', err);
        }
    }, [isAdmin]);

    // 2. Fetch contacts
    const fetchContacts = useCallback(async () => {
        try {
            const res = await apiClient.get('/chat/contacts');
            const newContacts = res.data || [];
            setContacts(newContacts);
            setActiveContact(previous => {
                if (!newContacts.length) return null;
                const existing = newContacts.find(c => String(c.id) === String(previous?.id));
                return existing || newContacts[0];
            });
        } catch (err) {
            console.error('Failed to load contacts:', err);
        }
    }, []);

    const refreshChatData = useCallback(async () => {
        await Promise.all([fetchContacts(), fetchUnread()]);
    }, [fetchContacts, fetchUnread]);

    // 3. Load initial data
    useEffect(() => { if (user?.id) fetchUnread(); }, [user?.id, fetchUnread]);
    useEffect(() => { if (isOpen && user?.id) refreshChatData(); }, [isOpen, user?.id, refreshChatData]);

    // 4. Fetch messages
    useEffect(() => {
        if (!activeContact || !isOpen) return;
        let cancelled = false;
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get(`/chat/messages/${activeContact.id}`);
                if (cancelled) return;
                setMessages(res.data || []);
                if (isAdmin) {
                    await fetchUnread();
                    if (!cancelled) {
                        setContacts(prev => prev.map(c => String(c.id) === String(activeContact.id) ? { ...c, unread_count: 0 } : c));
                    }
                } else {
                    setUnreadCount(0);
                }
            } catch (err) {
                console.error('Failed to load messages:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchMessages();
        return () => { cancelled = true; };
    }, [activeContact?.id, isOpen, user?.id, isAdmin, fetchUnread]);

    // 5. Socket Listener
    useEffect(() => {
        if (!socket || !isConnected || !user?.id) return;
        const unsubscribe = on('new-chat-message', async (msg) => {
            const senderId = String(msg.sender_id);
            const receiverId = String(msg.receiver_id);
            const currentUserId = String(user.id);
            const selectedContactId = String(activeContact?.id);
            const receivedByMe = receiverId === currentUserId;
            const belongsToActive = (senderId === selectedContactId && receivedByMe) || (senderId === currentUserId && receiverId === selectedContactId);

            if (receivedByMe) {
                if (isAdmin) {
                    if (isOpen && selectedContactId === senderId) {
                        try {
                            await apiClient.put(`/chat/messages/${senderId}/read`);
                            await fetchUnread();
                            await fetchContacts();
                        } catch (err) { console.error(err); }
                    } else {
                        await refreshChatData();
                    }
                } else {
                    if (!isOpen) setUnreadCount(prev => prev + 1);
                }
            }

            if (belongsToActive) {
                setMessages(prev => prev.some(i => i.id === msg.id) ? prev : [...prev, msg]);
            }
        });
        return () => unsubscribe?.();
    }, [socket, isConnected, on, user?.id, activeContact?.id, isOpen, isAdmin, fetchUnread, fetchContacts, refreshChatData]);

    // 6. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isOpen]);

    // 7. Core Send Function
    const sendMessagePayload = async (textPayload) => {
        if (!activeContact || sending) return;
        setSending(true);

        const tempMsg = {
            id: `temp-${Date.now()}`,
            sender_id: user.id,
            receiver_id: activeContact.id,
            message: textPayload,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await apiClient.post('/chat/messages', {
                receiver_id: activeContact.id,
                message: textPayload
            });
            setMessages(prev => prev.map(item => item.id === tempMsg.id ? res.data : item));
            if (isAdmin) await fetchContacts();
        } catch (err) {
            console.error('Failed to send:', err);
            setMessages(prev => prev.filter(item => item.id !== tempMsg.id));
        } finally {
            setSending(false);
        }
    };

    // 8. Send Text
    const handleSendText = () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');
        sendMessagePayload(text);
    };

    // 9. Send Image (Base64)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const imagePayload = JSON.stringify({ type: 'image', url: reader.result });
            sendMessagePayload(imagePayload);
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    // 10. Start Voice Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const audioPayload = JSON.stringify({ type: 'audio', url: reader.result });
                    sendMessagePayload(audioPayload);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Microphone access denied:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    // 11. Stop Voice Recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    if (user?.role !== 'parent' && user?.role !== 'admin') return null;

    // 12. Render Message Content
    const renderMessageContent = (msgText) => {
        try {
            const parsed = JSON.parse(msgText);
            if (parsed.type === 'image') {
                return <img src={parsed.url} alt="attachment" className="max-w-full rounded-lg mt-1" />;
            }
            if (parsed.type === 'audio') {
                return <audio controls src={parsed.url} className="max-w-full mt-1 h-10" />;
            }
        } catch (e) {
            // Not JSON, regular text
        }
        return <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msgText}</p>;
    };

    return (
        <>
            {/* --- MOVED TO RIGHT: Floating Chat Button --- */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 sm:right-8 z-[999] w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 25, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 25, scale: 0.95 }}
                        className="fixed bottom-24 right-6 sm:right-8 z-[999] w-[calc(100vw-48px)] sm:w-[500px] h-[min(580px,calc(100vh-105px))] rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex overflow-hidden"
                    >
                        {/* LEFT SIDEBAR (Admin Only) */}
                        {isAdmin && (
                            <div className="w-[140px] sm:w-[160px] border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col flex-shrink-0">
                                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parents</h4>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {contacts.map(contact => {
                                        const count = unreadCounts[contact.id] ?? 0;
                                        const selected = String(activeContact?.id) === String(contact.id);
                                        return (
                                            <button
                                                key={contact.id}
                                                onClick={() => setActiveContact(contact)}
                                                className={`w-full relative rounded-xl p-2 flex items-center gap-2 text-left transition-all ${selected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-100 border border-transparent'}`}
                                            >
                                                <div className="relative w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                                    {(contact.full_name || 'P').charAt(0).toUpperCase()}
                                                    {count > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                                                            {count > 9 ? '9+' : count}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[11px] font-semibold truncate ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{contact.full_name}</p>
                                                    <p className="text-[9px] text-slate-400 truncate">{count > 0 ? `${count} new` : 'Read'}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* RIGHT CHAT AREA */}
                        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                            <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 px-4 py-4 text-white flex-shrink-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                        <MessageSquare size={19} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">{activeContact ? activeContact.full_name : 'Support'}</h3>
                                        <p className="text-[11px] text-blue-100">{isConnected ? 'Connected' : 'Reconnecting...'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                                    <X size={18} />
                                </button>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-slate-50 dark:bg-slate-950/70">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-indigo-600" /></div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <MessageSquare size={24} className="text-indigo-400 mb-2" />
                                        <p className="text-[11px] text-slate-500">Start a conversation</p>
                                    </div>
                                ) : (
                                    messages.map((m, i) => {
                                        const isMe = String(m.sender_id) === String(user.id);
                                        return (
                                            <div key={m.id ?? i} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && (
                                                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {(activeContact?.full_name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className={`max-w-[85%] px-3 py-2 shadow-sm ${isMe ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 rounded-xl rounded-bl-sm'}`}>
                                                    {renderMessageContent(m.message)}
                                                    <div className={`text-[9px] mt-1.5 flex items-center gap-1 ${isMe ? 'text-blue-100 justify-end' : 'text-slate-400'}`}>
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* INPUT AREA WITH MEDIA BUTTONS */}
                            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 transition">
                                    
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                    
                                    <button 
                                        onClick={() => fileInputRef.current.click()} 
                                        disabled={!activeContact || sending || isRecording}
                                        className="p-2 text-slate-500 hover:text-indigo-600 transition disabled:opacity-50"
                                        title="Upload Image"
                                    >
                                        <ImageIcon size={18} />
                                    </button>

                                    <button 
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={!activeContact || sending}
                                        className={`p-2 transition disabled:opacity-50 ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-indigo-600'}`}
                                        title={isRecording ? "Stop Recording" : "Record Voice"}
                                    >
                                        {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                                    </button>

                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKey}
                                        placeholder={isRecording ? "Recording audio..." : (activeContact ? 'Write your message...' : 'Select a chat')}
                                        disabled={sending || !activeContact || isRecording}
                                        className="flex-1 min-w-0 bg-transparent px-1 py-1.5 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 outline-none disabled:opacity-50"
                                    />

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={handleSendText}
                                        disabled={sending || !input.trim() || !activeContact || isRecording}
                                        className="w-9 h-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md transition disabled:opacity-40"
                                    >
                                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatWidget;