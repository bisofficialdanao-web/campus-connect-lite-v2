import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, Sparkles, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '../lib/utils';
import { askGuide } from '../services/geminiService';

interface Message {
  role: 'user' | 'guide';
  text: string;
}

interface AITutorProps {
  onClose: () => void;
}

export default function AITutor({ onClose }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'guide', 
      text: "Hello! I am your AI Study Guide. I'm here to help you master your subjects with detailed steps, formulas, and structured paths. What would you like to build or learn today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearChat = () => {
    if (window.confirm("Start a new study session? This will clear our current history.")) {
      setMessages([
        { 
          role: 'guide', 
          text: "Hello again! A fresh start. What topic should we dive into now?" 
        }
      ]);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isNearBottom);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      // Convert internal message format to Gemini API format (history only, current message passed separately)
      const history = messages
        .filter(m => !m.text.includes("I am your AI Study Guide"))
        .map(m => ({
          role: m.role === 'guide' ? 'model' as const : 'user' as const,
          parts: [{ text: m.text }]
        }));

      const guideResponse = await askGuide(userMessage, history);
      setMessages(prev => [...prev, { role: 'guide', text: guideResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'guide', text: "I'm sorry, I'm having trouble connecting right now. Let me know if you want to try again!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-brand-ink/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        className="w-full max-w-md bg-brand-surface rounded-t-3xl sm:rounded-3xl border border-brand-border shadow-huge overflow-hidden flex flex-col h-[85vh] sm:h-[600px] relative mt-16 sm:mt-0"
      >
        {/* Header */}
        <div className="p-5 border-b border-brand-border/30 bg-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-ink flex items-center justify-center text-white shadow-inner ring-4 ring-brand-bg">
              <Sparkles size={20} className="animate-pulse text-brand-primary" />
            </div>
            <div>
              <h3 className="text-[14px] font-black tracking-tight text-brand-ink uppercase leading-none">The Study Guide</h3>
              <p className="text-[9px] font-bold text-brand-secondary/60 uppercase tracking-[0.2em] mt-1.5">Academic Mentor v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearChat}
              className="p-2.5 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 group"
              title="Reset Session"
            >
              <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 text-brand-secondary hover:text-brand-ink hover:bg-brand-bg rounded-xl transition-all active:scale-95"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 no-scrollbar bg-brand-bg relative"
        >
          {messages.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "flex flex-col max-w-[92%] sm:max-w-[85%] group relative",
                m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "flex items-center gap-2 mb-2 px-1",
                m.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.15em]",
                  m.role === 'user' ? "text-brand-primary/80" : "text-brand-ink/60"
                )}>
                  {m.role === 'user' ? 'You' : 'The Guide'}
                </span>
                <div className={cn("w-1 h-1 rounded-full", m.role === 'user' ? "bg-brand-primary/30" : "bg-brand-ink/20")} />
              </div>

              <div className={cn(
                "p-4 sm:p-5 rounded-2xl text-[14px] font-medium leading-relaxed transition-all duration-300 relative",
                m.role === 'user' 
                  ? "bg-brand-ink text-white rounded-tr-none shadow-lg shadow-brand-ink/5" 
                  : "bg-white text-brand-ink border border-brand-border/40 rounded-tl-none shadow-sm hover:shadow-md"
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none break-words overflow-x-auto",
                  "prose-headings:font-black prose-headings:tracking-tight",
                  "prose-pre:bg-brand-bg prose-pre:border prose-pre:border-brand-border/30",
                  "prose-ol:list-decimal prose-ul:list-disc prose-li:my-2",
                  "prose-strong:font-black",
                  m.role === 'user' 
                    ? "prose-invert prose-p:text-white/90" 
                    : "prose-headings:text-brand-ink prose-strong:text-brand-primary text-brand-ink/90"
                )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
                
                {m.role === 'guide' && (
                  <button 
                    onClick={() => copyToClipboard(m.text, i)}
                    className="absolute -right-10 top-0 p-2 opacity-0 group-hover:opacity-100 transition-all text-brand-secondary hover:text-brand-primary hover:bg-brand-bg rounded-lg"
                    title="Copy to clipboard"
                  >
                    {copiedId === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex flex-col gap-3 mr-auto items-start max-w-[85%]">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-brand-primary animate-pulse">The Guide</span>
                <span className="text-[9px] font-bold text-brand-secondary/40 italic">Thinking...</span>
              </div>
              <div className="bg-white border border-brand-border/40 p-5 rounded-2xl rounded-tl-none flex items-center justify-center gap-1.5 shadow-sm">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                />
              </div>
            </div>
          )}

          {/* Scroll to Bottom Button */}
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={scrollToBottom}
              className="absolute bottom-6 right-6 bg-brand-ink text-white p-3 rounded-full shadow-huge hover:bg-brand-primary transition-all z-10 active:scale-95"
            >
              <Send size={18} className="rotate-90 translate-x-px" />
            </motion.button>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t border-brand-border/30 bg-white shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Inquire about any academic subject..."
              className="w-full bg-brand-bg border-none rounded-2xl pl-5 pr-14 py-4 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-inner placeholder:text-brand-secondary/40"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 bg-brand-ink text-white p-2.5 rounded-xl hover:bg-brand-primary transition-all disabled:opacity-30 active:scale-95 shadow-md flex items-center justify-center group"
            >
              <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </form>
          <p className="text-[8px] font-bold text-center text-brand-secondary/40 uppercase tracking-[0.2em] mt-3">Structured Learning Path Support</p>
        </div>
      </motion.div>
    </div>
  );
}
