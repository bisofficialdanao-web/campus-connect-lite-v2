import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  Lightbulb, 
  Brain, 
  Target,
  Search,
  MessageSquare,
  ChevronRight,
  RefreshCcw,
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

const SUGGESTIONS = [
  { icon: <Brain size={16} />, text: "Explain Quantum Physics using a cat analogy", category: "Science" },
  { icon: <Target size={16} />, text: "Create a 7-day study plan for Calculus", category: "Strategy" },
  { icon: <Lightbulb size={16} />, text: "How to memorize 50 history dates fast?", category: "Tips" },
  { icon: <Zap size={16} />, text: "Quick summary of The Great Gatsby themes", category: "Literature" }
];

export default function Guide() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'guide', 
      text: "# Welcome to your AI Study Guide\nI'm powered by **Gemini pro** with live web grounding. I can help you with structured learning paths, complex problem solving, and research.\n\n### How can I assist your studies today?\n* Use one of the suggestions below\n* Ask me about a specific topic\n* Request a custom study roadmap"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => !m.text.includes("Welcome to your AI Study Guide"))
        .map(m => ({
          role: m.role === 'guide' ? 'model' as const : 'user' as const,
          parts: [{ text: m.text }]
        }));

      const response = await askGuide(text, history);
      setMessages(prev => [...prev, { role: 'guide', text: response }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'guide', text: "I encountered an error connecting to my neural network. Please try again in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (confirm("Reset current study session?")) {
      setMessages([
        { 
          role: 'guide', 
          text: "# Session Reset\nI'm ready for a new topic. What should we focus on now?" 
        }
      ]);
    }
  };

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-160px)] max-w-4xl mx-auto bg-white rounded-3xl border border-brand-border/40 shadow-soft overflow-hidden mt-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border/20 bg-brand-surface/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-ink flex items-center justify-center text-brand-primary shadow-lg ring-4 ring-brand-bg/50">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-brand-ink uppercase tracking-tight leading-none">The Study Guide</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-brand-secondary/60 uppercase tracking-widest">Powered by Gemini AI</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={clearChat}
          className="p-2 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 group"
          title="Clear Session"
        >
          <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar pb-32"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col",
                m.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "flex items-center gap-2 mb-2",
                m.role === 'user' ? "flex-row-reverse" : ""
              )}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary/40">
                  {m.role === 'user' ? "Your Query" : "Insight"}
                </span>
                <div className="w-1 h-1 rounded-full bg-brand-border/40" />
              </div>

              <div className={cn(
                "max-w-[90%] sm:max-w-2xl p-5 rounded-2xl relative group",
                m.role === 'user' 
                  ? "bg-brand-ink text-white rounded-tr-none shadow-lg" 
                  : "bg-brand-bg text-brand-ink border border-brand-border/30 rounded-tl-none"
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none break-words",
                  "prose-headings:font-black prose-headings:tracking-tighter",
                  "prose-p:leading-relaxed prose-p:font-medium",
                  "prose-strong:font-black prose-strong:text-brand-primary",
                  "prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-brand-primary",
                  "prose-pre:bg-brand-ink prose-pre:text-white prose-pre:border prose-pre:border-white/10",
                  "prose-ul:list-disc prose-ol:list-decimal",
                  m.role === 'user' ? "prose-invert" : "text-brand-ink/90"
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
                    onClick={() => copyText(m.text, i)}
                    className="absolute -right-12 top-0 p-2 opacity-0 group-hover:opacity-100 transition-all text-brand-secondary hover:text-brand-primary hover:bg-brand-bg rounded-xl"
                  >
                    {copiedIndex === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex flex-col items-start space-y-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary animate-pulse">Consulting Research</span>
              </div>
              <div className="bg-brand-bg border border-brand-border/30 p-5 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm">
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-brand-primary rounded-full" />
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-primary rounded-full" />
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-primary rounded-full" />
              </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <h4 className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-6 border-b pb-2">Jumpstart your session</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {SUGGESTIONS.map((s, idx) => (
                 <button 
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  className="p-4 bg-white border border-brand-border/40 rounded-2xl text-left hover:border-brand-primary hover:bg-brand-bg transition-all group active:scale-[0.98]"
                 >
                   <div className="flex items-center justify-between mb-2">
                     <div className="p-2 bg-brand-bg rounded-lg text-brand-primary group-hover:bg-white transition-colors">{s.icon}</div>
                     <span className="text-[8px] font-black uppercase text-brand-secondary/40 tracking-wider">{s.category}</span>
                   </div>
                   <p className="text-xs font-black text-brand-ink leading-tight">{s.text}</p>
                   <div className="flex items-center gap-1 text-brand-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-black uppercase tracking-tighter">Ask Now</span>
                      <ChevronRight size={10} />
                   </div>
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-brand-border/20 bg-brand-surface/30 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-center"
        >
          <div className="absolute left-5 text-brand-secondary/40">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Inquire about any mathematical, scientific or historical subject..."
            className="w-full bg-white border-none rounded-2xl pl-14 pr-16 py-5 text-sm font-bold text-brand-ink placeholder:text-brand-secondary/30 focus:shadow-huge transition-all shadow-soft"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3 bg-brand-ink text-white p-3 rounded-xl hover:bg-brand-primary transition-all disabled:opacity-20 active:scale-95 shadow-lg group"
          >
            <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </form>
        <div className="flex items-center justify-center gap-4 mt-4">
           <div className="flex items-center gap-1 opacity-40">
             <BookOpen size={12} />
             <span className="text-[8px] font-black uppercase tracking-widest">Socratic Method</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-brand-border/30" />
           <div className="flex items-center gap-1 opacity-40 text-brand-primary">
             <Zap size={12} />
             <span className="text-[8px] font-black uppercase tracking-widest text-brand-ink">Live Grounding</span>
           </div>
        </div>
      </div>
    </div>
  );
}
