import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistant = ({ language = 'en' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Welcome message per language
    const welcome = {
        en: "Hi! I'm the Bright Future assistant. Ask me anything about our programs, bus routes, or enrollment.",
        am: "ሰላም! የብራይት ፊውቸር ረዳት ነኝ። ስለ ፕሮግራሞቻችን፣ የአውቶቡስ መስመሮች ወይም ምዝገባ ማንኛውንም ይጠይቁኝ።",
        om: "Akkam! Ani gargaaraa Bright Future dha. Waa'ee sagantaa, daandii awtoobisii yookaan galmee keenya waan barbaaddan na gaafadhaa.",
    };

    const placeholder = {
        en: 'Ask about the system...',
        am: 'ስለ ስርዓቱ ይጠይቁ...',
        om: 'Waa\'ee sirnaa gaafadhu...',
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'assistant', content: welcome[language] || welcome.en }]);
        }
    }, [isOpen, language]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = async () => {
        const question = input.trim();
        if (!question || loading) return;

        const userMsg = { role: 'user', content: question };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:5000/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    language,
                    history: newMessages.slice(-6), // last 3 exchanges for context
                }),
            });

            if (!res.ok) throw new Error('AI request failed');
            const data = await res.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        language === 'am'
                            ? 'ይቅርታ፣ አሁን ምላሽ መስጠት አልቻልኩም። እባክዎ በኋላ ይሞክሩ ወይም ቢሯችንን ያግኙ።'
                            : language === 'om'
                            ? 'Dhiifama, amma deebii kennuu hin dandeenye. Maaloo booda yaalaa yookaan waajjira keenya qunnamaa.'
                            : 'Sorry, I couldn\'t respond right now. Please try again later or contact our office.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all flex items-center justify-center"
                aria-label="AI Assistant"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

            {/* Chat window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">Bright Future AI</p>
                                <p className="text-xs text-emerald-100">Online • Ask me anything</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <Bot size={14} className="text-emerald-600" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                            msg.role === 'user'
                                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                                : 'bg-white text-gray-700 border border-gray-200 rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                            <User size={14} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-2 justify-start">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Bot size={14} className="text-emerald-600" />
                                    </div>
                                    <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl">
                                        <Loader2 size={16} className="text-emerald-600 animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder={placeholder[language] || placeholder.en}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center disabled:opacity-40 hover:scale-105 transition"
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

export default AIAssistant;