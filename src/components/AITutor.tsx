import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, Sparkles } from 'lucide-react';
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
      text: "Hello! I am your Socratic AI Tutor. I help you learn by guiding you through problems without giving direct answers. What would you like to explore today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
        .filter(m => !m.text.startsWith("Hello! I am your Socratic AI Tutor"))
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
            <span className="text-[12px] font-black uppercase tracking-widest">Socratic AI Tutor</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
            aria-label="Close tutor"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-brand-bg/30">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
              m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm",
                m.role === 'user' 
                  ? "bg-brand-primary text-white rounded-tr-none" 
                  : "bg-white text-brand-ink border border-brand-border/50 rounded-tl-none"
              )}>
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  className={cn(
                    "prose prose-sm prose-p:my-0 prose-headings:text-inherit prose-strong:text-inherit max-w-none break-words overflow-x-auto",
                    m.role === 'user' ? "prose-invert" : "prose-headings:text-brand-ink prose-strong:text-brand-ink"
                  )}
                >
                  {m.text}
                </ReactMarkdown>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary mt-1 px-1 opacity-50">
                {m.role === 'user' ? 'You' : 'The Guide'}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-brand-secondary px-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#ff00ff]">Analyzing...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-brand-border/50 bg-white flex gap-2 shrink-0">
          <input 
            type="text" 
            placeholder="Ask your tutor anything..."
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
