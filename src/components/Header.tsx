import React, { useState, useEffect } from 'react';
import { Search, Bell, LogOut, ChevronDown, User, MessageSquare, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import UserProfileModal from './UserProfileModal';

export default function Header() {
  const { user, profile, logout } = useAuth();
  const [showPresence, setShowPresence] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string, name: string }[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  
  // Mock notifications for demonstration
  const notifications = [
    { id: '1', text: 'New announcement in Math 101', time: '2m' },
    { id: '2', text: 'Your assignment was graded', time: '1h' },
  ];

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

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-brand-surface border-b border-brand-border flex items-center px-4 z-50">
      {/* Presence Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowPresence(!showPresence)}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
            <GraduationCap size={20} className="text-white" />
          </div>
          <ChevronDown size={14} className={cn("text-brand-secondary transition-transform", showPresence && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showPresence && (
            <>
              <div className="fixed inset-0" onClick={() => setShowPresence(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 mt-2 w-56 bg-brand-surface border border-brand-border shadow-2xl rounded-lg overflow-hidden py-2"
              >
                <div className="px-3 py-1 text-xs font-bold text-brand-secondary uppercase tracking-widest border-b border-brand-border mb-1">
                  Online Users
                </div>
                {onlineUsers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-brand-secondary italic">No others online</div>
                ) : (
                  onlineUsers.map(u => (
                    <div key={u.id} className="px-3 py-2 flex items-center justify-between hover:bg-brand-bg transition-colors">
                      <button 
                        onClick={() => {
                          setSelectedUserUid(u.id);
                          setShowPresence(false);
                        }}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">{u.name}</span>
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUserUid(u.id);
                          setShowPresence(false);
                        }}
                        className="p-1 text-brand-primary hover:bg-white rounded border border-transparent hover:border-brand-border transition-all"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedUserUid && (
          <UserProfileModal targetUid={selectedUserUid} onClose={() => setSelectedUserUid(null)} />
        )}
      </AnimatePresence>

      {/* Centered Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search classes..."
            className="w-full bg-brand-bg border border-brand-border rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
          />
        </div>
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
            }}
            className={cn(
              "relative p-1.5 rounded-lg text-brand-secondary hover:text-brand-primary transition-all active:scale-95",
              showNotifications && "bg-brand-primary/10 text-brand-primary"
            )}
          >
            <Bell size={18} />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-50 cursor-default" onClick={() => setShowNotifications(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="fixed sm:absolute right-4 top-14 sm:top-auto sm:right-0 sm:mt-2 w-[calc(100vw-32px)] sm:w-64 bg-brand-surface border border-brand-border shadow-huge rounded-2xl overflow-hidden py-2 z-[60]"
                >
                  <div className="px-3 py-1.5 text-[10px] font-black text-brand-secondary uppercase tracking-widest border-b border-brand-border/50 mb-1">
                    Notifications
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className="px-3 py-2.5 hover:bg-brand-bg transition-colors cursor-pointer group border-b border-brand-border/30 last:border-0 text-left">
                      <div className="text-sm font-medium leading-snug group-hover:text-brand-primary transition-colors">{n.text}</div>
                      <div className="text-[10px] text-brand-secondary mt-0.5">{n.time} ago</div>
                    </div>
                  ))}
                  <button className="w-full py-2 text-[10px] font-black text-brand-primary hover:bg-brand-bg uppercase tracking-widest">
                    View All
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center overflow-hidden">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={16} className="text-brand-primary" />
          )}
        </div>
        <button onClick={logout} className="p-1.5 text-brand-secondary hover:text-red-500 transition-all active:scale-95">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}


