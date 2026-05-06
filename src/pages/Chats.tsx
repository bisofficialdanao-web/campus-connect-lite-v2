import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Message, Class, UserProfile } from '../types';
import { Send, User, MessageSquare, Users, ChevronLeft, Search, MoreVertical, Edit2, Trash2, Heart, ThumbsUp, Zap, Frown, Angry, Smile, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { createNotification } from '../lib/notifications';
import { askGuide } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const REACTION_SET = [
  { emoji: '👍', name: 'like' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😮', name: 'shocked' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😡', name: 'angry' }
];

export default function Chats() {
  const { user, profile, activeDM, setActiveDM } = useAuth();
  const [activeTab, setActiveTab] = useState<'group' | 'direct'>('group');
  const [activeChat, setActiveChat] = useState<{ id: string, name: string, type: 'dm' | 'group', photo?: string } | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentDMs, setRecentDMs] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeDM) {
      setActiveTab('direct');
      setActiveChat({ id: activeDM.id, name: activeDM.name, type: 'dm' });
    }
  }, [activeDM]);

  useEffect(() => {
    if (!user || !profile) return;
    
    // Fetch groups (classes)
    const qClasses = profile.role === 'teacher'
      ? query(collection(db, 'classes'), where('teacherId', '==', user.uid))
      : query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid));
    
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      const c: Class[] = [];
      snapshot.forEach(doc => c.push({ id: doc.id, ...doc.data() } as Class));
      setClasses(c);
    });

    // Fetch potential DM partners (accepted friends)
    const qFriends1 = query(collection(db, 'friendships'), where('requesterId', '==', user.uid), where('status', '==', 'accepted'));
    const qFriends2 = query(collection(db, 'friendships'), where('receiverId', '==', user.uid), where('status', '==', 'accepted'));

    const unsubFriends1 = onSnapshot(qFriends1, (snap) => fetchFriendProfiles());
    const unsubFriends2 = onSnapshot(qFriends2, (snap) => fetchFriendProfiles());

    const fetchFriendProfiles = async () => {
      const friendships: any[] = [];
      const snap1 = await getDocs(qFriends1);
      const snap2 = await getDocs(qFriends2);
      snap1.forEach(d => friendships.push(d.data()));
      snap2.forEach(d => friendships.push(d.data()));

      const friendIds = friendships.map(f => f.requesterId === user.uid ? f.receiverId : f.requesterId);
      
      const profiles: UserProfile[] = [];
      // Always include Guide AI
      profiles.push({
        uid: 'guide-ai',
        displayName: 'The Guide (AI)',
        photoURL: '',
        role: 'teacher',
        email: 'ai@campus.edu',
        isApproved: true,
        createdAt: null,
        updatedAt: null
      });

      for (const id of friendIds) {
        if (id === 'guide-ai') continue;
        const pDoc = await getDoc(doc(db, 'users', id));
        if (pDoc.exists()) {
          profiles.push({ uid: pDoc.id, ...pDoc.data() } as UserProfile);
        }
      }
      setRecentDMs(profiles);
    };

    return () => {
      unsubClasses();
      unsubFriends1();
      unsubFriends2();
    };
  }, [user, profile]);

  const handleBack = () => {
    setActiveChat(null);
    setActiveDM(null);
  };

  if (activeChat) {
    return <ChatWindow chat={activeChat} onBack={handleBack} />;
  }

  const filteredGroups = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDMs = recentDMs.filter(dm => dm.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-brand-ink">Chat Hub</h2>
        <div className="relative">
           <input 
            type="text" 
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-brand-bg border border-brand-border/30 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-primary/40 transition-all"
           />
           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary/40" />
        </div>
      </div>

      <div className="flex border-b border-brand-border/30">
        <button 
          onClick={() => setActiveTab('group')}
          className={cn(
            "flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-all relative",
            activeTab === 'group' ? "text-brand-primary" : "text-brand-secondary/60"
          )}
        >
          Group Chats
          {activeTab === 'group' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('direct')}
          className={cn(
            "flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-all relative",
            activeTab === 'direct' ? "text-brand-primary" : "text-brand-secondary/60"
          )}
        >
          Direct Messages
          {activeTab === 'direct' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        <AnimatePresence mode="wait">
          {activeTab === 'group' ? (
            <motion.div 
              key="groups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {filteredGroups.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setActiveChat({ id: c.id, name: c.name, type: 'group' })}
                  className="w-full flex items-center gap-3 p-3 bg-brand-surface border border-brand-border/30 rounded-2xl hover:border-brand-primary/20 transition-all text-left group shadow-sm"
                >
                  <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center text-brand-primary font-bold text-lg border border-brand-primary/10">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-brand-ink text-sm leading-tight group-hover:text-brand-primary transition-colors">{c.name}</h4>
                    <p className="text-[11px] font-medium text-brand-secondary/50 uppercase tracking-tighter mt-0.5">Classroom Room</p>
                  </div>
                  <MoreHorizontal size={16} className="text-brand-secondary/30" />
                </button>
              ))}
              {filteredGroups.length === 0 && (
                <div className="py-12 text-center">
                  <Users size={40} className="mx-auto text-brand-secondary/10 mb-3" />
                  <p className="text-xs font-bold text-brand-secondary/40 uppercase tracking-widest">No group chats found</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="direct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {filteredDMs.map(dm => (
                <button 
                  key={dm.uid} 
                  onClick={() => setActiveChat({ id: dm.uid, name: dm.displayName, type: 'dm', photo: dm.photoURL })}
                  className="w-full flex items-center gap-3 p-3 bg-brand-surface border border-brand-border/30 rounded-2xl hover:border-brand-primary/20 transition-all text-left group shadow-sm"
                >
                  <div className="w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center overflow-hidden border border-brand-border/20">
                    {dm.uid === 'guide-ai' ? (
                      <div className="w-full h-full bg-brand-ink flex items-center justify-center text-[#ff00ff]">
                        <Sparkles size={24} />
                      </div>
                    ) : dm.photoURL ? (
                      <img src={dm.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-brand-secondary/60 font-bold text-lg">{dm.displayName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-brand-ink text-sm leading-tight group-hover:text-brand-primary transition-colors">{dm.displayName}</h4>
                    <p className="text-[11px] font-medium text-brand-secondary/50 uppercase tracking-tighter mt-0.5">Direct Message</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                </button>
              ))}
              {filteredDMs.length === 0 && (
                <div className="py-12 text-center">
                  <MessageSquare size={40} className="mx-auto text-brand-secondary/10 mb-3" />
                  <p className="text-xs font-bold text-brand-secondary/40 uppercase tracking-widest">No direct messages found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChatWindow({ chat, onBack }: { chat: { id: string, name: string, type: 'dm' | 'group', photo?: string }, onBack: () => void }) {
  const { user, profile, navigateToChat } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showQuickMenu, setShowQuickMenu] = useState<{ id: string, name: string, x: number, y: number } | null>(null);
  const [longPressedMessage, setLongPressedMessage] = useState<string | null>(null);

  const chatId = chat.type === 'dm' 
    ? [user?.uid, chat.id].sort().join('_') 
    : chat.id;
  const collectionName = chat.type === 'dm' ? 'direct_messages' : 'group_messages';

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, collectionName), 
      where(chat.type === 'dm' ? 'chatId' : 'classId', '==', chatId), 
      orderBy('createdAt', 'asc'), 
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsub();
  }, [user, chatId, collectionName]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !profile) return;
    
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      text: input,
      senderId: user.uid,
      senderName: profile.displayName || 'Me',
      senderPhoto: profile.photoURL,
      createdAt: { toDate: () => new Date() }, // Mock for optimistic UI
      reactions: {}
    };

    // Optimistic Update
    setMessages(prev => [...prev, tempMessage]);
    setInput('');
    scrollToBottom();

    try {
      if (editingMessage) {
        const msgRef = doc(db, collectionName, editingMessage.id);
        await updateDoc(msgRef, {
          text: input,
          isEdited: true,
          updatedAt: serverTimestamp()
        });
        setEditingMessage(null);
      } else {
        await addDoc(collection(db, collectionName), {
          text: input,
          senderId: user.uid,
          senderName: profile.displayName || 'Unknown',
          senderPhoto: profile.photoURL || '',
          [chat.type === 'dm' ? 'chatId' : 'classId']: chatId,
          receiverId: chat.type === 'dm' ? chat.id : null,
          createdAt: serverTimestamp(),
          reactions: {}
        });

        // Notifications
        if (chat.type === 'dm' && chat.id !== 'guide-ai') {
          await createNotification({
            recipientId: chat.id,
            senderId: user.uid,
            senderName: profile.displayName || 'Someone',
            type: 'message',
            text: `${profile.displayName} sent a message: "${input.substring(0, 30)}..."`,
            link: '/chats'
          });
        }

        // AI Logic
        if (chat.type === 'dm' && chat.id === 'guide-ai') {
          setIsAiTyping(true);
          try {
            const history = messages.slice(-10).map(m => ({
              role: m.senderId === user.uid ? 'user' as const : 'model' as const,
              parts: [{ text: m.text }]
            }));
            
            const aiResponse = await askGuide(input, history);
            
            await addDoc(collection(db, collectionName), {
              text: aiResponse,
              senderId: 'guide-ai',
              senderName: 'The Guide (AI)',
              senderPhoto: '',
              chatId: chatId,
              receiverId: user.uid,
              createdAt: serverTimestamp(),
              reactions: {}
            });
          } catch (error) {
            console.error("AI Response failed", error);
            await addDoc(collection(db, collectionName), {
              text: "I'm sorry, I'm having trouble connecting to my neural network. Please try again.",
              senderId: 'guide-ai',
              senderName: 'The Guide (AI)',
              senderPhoto: '',
              chatId: chatId,
              receiverId: user.uid,
              createdAt: serverTimestamp(),
              reactions: {}
            });
          } finally {
            setIsAiTyping(false);
          }
        }
      }
    } catch (error) {
      console.error("Message send failed", error);
      // Rollback logic could be added here
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = { ...(msg.reactions || {}) };
    const userList = [...(currentReactions[emoji] || [])];
    
    // Check if user already reacted with THIS emoji
    const userIdx = userList.indexOf(user.uid);
    if (userIdx > -1) {
      userList.splice(userIdx, 1);
    } else {
      // Rule: only one reaction per user per message
      // Removing user from all other reactions first
      Object.keys(currentReactions).forEach(key => {
        const idx = currentReactions[key].indexOf(user.uid);
        if (idx > -1) {
          currentReactions[key].splice(idx, 1);
        }
      });
      userList.push(user.uid);
    }

    currentReactions[emoji] = userList;

    try {
      await updateDoc(doc(db, collectionName, messageId), {
        reactions: currentReactions
      });
      setLongPressedMessage(null);
    } catch (error) {
      console.error("Failed to update reaction", error);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      setLongPressedMessage(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent, m: Message) => {
    e.stopPropagation();
    if (m.senderId === user?.uid || m.senderId === 'guide-ai') return;
    setShowQuickMenu({
      id: m.senderId,
      name: m.senderName,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60] pt-14 pb-20 sm:pb-0">
      {/* Header */}
      <div className="h-14 bg-brand-surface border-b border-brand-border/40 flex items-center px-4 gap-3">
        <button onClick={onBack} className="p-1.5 text-brand-secondary hover:text-brand-ink transition-colors"><ChevronLeft size={22} /></button>
        <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center overflow-hidden border border-brand-border/20 shadow-sm">
          {chat.id === 'guide-ai' ? (
            <div className="w-full h-full bg-brand-ink flex items-center justify-center text-[#ff00ff]">
               <Sparkles size={18} />
            </div>
          ) : chat.photo ? (
            <img src={chat.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-brand-primary font-bold text-sm tracking-tight">{chat.name[0]}</span>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm leading-tight text-brand-ink">{chat.name}</h4>
          <p className="text-[10px] font-bold text-brand-secondary/40 uppercase tracking-widest mt-0.5">{chat.type === 'group' ? 'Public Room' : 'Direct'}</p>
        </div>
        <button className="p-2 text-brand-secondary/40"><MoreVertical size={18} /></button>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:20px_20px]"
        onClick={() => { setShowQuickMenu(null); setLongPressedMessage(null); }}
      >
        {messages.map((m, i) => {
          const isMine = m.senderId === user?.uid;
          const showAvatar = i === 0 || messages[i-1].senderId !== m.senderId;

          return (
            <div key={m.id} className={cn(
              "flex items-end gap-2",
              isMine ? "flex-row-reverse" : "flex-row"
            )}>
              {/* Avatar */}
              <div 
                className={cn(
                  "w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-brand-border/20 transition-transform active:scale-90",
                  !showAvatar && "opacity-0 pointer-events-none"
                )}
                onClick={(e) => handleAvatarClick(e, m)}
              >
                {m.senderPhoto ? (
                  <img src={m.senderPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-brand-secondary/40">{m.senderName[0]}</div>
                )}
              </div>

              <div className={cn(
                "flex flex-col max-w-[70%]",
                isMine ? "items-end" : "items-start"
              )}>
                {/* Bubble */}
                <motion.div 
                  initial={m.id.startsWith('temp-') ? { scale: 0.8, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  onContextMenu={(e) => { e.preventDefault(); setLongPressedMessage(m.id); }}
                  className={cn(
                    "px-4 py-2.5 rounded-[18px] text-[12px] font-medium shadow-sm relative group",
                    isMine 
                      ? "bg-brand-primary text-white rounded-br-none" 
                      : "bg-white border border-brand-border/40 text-brand-ink rounded-bl-none"
                  )}
                >
                  <div className={cn(
                    "prose prose-sm max-w-none break-words",
                    "prose-p:text-[12px] prose-p:font-medium prose-p:leading-relaxed prose-p:mb-2 last:prose-p:mb-0",
                    "prose-headings:text-brand-ink prose-headings:font-bold prose-headings:mb-1 prose-headings:mt-2 first:prose-headings:mt-0",
                    "prose-strong:font-bold prose-strong:text-brand-primary",
                    "prose-ul:list-disc prose-ul:pl-4 prose-ul:mb-2",
                    "prose-ol:list-decimal prose-ol:pl-4 prose-ol:mb-2",
                    "prose-li:text-[12px] prose-li:font-medium",
                    isMine ? "prose-invert" : ""
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                  {m.isEdited && <span className="ml-1 text-[8px] opacity-60">(edited)</span>}

                  {/* Long Press Menu Trigger (Desktop fallback) */}
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setLongPressedMessage(m.id)} className={cn("p-0.5 rounded-full", isMine ? "hover:bg-white/10" : "hover:bg-black/5")}>
                       <MoreHorizontal size={12} />
                     </button>
                  </div>
                </motion.div>

                {/* Reactions */}
                {m.reactions && Object.keys(m.reactions).some(k => m.reactions![k].length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(m.reactions).map(([emoji, uids]) => uids.length > 0 ? (
                      <button 
                        key={emoji}
                        onClick={() => toggleReaction(m.id, emoji)}
                        className={cn(
                          "px-1.5 h-[18px] rounded-full flex items-center gap-1 border transition-all text-[10px] font-bold",
                          uids.includes(user?.uid || '') 
                            ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" 
                            : "bg-white border-brand-border/40 text-brand-ink"
                        )}
                      >
                        <span>{emoji}</span>
                        <span>{uids.length}</span>
                      </button>
                    ) : null)}
                  </div>
                )}

                {/* Metadata */}
                {showAvatar && (
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    {!isMine && <span className="text-[9px] font-black uppercase tracking-tighter text-brand-secondary/40">{m.senderName}</span>}
                    <span className="text-[9px] font-medium text-brand-secondary/40">
                      {m.createdAt?.toDate ? format(m.createdAt.toDate(), 'HH:mm') : 'Sending...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isAiTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-ink flex items-center justify-center overflow-hidden border border-brand-border/20 shadow-sm shrink-0">
               <Sparkles size={14} className="text-[#ff00ff] animate-pulse" />
            </div>
            <div className="flex flex-col items-start max-w-[70%]">
              <div className="bg-white border border-brand-border/40 p-3 px-4 rounded-xl rounded-bl-none flex gap-1.5 shadow-sm">
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#ff00ff] rounded-full" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#ff00ff] mt-1 ml-1">Guide is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-brand-border/20 bg-brand-surface shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        {editingMessage && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-brand-bg rounded-lg">
            <span className="text-[10px] font-bold text-brand-primary uppercase">Editing Message</span>
            <button onClick={() => { setEditingMessage(null); setInput(''); }} className="text-brand-secondary"><Trash2 size={12} /></button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Aa"
            className="flex-1 bg-brand-bg border border-brand-border/30 rounded-2xl px-4 h-[44px] text-[12px] font-medium focus:outline-none focus:border-brand-primary/30 transition-all outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="bg-brand-primary text-white w-[44px] h-[44px] rounded-2xl flex items-center justify-center shadow-soft hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Reaction/Edit/Delete Menu Overlay */}
      <AnimatePresence>
        {longPressedMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-ink/20 backdrop-blur-[2px]"
            onClick={() => setLongPressedMessage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[24px] shadow-2xl border border-brand-border/20 overflow-hidden w-full max-w-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Reactions Row */}
              <div className="p-4 flex justify-between border-b border-brand-border/10 bg-brand-bg/50">
                {REACTION_SET.map(r => (
                  <button 
                    key={r.emoji}
                    onClick={() => toggleReaction(longPressedMessage, r.emoji)}
                    className="text-2xl hover:scale-125 transition-transform active:scale-95"
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
              
              {/* Actions */}
              <div className="p-2 space-y-1">
                {messages.find(m => m.id === longPressedMessage)?.senderId === user?.uid && (
                  <>
                    <button 
                      onClick={() => {
                        const m = messages.find(msg => msg.id === longPressedMessage);
                        if (m) {
                          setEditingMessage(m);
                          setInput(m.text);
                          setLongPressedMessage(null);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 text-[12px] font-bold text-brand-ink hover:bg-brand-bg rounded-xl transition-colors"
                    >
                      <Edit2 size={16} className="text-brand-primary" /> Edit Message
                    </button>
                    <button 
                      onClick={() => deleteMessage(longPressedMessage)}
                      className="w-full flex items-center gap-3 p-3 text-[12px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} /> Delete Message
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    const m = messages.find(msg => msg.id === longPressedMessage);
                    if (m) {
                      navigator.clipboard.writeText(m.text);
                      setLongPressedMessage(null);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 text-[12px] font-bold text-brand-ink hover:bg-brand-bg rounded-xl transition-colors"
                >
                  <MoreHorizontal size={16} className="text-brand-secondary" /> Copy Text
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Quick Menu */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[110] bg-white rounded-2xl shadow-2xl border border-brand-border/20 p-2 w-[180px]"
            style={{ 
              left: Math.min(showQuickMenu.x, window.innerWidth - 190), 
              top: Math.min(showQuickMenu.y, window.innerHeight - 120) 
            }}
          >
            <div className="px-3 py-2 border-b border-brand-border/10 mb-1">
              <p className="text-[10px] font-black uppercase text-brand-secondary/40 tracking-widest">{showQuickMenu.name}</p>
            </div>
            <button 
              onClick={() => {
                navigateToChat(showQuickMenu.id, showQuickMenu.name);
                setShowQuickMenu(null);
              }}
              className="w-full flex items-center gap-2.5 p-2.5 text-[11px] font-bold text-brand-ink hover:bg-brand-primary/5 rounded-xl transition-colors"
            >
              <MessageSquare size={14} className="text-brand-primary" /> Direct Message
            </button>
            <button 
              onClick={() => window.location.href = `/profile?uid=${showQuickMenu.id}`}
              className="w-full flex items-center gap-2.5 p-2.5 text-[11px] font-bold text-brand-ink hover:bg-brand-primary/5 rounded-xl transition-colors"
            >
              <User size={14} className="text-brand-secondary" /> View Profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
