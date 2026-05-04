import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Message, Class, UserProfile } from '../types';
import { Send, User, MessageSquare, Users, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Chats() {
  const { user, profile, activeDM, setActiveDM } = useAuth();
  const [activeChat, setActiveChat] = useState<{ id: string, name: string, type: 'dm' | 'group' } | null>(null);

  useEffect(() => {
    if (activeDM) {
      setActiveChat({ id: activeDM.id, name: activeDM.name, type: 'dm' });
      // We don't clear it immediately to ensure it opens, 
      // but we should clear it once it's set as activeChat so back button works correctly
    }
  }, [activeDM]);

  const handleBack = () => {
    setActiveChat(null);
    setActiveDM(null); // Clear the trigger
  };

  const [classes, setClasses] = useState<Class[]>([]);
  const [recentDMs, setRecentDMs] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    if (!user || !profile) return;
    
    // Fetch classes user belongs to
    const qClasses = profile.role === 'teacher'
      ? query(collection(db, 'classes'), where('teacherId', '==', user.uid))
      : query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid));
    
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      const c: Class[] = [];
      snapshot.forEach(doc => c.push({ id: doc.id, ...doc.data() } as Class));
      setClasses(c);
    });

    // Mock recent DMs for lite version
    setRecentDMs([{ id: 'guide-ai', name: 'The Guide (AI)' }]);

    return () => unsubClasses();
  }, [user, profile]);

  if (activeChat) {
    return <ChatWindow chat={activeChat} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Messages</h2>
        <button className="p-2 bg-brand-bg rounded-xl border border-brand-border"><Search size={18} /></button>
      </div>

      <div className="space-y-6">
        {/* Classes / Groups */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="text-brand-primary" size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Class Groups</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {classes.map(c => (
              <button 
                key={c.id} 
                onClick={() => setActiveChat({ id: c.id, name: c.name, type: 'group' })}
                className="flex items-center gap-4 p-4 bg-brand-surface border-2 border-brand-border rounded-3xl hover:border-brand-primary/50 transition-all text-left shadow-sm"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-brand-primary font-black">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-brand-ink truncate">{c.name}</h4>
                  <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest mt-1">Class Group Chat</p>
                </div>
              </button>
            ))}
            {classes.length === 0 && (
              <div className="p-8 bg-brand-bg border-2 border-dashed border-brand-border rounded-3xl text-center">
                <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest">No active class groups</p>
              </div>
            )}
          </div>
        </section>

        {/* Direct Messages */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="text-brand-primary" size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Direct Messages</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {recentDMs.map(dm => (
              <button 
                key={dm.id} 
                onClick={() => setActiveChat({ id: dm.id, name: dm.name, type: 'dm' })}
                className="flex items-center gap-4 p-4 bg-brand-surface border-2 border-brand-border rounded-3xl hover:border-brand-primary/50 transition-all text-left shadow-sm"
              >
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 font-black">
                  {dm.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-brand-ink truncate">{dm.name}</h4>
                  <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest mt-1">Tap to chat</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ChatWindow({ chat, onBack }: { chat: { id: string, name: string, type: 'dm' | 'group' }, onBack: () => void }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (chat.type === 'group') {
      q = query(collection(db, 'messages'), where('classId', '==', chat.id), orderBy('createdAt', 'asc'), limit(50));
    } else {
      // DM logic is simplified for lite: fetching where receiver is user OR sender is user
      // For real DMs we'd need a composite key or OR query
      q = query(collection(db, 'messages'), where('receiverId', 'in', [user.uid, chat.id]), orderBy('createdAt', 'asc'), limit(50));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter DMs client side for lite version simplicity
        if (chat.type === 'dm') {
          if ((data.senderId === user.uid && data.receiverId === chat.id) || 
              (data.senderId === chat.id && data.receiverId === user.uid)) {
            msgs.push({ id: doc.id, ...data } as Message);
          }
        } else {
          msgs.push({ id: doc.id, ...data } as Message);
        }
      });
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    });

    return () => unsub();
  }, [user, chat.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        text: input,
        senderId: user.uid,
        senderName: profile?.displayName || 'Unknown',
        classId: chat.type === 'group' ? chat.id : null,
        receiverId: chat.type === 'dm' ? chat.id : null,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (error) {
      console.error("Message send failed", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60] pt-14">
      <div className="h-14 bg-brand-surface border-b border-brand-border flex items-center px-4 gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 text-brand-secondary hover:text-brand-ink"><ChevronLeft size={24} /></button>
        <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center font-black text-xs text-brand-primary border border-brand-primary/20">
          {chat.name[0]}
        </div>
        <div className="flex-1">
          <h4 className="font-black text-sm leading-tight">{chat.name}</h4>
          <p className="text-[9px] font-bold text-brand-secondary uppercase tracking-widest">{chat.type === 'group' ? 'Class Group' : 'Direct Message'}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[75%]",
            m.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm",
              m.senderId === user?.uid 
                ? "bg-brand-primary text-white rounded-tr-none" 
                : "bg-brand-surface border border-brand-border text-brand-ink rounded-tl-none"
            )}>
              {m.text}
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
               <span className="text-[9px] font-black uppercase tracking-widest text-brand-secondary">{m.senderName}</span>
               <span className="text-[8px] font-bold text-brand-secondary opacity-40">{m.createdAt ? format(m.createdAt.toDate(), 'HH:mm') : ''}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-brand-border bg-brand-surface flex gap-2">
        <input 
          type="text" 
          placeholder="Type a message..."
          className="flex-1 bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit"
          className="bg-brand-primary text-white p-3 rounded-2xl shadow-lg hover:scale-95 transition-all"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
