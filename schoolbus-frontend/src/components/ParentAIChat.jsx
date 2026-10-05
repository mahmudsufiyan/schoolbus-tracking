import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import apiClient from '../api/axiosConfig';

const ParentAIChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: "Hi! I'm your SchoolBus assistant. Ask me anything about your child's bus, route, or school trips.",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const send = async () => {
        const q = input.trim();
        if (!q || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput('');
        setLoading(true);

        try {
            const res = await apiClient.post('/ai/parent-chat', { question: q });
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: res.data.answer || "Sorry, I couldn't generate a response.",
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: err.response?.data?.message || 'AI is unavailable right now. Please try again later.',
                error: true,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(v => !v)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
            >
                {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center gap-2">
                            <Bot size={20} className="text-white" />
                            <div className="flex-1">
                                <p className="text-white font-semibold text-sm">SchoolBus AI</p>
                                <p className="text-xs text-green-100">Ask about your child's bus</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/20 rounded-lg p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-slate-900/50">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {m.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                        m.role === 'user'
                                            ? 'bg-green-600 text-white rounded-br-sm'
                                            : m.error
                                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm'
                                                : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-bl-sm'
                                    }`}>
                                        {m.text}
                                    </div>
                                    {m.role === 'user' && (
                                        <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                            <User size={14} className="text-gray-700 dark:text-gray-200" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-2 justify-start">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                        <Bot size={14} className="text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl rounded-bl-sm px-3 py-2">
                                        <Loader2 size={14} className="animate-spin text-green-600" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 dark:border-slate-700 p-2 flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Ask a question..."
                                disabled={loading}
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-800 dark:text-white disabled:opacity-50"
                            />
                            <button
                                onClick={send}
                                disabled={loading || !input.trim()}
                                className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ParentAIChat;