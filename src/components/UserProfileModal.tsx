import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Friendship } from '../types';
import { X, UserPlus, UserCheck, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';

interface UserProfileModalProps {
  targetUid: string;
  onClose: () => void;
}

export default function UserProfileModal({ targetUid, onClose }: UserProfileModalProps) {
  const { user, navigateToChat } = useAuth();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', targetUid));
        if (docSnap.exists()) {
          setTargetProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetUid]);

  useEffect(() => {
    if (!user || !targetUid) return;
    
    // We listen to both directions
    const q1 = query(
      collection(db, 'friendships'),
      where('requesterId', '==', user.uid),
      where('receiverId', '==', targetUid)
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('requesterId', '==', targetUid),
      where('receiverId', '==', user.uid)
    );

    let friendship1: Friendship | null = null;
    let friendship2: Friendship | null = null;

    const unsub1 = onSnapshot(q1, (snap) => {
      friendship1 = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship : null;
      updateFriendshipState();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      friendship2 = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship : null;
      updateFriendshipState();
    });

    const updateFriendshipState = () => {
      setFriendship(friendship1 || friendship2);
    };

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, targetUid]);

  const sendRequest = async () => {
    if (!user || !profile) return;
    try {
      await addDoc(collection(db, 'friendships'), {
        requesterId: user.uid,
        receiverId: targetUid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also create a notification for the receiver
      await createNotification({
        recipientId: targetUid,
        senderId: user.uid,
        senderName: profile.displayName || 'A resident',
        type: 'request',
        text: `${profile.displayName || 'Someone'} sent you a friend request`,
        link: '/campus'
      });
    } catch (error) {
      console.error("Failed to send friend request", error);
    }
  };

  const acceptRequest = async () => {
    if (!friendship) return;
    try {
      await updateDoc(doc(db, 'friendships', friendship.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to accept friend request", error);
    }
  };

  const cancelOrRemove = async () => {
    if (!friendship) return;
    if (confirm('Are you sure you want to remove this connection?')) {
      try {
        await deleteDoc(doc(db, 'friendships', friendship.id));
        setFriendship(null);
      } catch (error) {
        console.error("Failed to remove connection", error);
      }
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/40 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
  );
  
  if (!targetProfile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-ink/80 backdrop-blur-sm"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-brand-surface w-full max-w-sm rounded-[32px] overflow-hidden border-2 border-brand-border shadow-2xl"
      >
        <div className="h-24 bg-brand-primary/10 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-xl text-brand-ink hover:bg-white transition-all shadow-sm z-10"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 pb-8 -mt-10 overflow-visible text-center">
          <div className="w-24 h-24 rounded-3xl bg-white border-4 border-brand-surface shadow-xl flex items-center justify-center overflow-hidden mx-auto mb-4 relative z-20">
            {targetProfile.photoURL ? (
              <img src={targetProfile.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck size={40} className="text-brand-primary/40" />
            )}
          </div>
          
          <h3 className="text-xl font-black text-brand-ink mb-1">{targetProfile.displayName}</h3>
          <p className="text-xs font-black text-brand-secondary uppercase tracking-[0.2em] mb-6">
            {targetProfile.role} • Campus Resident
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
             <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border">
               <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-1">Status</p>
               <p className="text-xs font-black text-green-500">Active</p>
             </div>
             <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border">
               <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-1">Member Since</p>
               <p className="text-xs font-black text-brand-ink">2024</p>
             </div>
          </div>

          <div className="space-y-3">
            {user?.uid === targetUid ? (
              <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest">This is you!</p>
            ) : (
              <>
                {!friendship && (
                  <button 
                    onClick={sendRequest}
                    className="w-full bg-brand-primary text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-all shadow-lg active:scale-95"
                  >
                    <UserPlus size={20} /> Send Friend Request
                  </button>
                )}

                {friendship?.status === 'pending' && friendship.requesterId === user?.uid && (
                  <button 
                    onClick={cancelOrRemove}
                    className="w-full bg-brand-bg text-brand-secondary border border-brand-border font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white transition-all"
                  >
                    <Clock size={20} /> Request Pending
                  </button>
                )}

                {friendship?.status === 'pending' && friendship.receiverId === user?.uid && (
                  <button 
                    onClick={acceptRequest}
                    className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-all shadow-lg active:scale-95"
                  >
                    <UserCheck size={20} /> Accept Friend Request
                  </button>
                )}

                {friendship?.status === 'accepted' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigateToChat(targetUid, targetProfile.displayName || 'Friend');
                        onClose();
                      }}
                      className="flex-[3] bg-brand-ink text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-all shadow-lg active:scale-95"
                    >
                      <MessageSquare size={20} /> DM
                    </button>
                    <button 
                      onClick={cancelOrRemove}
                      className="flex-1 bg-brand-bg text-brand-secondary border border-brand-border rounded-2xl hover:text-red-500 transition-all flex items-center justify-center"
                      title="Unfriend"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
