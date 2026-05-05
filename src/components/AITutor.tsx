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
  Zap,
  Target,
  Lightbulb,
  Search,
  BookOpen,
  ChevronRight
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

const SUGGESTIONS = [
  { icon: <Brain size={14} />, text: "Explain Quantum Physics with a cat", category: "Science" },
  { icon: <Target size={14} />, text: "7-day Calculus study plan", category: "Strategy" },
  { icon: <Lightbulb size={14} />, text: "Memorization tips for history", category: "Methods" },
  { icon: <BookOpen size={14} />, text: "Summary of Gatsby's themes", category: "Literature" }
];

export default function AITutor({ onClose }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'guide', 
      text: "👋 **Welcome back, scholar.**\n\nI am your AI study mentor. I use the **Socratic Method** to help you master concepts through guidance and exploration.\n\n### How can we advance your knowledge today?"
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

  const handleSend = async (textToUse?: string) => {
    const finalInput = textToUse || input;
    if (!finalInput.trim() || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: finalInput }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'guide' ? 'model' as const : 'user' as const,
        parts: [{ text: m.text }]
      }));

      const response = await askGuide(finalInput, history);
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
      className="fixed inset-x-4 bottom-24 top-20 sm:top-auto sm:bottom-28 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[650px] bg-white rounded-3xl shadow-huge border border-brand-border/40 overflow-hidden flex flex-col z-[100] ring-1 ring-black/5"
    >
      {/* Header */}
      <div className="p-5 bg-brand-surface/30 border-b border-brand-border/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-ink flex items-center justify-center text-[#ff00ff] shadow-lg ring-4 ring-brand-bg/50">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-ink uppercase tracking-tight leading-none">The Study Guide</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black text-brand-secondary/60 uppercase tracking-[0.2em]">Gemini AI Intelligence</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-2.5 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-2.5 text-brand-secondary hover:text-brand-ink hover:bg-brand-bg rounded-xl transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar bg-white"
      >
        {messages.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-secondary/40 mb-2 px-1">
              {m.role === 'user' ? 'Inquiry' : 'Mastery'}
            </span>
            <div className={cn(
              "p-5 rounded-2xl shadow-sm relative group max-w-[95%]",
              m.role === 'user' 
                ? "bg-brand-ink text-white rounded-tr-none shadow-brand" 
                : "bg-brand-bg text-brand-ink border border-brand-border/30 rounded-tl-none"
            )}>
              <div className={cn(
                "prose prose-sm max-w-none break-words",
                "prose-p:font-medium prose-p:leading-relaxed",
                "prose-headings:font-black prose-headings:tracking-tighter",
                "prose-strong:font-black prose-strong:text-[#ff00ff]",
                "prose-pre:bg-black/5 prose-pre:text-brand-ink prose-pre:border prose-pre:border-brand-border/20",
                m.role === 'user' ? "prose-invert" : ""
              )}>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {m.text}
                </ReactMarkdown>
              </div>
              {m.role === 'guide' && (
                <button 
                  onClick={() => copyToClipboard(m.text, i)}
                  className="absolute -right-10 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-brand-secondary hover:text-brand-primary"
                >
                  {copiedId === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex flex-col gap-2 mr-auto items-start">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff00ff] animate-pulse">Researching...</span>
            <div className="bg-brand-bg border border-brand-border/30 p-5 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-[#ff00ff] rounded-full" />
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-[#ff00ff] rounded-full" />
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-[#ff00ff] rounded-full" />
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 gap-2 pt-4">
            <h4 className="text-[9px] font-black uppercase text-brand-secondary/40 tracking-[0.2em] mb-2">Popular Inquiries</h4>
            {SUGGESTIONS.map((s, idx) => (
              <button 
                key={idx}
                onClick={() => handleSend(s.text)}
                className="p-4 bg-brand-bg/50 border border-brand-border/30 rounded-2xl text-left hover:border-[#ff00ff]/40 hover:bg-white transition-all group flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#ff00ff] shadow-sm shrink-0">
                  {s.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-brand-ink leading-tight">{s.text}</p>
                  <span className="text-[8px] font-black uppercase text-brand-secondary/60 mt-1 block">{s.category}</span>
                </div>
                <ChevronRight size={14} className="text-brand-border group-hover:text-[#ff00ff] transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-5 bg-brand-surface/30 border-t border-brand-border/20 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="relative flex items-center"
        >
          <div className="absolute left-4 text-brand-secondary/30">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search for an academic concept..."
            className="w-full bg-white border border-brand-border/30 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold text-brand-ink placeholder:text-brand-secondary/30 focus:outline-none focus:ring-4 focus:ring-[#ff00ff]/5 transition-all shadow-soft"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bg-brand-ink text-white p-2.5 rounded-xl hover:bg-[#ff00ff] transition-all active:scale-95 disabled:opacity-20 shadow-lg"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="flex items-center justify-center gap-4 mt-4">
           <div className="flex items-center gap-1.5 opacity-40">
             <Zap size={12} className="text-[#ff00ff]" />
             <span className="text-[8px] font-black uppercase tracking-widest text-brand-ink">Flash Thinking</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-brand-border/30" />
           <div className="flex items-center gap-1.5 opacity-40">
             <Brain size={12} />
             <span className="text-[8px] font-black uppercase tracking-widest text-brand-ink">Socratic Logic</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
