import React, { useState } from 'react';
import { Book, FileText, Video, MessageSquare, Send, Sparkles, User, BrainCircuit } from 'lucide-react';
import { askGuide } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export default function Library() {
  const [activeTab, setActiveTab] = useState<'files' | 'guide'>('files');

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-brand-surface border-2 border-brand-border rounded-2xl p-1 shadow-sm">
        <button 
          onClick={() => setActiveTab('files')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            activeTab === 'files' ? "bg-brand-primary text-white shadow-lg" : "text-brand-secondary hover:text-brand-ink"
          )}
        >
          <FileText size={16} />
          Materials
        </button>
        <button 
          onClick={() => setActiveTab('guide')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            activeTab === 'guide' ? "bg-brand-primary text-white shadow-lg" : "text-brand-secondary hover:text-brand-ink"
          )}
        >
          <BrainCircuit size={16} />
          The Guide
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'files' ? (
          <motion.div 
            key="files"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FileCard type="pdf" title="Physics-101-Lec" size="1.2 MB" />
              <FileCard type="video" title="Algebra-Basics" size="8.5 MB" />
              <FileCard type="doc" title="History-Notes" size="450 KB" />
              <FileCard type="pdf" title="Lab-Report-Template" size="210 KB" />
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 text-center">
              <Book className="mx-auto text-brand-primary mb-3" size={32} />
              <h3 className="font-black text-brand-ink mb-1">More coming soon</h3>
              <p className="text-sm text-brand-secondary font-medium">Your teachers will upload materials here.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="guide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <StudyGuide />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileCard({ type, title, size }: { type: 'pdf' | 'video' | 'doc', title: string, size: string }) {
  const icons = {
    pdf: <FileText className="text-red-500" />,
    video: <Video className="text-brand-primary" />,
    doc: <Book className="text-green-500" />
  };

  return (
    <div className="bg-brand-surface border-2 border-brand-border rounded-3xl p-4 flex flex-col gap-3 hover:border-brand-primary transition-all cursor-pointer group">
      <div className="w-10 h-10 bg-brand-bg rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icons[type]}
      </div>
      <div>
        <p className="text-sm font-black text-brand-ink truncate">{title}</p>
        <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest mt-0.5">{size}</p>
      </div>
    </div>
  );
}

function StudyGuide() {
  const [messages, setMessages] = useState<{ role: 'user' | 'guide', text: string }[]>([
    { role: 'guide', text: "Hello! I am 'The Guide'. I won't give you answers, but I'll help you find them. What are you studying today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    const guideResponse = await askGuide(userMessage);
    setMessages(prev => [...prev, { role: 'guide', text: guideResponse }]);
    setIsTyping(false);
  };

  return (
    <div className="bg-brand-surface border-2 border-brand-border rounded-3xl overflow-hidden shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-brand-border bg-brand-bg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-primary" size={18} />
          <span className="text-xs font-black uppercase tracking-widest text-brand-ink">Socratic Guide</span>
        </div>
        <div className="px-2 py-1 bg-white border border-brand-border rounded-lg text-[9px] font-bold text-brand-secondary uppercase">Gemini AI</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[85%]",
            m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
              m.role === 'user' 
                ? "bg-brand-primary text-white rounded-tr-none" 
                : "bg-brand-bg text-brand-ink border border-brand-border rounded-tl-none markdown-body"
            )}>
              {m.role === 'guide' ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-secondary mt-1 px-1">
              {m.role === 'user' ? 'You' : 'The Guide'}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-brand-secondary px-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce delay-75" />
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce delay-150" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-brand-border bg-brand-bg flex gap-2">
        <input 
          type="text" 
          placeholder="Ask a question..."
          className="flex-1 bg-brand-surface border border-brand-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!input.trim() || isTyping}
          className="bg-brand-ink text-white p-3 rounded-2xl hover:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
