import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  X, 
  Copy, 
  Check, 
  Brain,
  Zap
} from 'lucide-react';
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
      text: "👋 **Hello! I'm your AI Study Guide.**\n\nI can help you break down complex topics, create study roadmaps, or explain difficult concepts using analogies. What are we mastering today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'guide' ? 'model' as const : 'user' as const,
        parts: [{ text: m.text }]
      }));

      const response = await askGuide(userMessage, history);
      setMessages(prev => [...prev, { role: 'guide', text: response }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'guide', text: "I'm having trouble connecting to my neural network. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (confirm("Reset current session?")) {
      setMessages([{ role: 'guide', text: "Session reset. Ready for a new topic!" }]);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-x-4 bottom-24 top-20 sm:top-auto sm:bottom-24 sm:right-6 sm:left-auto sm:w-[400px] sm:h-[600px] bg-white rounded-3xl shadow-huge border border-brand-border/40 overflow-hidden flex flex-col z-[100] ring-1 ring-black/5"
    >
      {/* Header */}
      <div className="p-4 bg-white border-b border-brand-border/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-ink flex items-center justify-center text-[#ff00ff] shadow-sm">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-brand-ink uppercase tracking-tight leading-none">Study Guide</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-brand-secondary/60 uppercase tracking-widest">Gemini Pro Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-2 text-brand-secondary hover:text-brand-ink hover:bg-brand-bg rounded-lg transition-all">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="p-2 text-brand-secondary hover:text-brand-ink hover:bg-brand-bg rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-brand-bg/20"
      >
        {messages.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}
          >
            <div className={cn(
              "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm relative group",
              m.role === 'user' 
                ? "bg-brand-ink text-white rounded-tr-none" 
                : "bg-white text-brand-ink border border-brand-border/30 rounded-tl-none"
            )}>
              <div className={cn(
                "prose prose-sm max-w-none break-words",
                "prose-pre:bg-brand-bg prose-pre:border prose-pre:border-brand-border/30",
                m.role === 'user' ? "prose-invert" : "prose-headings:text-brand-ink prose-strong:text-[#ff00ff]"
              )}>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {m.text}
                </ReactMarkdown>
              </div>
              {m.role === 'guide' && (
                <button 
                  onClick={() => copyToClipboard(m.text, i)}
                  className="absolute -right-8 top-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-secondary hover:text-brand-primary"
                >
                  {copiedId === i ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary/40 mt-1 px-1">
              {m.role === 'user' ? 'You' : 'The Guide'}
            </span>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex flex-col gap-2 mr-auto items-start max-w-[85%]">
            <div className="bg-white border border-brand-border/30 p-4 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#ff00ff] animate-pulse px-1">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-brand-border/20 flex gap-2 shrink-0">
        <input 
          type="text" 
          placeholder="Ask anything academic..."
          className="flex-1 bg-brand-bg border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ff00ff]/20 transition-all"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
        />
        <button 
          type="submit"
          disabled={!input.trim() || isTyping}
          className="bg-brand-ink text-white p-2.5 rounded-xl hover:bg-[#ff00ff] transition-all active:scale-95 disabled:opacity-50 shadow-md"
        >
          <Send size={18} />
        </button>
      </form>
    </motion.div>
  );
}
