import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, ShieldCheck, Mail, LogOut, Edit3, Camera, Save, X, 
  GraduationCap, BookOpen, AlertCircle, Upload, Loader2, 
  LayoutDashboard, CreditCard, Users, MoreHorizontal, 
  Share2, Check, Pencil, UserPlus, UserCheck, MessageSquare, 
  FileText, Star, Briefcase, MapPin, Hash, Heart
} from 'lucide-react';
import { 
  doc, updateDoc, serverTimestamp, getDoc, collection, 
  query, where, orderBy, onSnapshot, addDoc, limit, getDocs 
} from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { regulateImage } from '../lib/imageRegulator';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { UserProfile, Friendship, Class, Post, Submission, Activity } from '../types';
import { createNotification } from '../lib/notifications';
import { logActivity } from '../lib/activities';

type TabType = 'dashboard' | 'id' | 'social' | 'more';

interface ProfileProps {
  targetUid?: string | null;
  onViewUser?: (uid: string) => void;
  onBackToMe?: () => void;
}

export default function Profile({ targetUid, onViewUser, onBackToMe }: ProfileProps) {
  const { profile: myProfile, logout, auth, user: currentUser, navigateToChat } = useAuth();
  const isMe = !targetUid || targetUid === currentUser?.uid;
  
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(isMe ? myProfile : null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [loading, setLoading] = useState(!isMe);

  // Stats/Dashboard Data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [joinedClasses, setJoinedClasses] = useState<Class[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<Submission[]>([]);
  const [friends, setFriends] = useState<{ id: string, profile: UserProfile, isOnline: boolean }[]>([]);

  useEffect(() => {
    if (isMe) {
        setTargetProfile(myProfile);
        if (myProfile) setBioInput(myProfile.bio || '');
    } else if (targetUid) {
      setLoading(true);
      getDoc(doc(db, 'users', targetUid)).then(snap => {
        if (snap.exists()) {
          const data = { uid: snap.id, ...snap.data() } as UserProfile;
          setTargetProfile(data);
          setBioInput(data.bio || '');
        }
        setLoading(false);
      });
    }
  }, [isMe, targetUid, myProfile]);

  useEffect(() => {
    if (!currentUser || !targetProfile || isMe) return;

    const q1 = query(collection(db, 'friendships'), where('requesterId', '==', currentUser.uid), where('receiverId', '==', targetProfile.uid));
    const q2 = query(collection(db, 'friendships'), where('receiverId', '==', currentUser.uid), where('requesterId', '==', targetProfile.uid));

    const unsub1 = onSnapshot(q1, snap => {
        if (!snap.empty) setFriendship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship);
    });
    const unsub2 = onSnapshot(q2, snap => {
        if (!snap.empty) setFriendship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship);
    });

    return () => { unsub1(); unsub2(); };
  }, [currentUser, targetProfile, isMe]);

  // Fetch Dashboard Data
  useEffect(() => {
    if (!targetProfile) return;

    // Activities
    const qAct = query(collection(db, 'activities'), where('userId', '==', targetProfile.uid), orderBy('timestamp', 'desc'), limit(20));
    const unsubAct = onSnapshot(qAct, snap => {
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    // Classes
    const qClasses = targetProfile.role === 'teacher'
        ? query(collection(db, 'classes'), where('teacherId', '==', targetProfile.uid))
        : query(collection(db, 'classes'), where('studentIds', 'array-contains', targetProfile.uid));
    const unsubClasses = onSnapshot(qClasses, snap => {
        setJoinedClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    // Submissions (if student)
    if (targetProfile.role === 'student') {
        const qSub = query(collection(db, 'submissions'), where('studentId', '==', targetProfile.uid), orderBy('timestamp', 'desc'));
        const unsubSub = onSnapshot(qSub, snap => {
            setCompletedQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
        });
        return () => { unsubAct(); unsubClasses(); unsubSub(); };
    }

    return () => { unsubAct(); unsubClasses(); };
  }, [targetProfile]);

  // Fetch Friends
  useEffect(() => {
    if (!targetProfile) return;

    const qF1 = query(collection(db, 'friendships'), where('requesterId', '==', targetProfile.uid), where('status', '==', 'accepted'));
    const qF2 = query(collection(db, 'friendships'), where('receiverId', '==', targetProfile.uid), where('status', '==', 'accepted'));

    const fetchFriends = async () => {
        const snap1 = await getDocs(qF1);
        const snap2 = await getDocs(qF2);
        const ids = [...snap1.docs.map(d => (d.data() as Friendship).receiverId), ...snap2.docs.map(d => (d.data() as Friendship).requesterId)];
        
        const friendsList: any[] = [];
        for (const id of ids) {
            const pDoc = await getDoc(doc(db, 'users', id));
            const presDoc = await getDoc(doc(db, 'presence', id));
            if (pDoc.exists()) {
                friendsList.push({
                    id,
                    profile: { uid: pDoc.id, ...pDoc.data() } as UserProfile,
                    isOnline: presDoc.exists() ? presDoc.data().status === 'online' : false
                });
            }
        }
        setFriends(friendsList);
    };

    fetchFriends();
  }, [targetProfile]);

  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setShowShareSuccess(true);
    setTimeout(() => setShowShareSuccess(false), 2000);
  };
  const handleUpdateBio = async () => {
    if (!currentUser) return;
    setIsSavingBio(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        bio: bioInput,
        updatedAt: serverTimestamp()
      });
      setIsEditingBio(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBio(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !myProfile || !targetProfile) return;
    setIsSendingRequest(true);
    try {
      await addDoc(collection(db, 'friendships'), {
        requesterId: currentUser.uid,
        receiverId: targetProfile.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await createNotification({
        recipientId: targetProfile.uid,
        senderId: currentUser.uid,
        senderName: myProfile.displayName,
        type: 'request',
        text: `${myProfile.displayName} sent you a friend request.`,
        link: `/profile?uid=${currentUser.uid}`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
        <p className="text-xs font-bold text-brand-secondary/40 uppercase tracking-widest">Loading Profile...</p>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <AlertCircle size={48} className="text-brand-secondary/20 mb-4" />
        <h2 className="text-lg font-bold text-brand-ink mb-2">Profile Not Found</h2>
        <p className="text-sm text-brand-secondary">The user profile you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-6">
      {/* Header Section */}
      <div className="bg-brand-surface rounded-[24px] border border-brand-border/30 overflow-hidden shadow-sm">
        <div className="h-24 bg-brand-primary/10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-surface/40" />
        </div>
        <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
          <div className="relative mb-3">
             <div className="w-24 h-24 rounded-[32px] bg-white border-4 border-brand-surface overflow-hidden shadow-lg transition-transform hover:scale-[1.02]">
                {targetProfile.photoURL ? (
                    <img src={targetProfile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-brand-bg flex items-center justify-center text-brand-secondary/40">
                        <User size={40} />
                    </div>
                )}
             </div>
             {isMe && (
                 <button className="absolute bottom-0 right-0 p-2 bg-brand-primary text-white rounded-xl shadow-lg border-2 border-brand-surface hover:scale-110 transition-all">
                    <Camera size={14} />
                 </button>
             )}
          </div>

          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-brand-ink tracking-tight flex items-center justify-center gap-1.5">
                {targetProfile.displayName}
                {targetProfile.role === 'teacher' && <ShieldCheck size={16} className="text-brand-primary" />}
            </h1>
            <p className="text-[10px] font-black uppercase text-brand-secondary/50 tracking-[0.1em] mt-1">
                {targetProfile.role === 'teacher' ? 'Faculty Instructor' : `Student • ${targetProfile.section || 'Unassigned'}`}
            </p>
          </div>

          {/* Bio Section */}
          <div className="w-full bg-brand-bg/50 rounded-2xl p-4 border border-brand-border/10">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase text-brand-secondary/40 tracking-widest">About Me</span>
                {isMe && (
                    <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-brand-primary transition-colors hover:bg-brand-primary/10 p-1 rounded-md">
                        {isEditingBio ? <X size={12} /> : <Pencil size={12} />}
                    </button>
                )}
            </div>
            {isEditingBio ? (
                <div className="space-y-2">
                    <textarea 
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value.substring(0, 150))}
                        className="w-full bg-white border border-brand-border/30 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-primary/40 min-h-[60px] resize-none"
                        placeholder="Tell us about yourself..."
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-brand-secondary/40">{bioInput.length}/150</span>
                        <button 
                            onClick={handleUpdateBio}
                            disabled={isSavingBio}
                            className="bg-brand-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            <Save size={12} /> Save Bio
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-[12px] font-medium text-brand-ink leading-relaxed italic">
                    {targetProfile.bio || "No bio added yet."}
                </p>
            )}
          </div>

          {!isMe && (
             <div className="w-full mt-4 flex gap-2">
                {friendship?.status === 'accepted' ? (
                   <>
                    <button 
                        onClick={() => navigateToChat(targetProfile.uid, targetProfile.displayName)}
                        className="flex-1 bg-brand-primary text-white text-xs font-bold h-11 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    >
                        <MessageSquare size={16} /> Message
                    </button>
                    <div className="px-4 bg-green-50 text-green-600 border border-green-100 rounded-xl flex items-center gap-2">
                        <UserCheck size={16} />
                        <span className="text-[11px] font-bold uppercase tracking-tight">Friends</span>
                    </div>
                   </>
                ) : friendship?.status === 'pending' ? (
                    <button className="flex-1 bg-yellow-50 text-yellow-600 border border-yellow-100 text-xs font-bold h-11 rounded-xl flex items-center justify-center gap-2" disabled>
                        <AlertCircle size={16} /> Friend Request Sent
                    </button>
                ) : (
                    <button 
                        onClick={sendFriendRequest}
                        disabled={isSendingRequest}
                        className="flex-1 bg-brand-primary text-white text-xs font-bold h-11 rounded-xl flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                        <UserPlus size={16} /> {isSendingRequest ? 'Sending...' : 'Add as Friend'}
                    </button>
                )}
             </div>
          )}
        </div>
      </div>

      {/* Tabs System */}
      <div className="space-y-4">
        <div className="flex bg-brand-surface rounded-2xl border border-brand-border/30 p-1 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
            {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Feed' },
                { id: 'id', icon: CreditCard, label: 'ID Card' },
                { id: 'social', icon: Users, label: 'Social' },
                { id: 'more', icon: MoreHorizontal, label: 'More' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                        "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all relative overflow-hidden",
                        activeTab === tab.id ? "text-brand-primary bg-brand-primary/5" : "text-brand-secondary/40 hover:bg-brand-bg"
                    )}
                >
                    <tab.icon size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    {activeTab === tab.id && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
                </button>
            ))}
        </div>

        <div className="min-h-[300px]">
           <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <section className="space-y-2">
                           <div className="flex items-center justify-between px-2">
                              <h3 className="text-[11px] font-black uppercase text-brand-secondary tracking-widest">Recent Activity</h3>
                              <Star size={14} className="text-brand-primary" />
                           </div>
                           <div className="grid grid-cols-1 gap-3">
                                {activities.map(act => (
                                    <div key={act.id} className="bg-brand-surface p-4 rounded-2xl border border-brand-border/30 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            {act.type === 'post' && <FileText size={14} className="text-brand-primary" />}
                                            {act.type === 'comment' && <MessageSquare size={14} className="text-brand-primary" />}
                                            {act.type === 'reaction' && <Heart size={14} className="text-brand-primary" />}
                                            <span className="text-[10px] font-bold text-brand-secondary uppercase">
                                              {act.type === 'post' ? 'Published a Post' : act.type === 'comment' ? 'Commented on a Post' : 'Reacted to a Post'}
                                            </span>
                                            <span className="ml-auto text-[10px] font-medium text-brand-secondary/40">
                                              {act.timestamp && format(act.timestamp.toDate(), 'MMM d')}
                                            </span>
                                        </div>
                                        <p className="text-[12px] font-medium text-brand-ink line-clamp-3 leading-relaxed italic border-l-2 border-brand-primary/20 pl-3">
                                          "{act.content}"
                                        </p>
                                    </div>
                                ))}
                                {activities.length === 0 && (
                                    <div className="py-12 text-center bg-brand-bg rounded-2xl border border-dashed border-brand-border/40">
                                        <p className="text-[10px] font-bold text-brand-secondary/40 uppercase tracking-widest">No recent campus activity</p>
                                    </div>
                                )}
                           </div>
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-[11px] font-black uppercase text-brand-secondary tracking-widest px-2">
                                {targetProfile.role === 'teacher' ? 'Teaching Summary' : 'Learning Progress'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {targetProfile.role === 'teacher' ? (
                                    <>
                                        <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex flex-col items-center text-center">
                                            <span className="text-xl font-black text-brand-primary">{joinedClasses.length}</span>
                                            <span className="text-[9px] font-bold uppercase text-brand-secondary/60">Classes</span>
                                        </div>
                                        <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex flex-col items-center text-center">
                                            <span className="text-xl font-black text-brand-primary">12</span>
                                            <span className="text-[9px] font-bold uppercase text-brand-secondary/60">Quizzes</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex flex-col items-center text-center">
                                            <span className="text-xl font-black text-brand-primary">{joinedClasses.length}</span>
                                            <span className="text-[9px] font-bold uppercase text-brand-secondary/60">Rooms Joined</span>
                                        </div>
                                        <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex flex-col items-center text-center">
                                            <span className="text-xl font-black text-brand-primary">{completedQuizzes.length}</span>
                                            <span className="text-[9px] font-bold uppercase text-brand-secondary/60">Assignments</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === 'id' && (
                    <motion.div key="id" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <div className="bg-white rounded-[24px] border-4 border-brand-primary/10 overflow-hidden shadow-2xl max-w-sm mx-auto relative group">
                            {/* Watermark/Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-25deg] pointer-events-none">
                                <GraduationCap size={200} />
                            </div>

                            {/* ID Header */}
                            <div className="bg-brand-primary p-4 text-center">
                                <h2 className="text-[11px] font-black italic tracking-[0.2em] text-white/90">BINALIW INTEGRATED SCHOOL</h2>
                                <p className="text-[9px] font-bold text-white/60 tracking-widest mt-1 uppercase">Danao City, Cebu</p>
                            </div>

                            <div className="p-6 space-y-6 relative z-10">
                                <div className="flex gap-4">
                                    <div className="w-24 h-28 rounded-xl bg-brand-bg border border-brand-border/30 overflow-hidden flex-shrink-0 shadow-inner">
                                        {targetProfile.photoURL ? (
                                            <img src={targetProfile.photoURL} alt="" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brand-secondary/20"><User size={40} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3 py-1">
                                        <div>
                                            <p className="text-[8px] font-black text-brand-secondary/40 uppercase tracking-widest mb-0.5">Full Name</p>
                                            <h3 className="text-sm font-black text-brand-ink uppercase leading-tight">{targetProfile.displayName}</h3>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-brand-secondary/40 uppercase tracking-widest mb-0.5">Designation</p>
                                            <span className="inline-block px-2 py-0.5 bg-brand-primary text-white text-[9px] font-black rounded uppercase tracking-wider">
                                                {targetProfile.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-border/10">
                                    {targetProfile.role === 'teacher' ? (
                                        <>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">Major</p>
                                                <p className="text-xs font-bold text-brand-ink">{targetProfile.major || 'Gen Education'}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">Degree</p>
                                                <p className="text-xs font-bold text-brand-ink">{targetProfile.degree || 'BSEd/BEEd'}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">Service</p>
                                                <p className="text-xs font-bold text-brand-ink">{targetProfile.yearsInService || '0'} Years</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">LRN No.</p>
                                                <p className="text-xs font-bold text-brand-ink font-mono">{targetProfile.lrn || '500447XXXXXX'}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">Level</p>
                                                <p className="text-xs font-bold text-brand-ink">Grade {targetProfile.gradeLevel || '10'}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-brand-secondary/40 uppercase">Section</p>
                                                <p className="text-xs font-bold text-brand-ink">{targetProfile.section || 'Sampaguita'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* ID Footer */}
                            <div className="px-6 py-4 bg-brand-bg border-t border-brand-border/10 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-[7px] font-black text-brand-secondary/40 uppercase">Institutional Address</p>
                                    <p className="text-[8px] font-bold text-brand-ink">Binaliw, Danao City, Cebu</p>
                                </div>
                                <div className="p-1 px-3 bg-brand-ink text-white rounded text-[8px] font-black uppercase tracking-[0.2em]">Validated</div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'social' && (
                    <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        {/* Friends Section */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <Users size={16} className="text-brand-primary" />
                                <h3 className="text-[11px] font-black uppercase text-brand-secondary tracking-widest">Friends ({friends.length})</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {friends.map(friend => (
                                    <button 
                                        key={friend.id}
                                        onClick={() => {
                                            if (onViewUser) onViewUser(friend.id);
                                        }}
                                        className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex items-center gap-3 shadow-sm hover:border-brand-primary/20 transition-all text-left"
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border/20 overflow-hidden">
                                                {friend.profile.photoURL ? (
                                                    <img src={friend.profile.photoURL} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-brand-secondary/40 font-bold">{friend.profile.displayName[0]}</div>
                                                )}
                                            </div>
                                            {friend.isOnline && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-brand-surface rounded-full shadow-sm" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-brand-ink text-sm truncate">{friend.profile.displayName}</h4>
                                            <p className="text-[10px] font-medium text-brand-secondary/60 uppercase">{friend.profile.role}</p>
                                        </div>
                                        <UserCheck size={16} className="text-brand-primary/20" />
                                    </button>
                                ))}
                                {friends.length === 0 && (
                                    <div className="py-12 text-center bg-brand-bg rounded-2xl border border-dashed border-brand-border/40">
                                        <p className="text-[10px] font-bold text-brand-secondary/40 uppercase tracking-widest">No friends added yet</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Classes Section */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <BookOpen size={16} className="text-brand-primary" />
                                <h3 className="text-[11px] font-black uppercase text-brand-secondary tracking-widest">
                                    {targetProfile.role === 'teacher' ? 'Teaching in' : 'Classes Joined'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {joinedClasses.map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => {
                                            // Handle class navigation if needed, or window direct
                                            window.location.href = `/classes?id=${c.id}`;
                                        }}
                                        className="bg-brand-surface p-3 rounded-2xl border border-brand-border/30 flex items-center gap-3 shadow-sm hover:border-brand-primary/20 transition-all text-left"
                                    >
                                        <div className="w-10 h-10 bg-brand-primary/5 rounded-xl border border-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                                            {c.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-brand-ink text-sm truncate">{c.name}</h4>
                                            <p className="text-[10px] font-medium text-brand-secondary/60 uppercase">{c.subject}</p>
                                        </div>
                                        <Star size={16} className="text-brand-primary/20" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === 'more' && (
                    <motion.div key="more" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-3">
                        <button 
                            onClick={handleShare}
                            className="w-full bg-brand-surface p-4 rounded-2xl border border-brand-border/30 flex items-center justify-between shadow-sm hover:bg-brand-bg transition-all active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-brand-primary/5 text-brand-primary rounded-xl">
                                  {showShareSuccess ? <Check size={20} /> : <Share2 size={20} />}
                                </div>
                                <div className="text-left">
                                    <span className="block text-[12px] font-black text-brand-ink uppercase">{showShareSuccess ? 'Link Copied!' : 'Share Campus Link'}</span>
                                    <span className="text-[10px] font-bold text-brand-secondary/40 whitespace-nowrap">Invite others to join the portal</span>
                                </div>
                            </div>
                            <MoreHorizontal size={16} className="text-brand-secondary/20" />
                        </button>

                        {isMe && (
                            <button 
                                onClick={logout}
                                className="w-full bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm hover:bg-red-50 transition-all active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><LogOut size={20} /></div>
                                    <div className="text-left">
                                        <span className="block text-[12px] font-black text-red-600 uppercase">Sign Out Account</span>
                                        <span className="text-[10px] font-bold text-red-400/60 whitespace-nowrap">Securely end your current session</span>
                                    </div>
                                </div>
                                <ShieldCheck size={16} className="text-red-500/20" />
                            </button>
                        )}
                    </motion.div>
                )}
           </AnimatePresence>
        </div>
      </div>

      <div className="pt-8 text-center">
        <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] opacity-20">CampusConnect Social Hub v1.2</p>
      </div>
    </div>
  );
}
