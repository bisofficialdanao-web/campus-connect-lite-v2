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
        <div className="p-4 border-b border-brand-border/50 bg-[#ff00ff] flex items-center justify-between text-white shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="animate-pulse" />
            <span className="text-[12px] font-black uppercase tracking-widest">AI STUDY GUIDE</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={clearChat}
              className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
              title="Clear Session"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
              aria-label="Close tutor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-brand-bg/30 relative"
        >
          {messages.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[90%] sm:max-w-[85%] group",
                m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm relative",
                m.role === 'user' 
                  ? "bg-brand-primary text-white rounded-tr-none" 
                  : "bg-white text-brand-ink border border-brand-border/50 rounded-tl-none"
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none break-words overflow-x-auto",
                  "prose-pre:bg-brand-bg prose-pre:border prose-pre:border-brand-border/50",
                  "prose-ol:list-decimal prose-ul:list-disc prose-li:my-1",
                  m.role === 'user' ? "prose-invert" : "prose-headings:text-brand-ink prose-strong:text-brand-ink"
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
                    className="absolute -right-8 top-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-secondary hover:text-brand-primary"
                    title="Copy to clipboard"
                  >
                    {copiedId === i ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary mt-1 px-1 opacity-50">
                {m.role === 'user' ? 'You' : 'The Guide'}
              </span>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-brand-secondary px-2 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#ff00ff] animate-pulse">Deep Thinking...</span>
            </div>
          )}

          {/* Scroll to Bottom Button */}
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm border border-brand-border/50 p-2 rounded-full shadow-lg text-brand-primary hover:text-[#ff00ff] transition-colors z-10"
            >
              <Send size={16} className="rotate-90" />
            </motion.button>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-brand-border/50 bg-white flex gap-2 shrink-0">
          <input 
            type="text" 
            placeholder="Ask your study guide anything..."
            className="flex-1 bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#ff00ff] transition-colors shadow-inner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-[#ff00ff] text-white p-3 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-md disabled:grayscale"
          >
            <Send size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
