import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, User, MessageSquare, GraduationCap, X, UserPlus, BookPlus, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, limit, orderBy, where, getDocs, doc, updateDoc, writeBatch, serverTimestamp, arrayUnion, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import UserProfileModal from './UserProfileModal';
import { AppNotification, UserProfile, Class } from '../types';
import { markNotificationAsRead, createNotification } from '../lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { PageView } from './BottomNav';

interface HeaderProps {
  onViewChange?: (view: PageView) => void;
  onViewUser?: (uid: string) => void;
}

export default function Header({ onViewChange, onViewUser }: HeaderProps) {
  const { user, profile } = useAuth();
  const [showPresence, setShowPresence] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string, name: string }[]>([]);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ users: UserProfile[], classes: Class[] }>({ users: [], classes: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification Popup State
  const [activePopupNotification, setActivePopupNotification] = useState<AppNotification | null>(null);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      setNotifications(msgs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'presence'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: { id: string, name: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'online' && doc.id !== user.uid) {
          users.push({ id: doc.id, name: data.displayName || 'Campus Student' });
        }
      });
      setOnlineUsers(users);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], classes: [] });
      setShowSearchResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const lowerQuery = searchQuery.toLowerCase();
        
        // Search Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const matchedUsers = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter(u => u.displayName.toLowerCase().includes(lowerQuery) && u.uid !== user?.uid)
          .slice(0, 5);

        // Search Classes
        const classesSnap = await getDocs(collection(db, 'classes'));
        const matchedClasses = classesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Class))
          .filter(c => c.name.toLowerCase().includes(lowerQuery) || c.subject.toLowerCase().includes(lowerQuery))
          .slice(0, 5);

        setSearchResults({ users: matchedUsers, classes: matchedClasses });
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  // Click outside to close search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.isRead).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
    }
    setActivePopupNotification(n);
    setShowNotifications(false);
  };

  const handleAction = async (e: React.MouseEvent, type: 'friend' | 'class', id: string, name: string) => {
    e.stopPropagation();
    if (!user || !profile) return;
    
    try {
      if (type === 'friend') {
        await addDoc(collection(db, 'friendships'), {
          requesterId: user.uid,
          receiverId: id,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await createNotification({
          recipientId: id,
          senderId: user.uid,
          senderName: profile.displayName,
          type: 'request',
          text: `${profile.displayName} sent you a friend request.`,
          link: '/profile'
        });
      } else {
        await updateDoc(doc(db, 'classes', id), {
          pendingInvites: arrayUnion(user.uid)
        });
        // Notify teacher
        const q = query(collection(db, 'classes'), where('id', '==', id));
        const classSnap = await getDocs(q);
        if (!classSnap.empty) {
          const teacherId = classSnap.docs[0].data().teacherId;
          await createNotification({
            recipientId: teacherId,
            senderId: user.uid,
            senderName: profile.displayName,
            type: 'class_request',
            text: `${profile.displayName} wants to join your class: ${name}`,
            link: '/classes'
          });
        }
      }
    } catch (error) {
      console.error("Action failed", error);
    }
  };

  const handleNotificationAction = async (n: AppNotification, action: 'accept' | 'deny') => {
    if (!user || !profile) return;
    try {
      if (n.type === 'request') {
        const q1 = query(collection(db, 'friendships'), where('requesterId', '==', n.senderId), where('receiverId', '==', user.uid));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          if (action === 'accept') {
            await updateDoc(doc(db, 'friendships', snap.docs[0].id), { status: 'accepted', updatedAt: serverTimestamp() });
            await createNotification({
              recipientId: n.senderId,
              senderId: user.uid,
              senderName: profile.displayName,
              type: 'system',
              text: `${profile.displayName} accepted your friend request!`,
              link: '/profile'
            });
          } else {
            await updateDoc(doc(db, 'friendships', snap.docs[0].id), { status: 'denied', updatedAt: serverTimestamp() });
          }
        }
      } 
      await markNotificationAsRead(n.id);
    } catch (error) {
      console.error("Notification action failed", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-brand-surface border-b border-brand-border flex items-center px-4 z-50">
      {/* Icon Redirection */}
      <div className="relative">
        <button 
          onClick={() => onViewChange?.('campus')}
          className="flex items-center gap-2 group mr-2"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
            <GraduationCap size={11} className="text-white" />
          </div>
        </button>
      </div>

      {/* Centered Overhauled Search */}
      <div className="flex-1 flex justify-center px-4">
        <div ref={searchRef} className="relative w-full max-w-[330px] group z-[11]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary transition-colors" size={11} />
          <input 
            type="text" 
            placeholder="Search classes or peers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            className="w-full bg-brand-bg border border-brand-border rounded-full py-1.5 pl-9 pr-4 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
          />

          <AnimatePresence>
            {showSearchResults && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 5 }}
                className="absolute top-full mt-2 left-0 right-0 bg-brand-surface border border-brand-border shadow-2xl rounded-2xl overflow-hidden py-2"
              >
                {isSearching ? (
                  <div className="px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] font-black text-brand-secondary uppercase tracking-widest">Searching...</span>
                  </div>
                ) : searchResults.users.length === 0 && searchResults.classes.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="text-[9px] text-brand-secondary font-black uppercase tracking-widest">No matches found</p>
                  </div>
                ) : (
                  <div className="space-y-[3px]">
                    {/* Users Section */}
                    {searchResults.users.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[9px] font-black text-brand-secondary/40 uppercase tracking-[0.2em] mb-1">Peers</div>
                        {searchResults.users.map(u => (
                          <div 
                            key={u.uid} 
                            onClick={() => {
                              onViewUser?.(u.uid);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 flex items-center justify-between hover:bg-brand-bg transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-brand-bg border border-brand-border/30 overflow-hidden">
                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <User size={9} className="m-auto mt-1.5 text-brand-secondary" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-brand-ink uppercase leading-none">{u.displayName}</span>
                                <span className="text-[9px] font-bold text-brand-secondary/50 uppercase">{u.role === 'teacher' ? 'Faculty' : `Grade ${u.gradeLevel}`}</span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => handleAction(e, 'friend', u.uid, u.displayName)}
                              className="px-2 py-1 bg-brand-primary text-white rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                            >
                              <UserPlus size={11} /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Classes Section */}
                    {searchResults.classes.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[9px] font-black text-brand-secondary/40 uppercase tracking-[0.2em] mb-1">Classes</div>
                        {searchResults.classes.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              onViewChange?.('classes');
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 flex items-center justify-between hover:bg-brand-bg transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-brand-primary/5 flex items-center justify-center text-brand-primary">
                                <GraduationCap size={11} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-brand-ink uppercase leading-none">{c.name}</span>
                                <span className="text-[9px] font-bold text-brand-secondary/50 uppercase">{c.subject}</span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => handleAction(e, 'class', c.id, c.name)}
                              className="px-2 py-1 bg-brand-bg text-brand-primary border border-brand-primary/20 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-brand-primary hover:text-white active:scale-95 transition-all"
                            >
                              <BookPlus size={11} /> Join
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button 
            id="notification-bell"
            onClick={() => {
              if (!showNotifications && unreadCount > 0) markAllAsRead();
              setShowNotifications(!showNotifications);
            }}
            className={cn(
              "relative p-1.5 rounded-lg text-brand-secondary hover:text-brand-primary transition-all active:scale-95 z-[61] shadow-neon border border-brand-border/10",
              showNotifications && "bg-brand-primary/10 text-brand-primary"
            )}
          >
            <Bell size={11} />
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-brand-surface flex items-center justify-center">
                <span className="text-[6px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-[59]" 
                  onClick={() => setShowNotifications(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="fixed sm:absolute right-4 top-14 sm:top-auto sm:right-0 sm:mt-2 w-[calc(100vw-32px)] sm:w-64 bg-brand-surface border border-brand-border shadow-huge rounded-2xl overflow-hidden py-2 z-[60]"
                >
                  <div className="px-3 py-1.5 text-[10px] font-black text-brand-secondary/40 uppercase tracking-widest border-b border-brand-border/50 mb-1 flex justify-between items-center">
                    Alerts
                    {unreadCount > 0 && <span className="text-brand-primary">{unreadCount} New</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-8 h-8 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-2 opacity-50">
                        <Bell size={11} />
                      </div>
                      <p className="text-[9px] text-brand-secondary font-black uppercase tracking-widest">No alerts</p>
                    </div>
                  ) : notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "px-3 py-2.5 hover:bg-brand-bg transition-colors cursor-pointer group border-b border-brand-border/30 last:border-0 text-left relative",
                        !n.isRead && "bg-brand-primary/5"
                      )}
                    >
                      {!n.isRead && <div className="absolute left-1 top-4 w-1 h-1 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(255,183,197,1)]" />}
                      <div className={cn(
                        "text-[10px] font-black uppercase leading-tight group-hover:text-brand-primary transition-colors pr-2",
                        n.isRead ? "text-brand-ink/40" : "text-brand-ink"
                      )}>
                        {n.text}
                      </div>

                      {/* Actionable Notifications */}
                      {(n.type === 'request' || n.type === 'class_request') && !n.isRead && (
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleNotificationAction(n, 'accept'); }}
                            className="bg-brand-primary text-white px-2 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 hover:brightness-110"
                          >
                            <Check size={11} /> Accept
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleNotificationAction(n, 'deny'); }}
                            className="bg-brand-bg text-brand-ink border border-brand-border px-2 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 hover:bg-brand-border/20"
                          >
                            <X size={11} /> Deny
                          </button>
                        </div>
                      )}

                      <div className="text-[9px] font-bold text-brand-secondary/30 mt-1 flex items-center gap-1 uppercase italic">
                         {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => onViewChange?.('profile')}
          className="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center overflow-hidden hover:ring-2 ring-brand-primary/20 transition-all active:scale-95"
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={11} className="text-brand-primary" />
          )}
        </button>
      </div>

      {/* Notification Popup Card */}
      <AnimatePresence>
        {activePopupNotification && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActivePopupNotification(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0.5, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="relative w-full max-w-[320px] bg-brand-surface border border-brand-border shadow-2xl rounded-[24px] overflow-hidden"
            >
              <button 
                onClick={() => setActivePopupNotification(null)}
                className="absolute top-3 right-3 p-1 bg-brand-bg text-brand-secondary hover:text-brand-ink rounded-full transition-colors z-10"
              >
                <X size={11} />
              </button>

              <div className="p-5 pt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Bell size={11} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-brand-ink uppercase tracking-tight">Signal Received</h3>
                    <p className="text-[9px] font-bold text-brand-secondary/40 uppercase tracking-widest italic">
                      {activePopupNotification.createdAt?.toDate ? formatDistanceToNow(activePopupNotification.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                    </p>
                  </div>
                </div>

                <div className="bg-brand-bg/50 border border-brand-border/40 p-3 rounded-xl mb-3">
                   <p className="text-[10px] font-bold text-brand-ink leading-relaxed">
                     {activePopupNotification.text}
                   </p>
                </div>

                <button 
                  onClick={() => {
                    if (activePopupNotification.link) {
                      if (activePopupNotification.link.includes('profile')) onViewChange?.('profile');
                      if (activePopupNotification.link.includes('classes')) onViewChange?.('classes');
                      if (activePopupNotification.link.includes('campus')) onViewChange?.('campus');
                    }
                    setActivePopupNotification(null);
                  }}
                  className="w-full bg-brand-ink text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Locate Activity
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}


