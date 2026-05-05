import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Message, Class, UserProfile } from '../types';
import { Send, User, MessageSquare, Users, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { createNotification } from '../lib/notifications';

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
        <h2 className="text-xl font-bold tracking-tight">Messages</h2>
        <button className="w-9 h-9 flex items-center justify-center bg-brand-bg rounded-lg border border-brand-border/30 text-brand-secondary"><Search size={18} /></button>
      </div>

      <div className="space-y-4">
        {/* Classes / Groups */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-brand-primary" size={14} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary/60">Groups</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {classes.map(c => (
              <button 
                key={c.id} 
                onClick={() => setActiveChat({ id: c.id, name: c.name, type: 'group' })}
                className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border/40 rounded-xl hover:border-brand-primary/30 transition-all text-left shadow-soft active:scale-[0.99]"
              >
                <div className="w-10 h-10 bg-brand-primary/5 rounded-lg flex items-center justify-center text-brand-primary font-bold text-sm">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-brand-ink text-sm truncate">{c.name}</h4>
                  <p className="text-[11px] font-medium text-brand-secondary/60 truncate">Class Group</p>
                </div>
              </button>
            ))}
            {classes.length === 0 && (
              <div className="p-6 bg-brand-bg border border-brand-border/40 border-dashed rounded-xl text-center">
                <p className="text-[11px] font-semibold text-brand-secondary/40 uppercase tracking-wider">No groups yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Direct Messages */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <User className="text-brand-primary" size={14} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary/60">Direct Messages</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {recentDMs.map(dm => (
              <button 
                key={dm.id} 
                onClick={() => setActiveChat({ id: dm.id, name: dm.name, type: 'dm' })}
                className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border/40 rounded-xl hover:border-brand-primary/30 transition-all text-left shadow-soft active:scale-[0.99]"
              >
                <div className="w-10 h-10 bg-brand-bg rounded-lg flex items-center justify-center text-brand-secondary font-bold text-sm">
                  {dm.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-brand-ink text-sm truncate">{dm.name}</h4>
                  <p className="text-[11px] font-medium text-brand-secondary/60 truncate">Active now</p>
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

      if (chat.type === 'dm' && chat.id !== 'guide-ai') {
        await createNotification({
          recipientId: chat.id,
          senderId: user.uid,
          senderName: profile?.displayName || 'Someone',
          type: 'message',
          text: `You have a new message from ${profile?.displayName || 'Someone'}: "${input.substring(0, 30)}..."`,
          link: '/chats'
        });
      }

      setInput('');
    } catch (error) {
      console.error("Message send failed", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60] pt-14">
      <div className="h-14 bg-brand-surface border-b border-brand-border/40 flex items-center px-4 gap-3">
        <button onClick={onBack} className="p-1.5 text-brand-secondary hover:text-brand-ink transition-colors"><ChevronLeft size={22} /></button>
        <div className="w-8 h-8 rounded-lg bg-brand-primary/5 flex items-center justify-center font-bold text-xs text-brand-primary border border-brand-primary/10">
          {chat.name[0]}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm leading-tight">{chat.name}</h4>
          <p className="text-[11px] font-medium text-brand-secondary/60 leading-none">{chat.type === 'group' ? 'Group Chat' : 'Member'}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[80%]",
            m.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-3.5 py-2.5 rounded-xl text-sm font-medium",
              m.senderId === user?.uid 
                ? "bg-brand-primary text-white" 
                : "bg-white border border-brand-border/40 text-brand-ink"
            )}>
              {m.text}
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
               <span className="text-[11px] font-medium text-brand-secondary/50">{m.senderName}</span>
               <span className="text-brand-border/30 text-[8px]">•</span>
               <span className="text-[11px] font-medium text-brand-secondary/40">{m.createdAt ? format(m.createdAt.toDate(), 'HH:mm') : ''}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-brand-border/20 bg-brand-surface flex gap-2">
        <input 
          type="text" 
          placeholder="Type a message..."
          className="flex-1 bg-brand-bg border border-brand-border/30 rounded-xl px-4 h-[44px] text-sm focus:outline-none focus:border-brand-primary/30 transition-all outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit"
          className="bg-brand-primary text-white w-[44px] h-[44px] rounded-xl flex items-center justify-center shadow-soft hover:brightness-110 active:scale-95 transition-all"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
