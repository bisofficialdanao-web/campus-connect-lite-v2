import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, ShieldCheck, Edit3, Camera, Save, X, 
  GraduationCap, BookOpen, AlertCircle, Loader2, 
  LayoutDashboard, CreditCard, Users, MoreHorizontal, 
  Share2, Check, Pencil, UserPlus, UserCheck, MessageSquare, 
  FileText, Star, Heart, LogOut
} from 'lucide-react';
import { 
  doc, updateDoc, serverTimestamp, getDoc, collection, 
  query, where, orderBy, onSnapshot, addDoc, limit, getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { UserProfile, Friendship, Class, Activity, Submission } from '../types';
import { createNotification } from '../lib/notifications';
import { logActivity } from '../lib/activities';
import { PageView } from '../components/BottomNav';

type TabType = 'dashboard' | 'id' | 'social' | 'more';

interface ProfileProps {
  targetUid?: string | null;
  onViewUser?: (uid: string) => void;
  onBackToMe?: () => void;
  onViewChange?: (view: PageView) => void;
}

export default function Profile({ targetUid, onViewUser, onBackToMe, onViewChange }: ProfileProps) {
  const { profile: myProfile, logout, user: currentUser, navigateToChat } = useAuth();
  const isMe = !targetUid || targetUid === currentUser?.uid;
  
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(isMe ? myProfile : null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [loading, setLoading] = useState(!isMe);

  // ID Card Editing States
  const [isEditingID, setIsEditingID] = useState(false);
  const [idDraft, setIdDraft] = useState<Partial<UserProfile>>({});
  const [isSavingID, setIsSavingID] = useState(false);

  // Data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [joinedClasses, setJoinedClasses] = useState<Class[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<Submission[]>([]);
  const [friends, setFriends] = useState<{ id: string, profile: UserProfile, isOnline: boolean }[]>([]);

  useEffect(() => {
    if (isMe) {
        setTargetProfile(myProfile);
        if (myProfile) {
          setBioInput(myProfile.bio || '');
          setIdDraft(myProfile);
        }
    } else if (targetUid) {
      setLoading(true);
      getDoc(doc(db, 'users', targetUid)).then(snap => {
        if (snap.exists()) {
          const data = { uid: snap.id, ...snap.data() } as UserProfile;
          setTargetProfile(data);
          setBioInput(data.bio || '');
          setIdDraft(data);
        }
        setLoading(false);
      });
    }
  }, [isMe, targetUid, myProfile]);

  useEffect(() => {
    if (!currentUser || !targetProfile || isMe) return;
    const q1 = query(collection(db, 'friendships'), where('requesterId', '==', currentUser.uid), where('receiverId', '==', targetProfile.uid));
    const q2 = query(collection(db, 'friendships'), where('receiverId', '==', currentUser.uid), where('requesterId', '==', targetProfile.uid));
    const unsub1 = onSnapshot(q1, snap => { if (!snap.empty) setFriendship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship); else setFriendship(null); });
    const unsub2 = onSnapshot(q2, snap => { if (!snap.empty) setFriendship({ id: snap.docs[0].id, ...snap.docs[0].data() } as Friendship); else setFriendship(null); });
    return () => { unsub1(); unsub2(); };
  }, [currentUser, targetProfile, isMe]);

  useEffect(() => {
    if (!targetProfile) return;
    const qAct = query(collection(db, 'activities'), where('userId', '==', targetProfile.uid), orderBy('timestamp', 'desc'), limit(15));
    const unsubAct = onSnapshot(qAct, snap => setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity))));
    const qClasses = targetProfile.role === 'teacher' ? query(collection(db, 'classes'), where('teacherId', '==', targetProfile.uid)) : query(collection(db, 'classes'), where('studentIds', 'array-contains', targetProfile.uid));
    const unsubClasses = onSnapshot(qClasses, snap => setJoinedClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))));
    return () => { unsubAct(); unsubClasses(); };
  }, [targetProfile]);

  useEffect(() => {
    if (!targetProfile) return;
    const qF1 = query(collection(db, 'friendships'), where('requesterId', '==', targetProfile.uid), where('status', '==', 'accepted'));
    const qF2 = query(collection(db, 'friendships'), where('receiverId', '==', targetProfile.uid), where('status', '==', 'accepted'));
    const fetchFriends = async () => {
        const [snap1, snap2] = await Promise.all([getDocs(qF1), getDocs(qF2)]);
        const ids = [...snap1.docs.map(d => (d.data() as Friendship).receiverId), ...snap2.docs.map(d => (d.data() as Friendship).requesterId)];
        const list = await Promise.all(ids.map(async id => {
            const [p, s] = await Promise.all([getDoc(doc(db, 'users', id)), getDoc(doc(db, 'presence', id))]);
            return p.exists() ? { id, profile: { uid: p.id, ...p.data() } as UserProfile, isOnline: s.exists() && s.data().status === 'online' } : null;
        }));
        setFriends(list.filter(x => x !== null) as any);
    };
    fetchFriends();
  }, [targetProfile]);

  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const handleShare = () => { navigator.clipboard.writeText(window.location.origin); setShowShareSuccess(true); setTimeout(() => setShowShareSuccess(false), 2000); };

  const handleUpdateBio = async () => {
    if (!currentUser) return;
    setIsSavingBio(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { bio: bioInput, updatedAt: serverTimestamp() });
      setIsEditingBio(false);
    } catch (e) { console.error(e); } finally { setIsSavingBio(false); }
  };

  const handleUpdateID = async () => {
    if (!currentUser) return;
    setIsSavingID(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { ...idDraft, updatedAt: serverTimestamp() });
      setIsEditingID(false);
    } catch (e) { console.error(e); } finally { setIsSavingID(false); }
  };

  const sendFriendRequest = async () => {
    if (!currentUser || !myProfile || !targetProfile) return;
    setIsSendingRequest(true);
    try {
      await addDoc(collection(db, 'friendships'), { requesterId: currentUser.uid, receiverId: targetProfile.uid, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await createNotification({ recipientId: targetProfile.uid, senderId: currentUser.uid, senderName: myProfile.displayName, type: 'request', text: `${myProfile.displayName} sent a friend request.`, link: `/profile?uid=${currentUser.uid}` });
    } catch (e) { console.error(e); } finally { setIsSendingRequest(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-[3px]">
      <Loader2 className="animate-spin text-brand-primary" size={11} />
      <span className="text-[9px] font-black uppercase text-brand-secondary/40 tracking-wider">Loading...</span>
    </div>
  );

  return (
    <div className="pb-20 space-y-[3px] max-w-[600px] mx-auto px-[3px]">
      {/* Mini Profile Header */}
      <div className="bg-brand-surface rounded-xl border border-brand-border/30 overflow-hidden shadow-sm p-[12px]">
        <div className="flex items-center gap-[12px]">
          <div className="relative group">
            <div className="size-[48px] rounded-[16px] bg-brand-bg border border-brand-border/30 overflow-hidden shadow-inner">
               {targetProfile?.photoURL ? <img src={targetProfile.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-3 text-brand-secondary/20" />}
            </div>
            {isMe && <button className="absolute -bottom-1 -right-1 p-1 bg-brand-primary text-white rounded-md shadow-lg border border-white"><Camera size={11} /></button>}
          </div>
          <div className="flex-1 min-w-0">
             <h1 className="text-[10px] font-black text-brand-ink uppercase leading-tight truncate flex items-center gap-1">
               {targetProfile?.displayName}
               {targetProfile?.role === 'teacher' && <ShieldCheck size={11} className="text-brand-primary" />}
             </h1>
             <p className="text-[9px] font-bold text-brand-secondary/50 uppercase tracking-wider truncate">
               {targetProfile?.role === 'teacher' ? 'Faculty Member' : `${targetProfile?.gradeLevel ? `Grade ${targetProfile.gradeLevel}` : 'Student'} • ${targetProfile?.section || 'No Section'}`}
             </p>
          </div>
          {!isMe && (
            <button 
              onClick={() => navigateToChat(targetProfile!.uid, targetProfile!.displayName)}
              className="p-2 bg-brand-bg text-brand-primary rounded-lg border border-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
            >
              <MessageSquare size={11} />
            </button>
          )}
        </div>

        {/* Bio Inline */}
        <div className="mt-[12px] bg-brand-bg/30 rounded-lg p-[8px] border border-brand-border/10 relative">
          <span className="text-[7px] font-black uppercase text-brand-secondary/30 absolute top-1.5 left-2">BIO</span>
          <div className="pt-3">
            {isEditingBio ? (
              <div className="space-y-1">
                <textarea 
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value.substring(0, 150))}
                  className="w-full bg-white border border-brand-border/40 rounded-lg px-2 py-1 text-[10px] font-medium focus:outline-none min-h-[40px] resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-brand-secondary/40 font-bold">{bioInput.length}/150</span>
                  <div className="flex gap-1">
                    <button onClick={() => setIsEditingBio(false)} className="px-2 py-1 text-[8px] font-black uppercase text-brand-secondary">Cancel</button>
                    <button onClick={handleUpdateBio} className="px-2 py-1 text-[8px] font-black uppercase bg-brand-primary text-white rounded-md">Save</button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-medium text-brand-ink leading-relaxed line-clamp-2">
                {targetProfile?.bio || "No bio yet."}
                {isMe && <button onClick={() => setIsEditingBio(true)} className="ml-2 text-brand-primary"><Pencil size={9} /></button>}
              </p>
            )}
          </div>
        </div>

        {!isMe && (
          <div className="mt-3 flex gap-[3px]">
             {friendship?.status === 'accepted' ? (
                <div className="flex-1 h-8 bg-green-50 text-green-600 border border-green-100 rounded-lg flex items-center justify-center gap-2">
                  <UserCheck size={11} /> <span className="text-[9px] font-black uppercase">Friends</span>
                </div>
             ) : friendship?.status === 'pending' ? (
                <div className="flex-1 h-8 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-lg flex items-center justify-center gap-2 italic">
                  <AlertCircle size={11} /> <span className="text-[9px] font-black uppercase">Request Sent</span>
                </div>
             ) : (
                <button onClick={sendFriendRequest} disabled={isSendingRequest} className="flex-1 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center gap-2 shadow-sm font-black text-[9px] uppercase tracking-wider">
                  <UserPlus size={11} /> {isSendingRequest ? 'Sending...' : 'Add Friend'}
                </button>
             )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-brand-surface rounded-xl border border-brand-border/30 p-[2px] shadow-sm">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Feed' },
          { id: 'id', icon: CreditCard, label: 'ID' },
          { id: 'social', icon: Users, label: 'Social' },
          { id: 'more', icon: MoreHorizontal, label: 'More' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex-1 py-2 flex flex-col items-center justify-center gap-[2px] transition-all rounded-lg relative",
              activeTab === tab.id ? "text-brand-primary bg-brand-primary/[0.03]" : "text-brand-secondary/40 hover:bg-brand-bg/50"
            )}
          >
            <tab.icon size={11} className={activeTab === tab.id ? "scale-110" : ""} />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
            {activeTab === tab.id && <motion.div layoutId="profile-tab" className="absolute bottom-0 h-[2px] bg-brand-primary w-4 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[200px]">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-[3px]">
              {activities.length > 0 ? activities.map(act => (
                <div key={act.id} className="bg-brand-surface p-[12px] rounded-xl border border-brand-border/20 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                    {act.type === 'post' && <FileText size={40} />}
                    {act.type === 'comment' && <MessageSquare size={40} />}
                    {act.type === 'reaction' && <Heart size={40} />}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-[18px] rounded-md bg-brand-primary/5 flex items-center justify-center text-brand-primary">
                      {act.type === 'comment' ? <MessageSquare size={11} /> : act.type === 'reaction' ? <Heart size={11} /> : <FileText size={11} />}
                    </div>
                    <span className="text-[9px] font-black text-brand-ink uppercase tracking-tight">
                      {act.type === 'post' ? 'Published a Campus Post' : act.type === 'comment' ? 'Commented on a Story' : 'Reacted to Campus Content'}
                    </span>
                    <span className="ml-auto text-[8px] font-bold text-brand-secondary/30">{act.timestamp ? format(act.timestamp.toDate(), 'HH:mm • MMM d') : 'just now'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {act.type === 'comment' && act.targetContent && (
                      <div className="text-[8px] text-brand-secondary/40 font-bold uppercase tracking-tight line-clamp-1 border-b border-brand-border/10 pb-1 mb-1">
                        In response to: "{act.targetContent}..."
                      </div>
                    )}
                    <div className={cn("p-[8px] bg-brand-bg/40 rounded-lg text-[10px] font-medium text-brand-ink/80 leading-relaxed relative", act.type === 'comment' && "border-l-2 border-brand-primary pl-4")}>
                      {act.type === 'comment' && <span className="absolute left-1 top-2 text-brand-primary opacity-30"><MessageSquare size={8} /></span>}
                      "{act.content}"
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center bg-brand-bg/20 rounded-xl border border-dashed border-brand-border/30">
                  <p className="text-[9px] font-black text-brand-secondary/30 uppercase tracking-[0.2em]">No Recent Activity</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'id' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              <div className="bg-[#FFB7C5]/10 rounded-[20px] border border-[#FFB7C5]/30 overflow-hidden shadow-lg relative group">
                <div className="p-[12px] bg-brand-primary text-center">
                   <h2 className="text-[10px] font-black italic tracking-widest text-white/90">BINALIW INTEGRATED SCHOOL</h2>
                   <p className="text-[8px] font-bold text-white/60 tracking-tight uppercase">ID: 500447 • Danao City, Cebu</p>
                </div>
                
                <div className="p-[15px] space-y-[15px]">
                  <div className="flex gap-[12px]">
                    <div className="size-[64px] rounded-[16px] bg-white border border-[#FFB7C5]/40 shadow-inner flex-shrink-0 overflow-hidden">
                      {targetProfile?.photoURL ? <img src={targetProfile.photoURL} alt="" className="w-full h-full object-cover grayscale brightness-110 contrast-125" /> : <User size={30} className="m-auto mt-4 text-[#FFB7C5]/40" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                       <span className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Validated Identity</span>
                       <h3 className="text-[12px] font-black text-brand-ink uppercase leading-tight mb-1">{targetProfile?.displayName}</h3>
                       <span className="inline-block px-1.5 py-0.5 bg-[#FFB7C5]/30 text-[#FFB7C5] text-[8px] font-black rounded uppercase w-fit">{targetProfile?.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-[12px] pt-[12px] border-t border-[#FFB7C5]/20">
                     {targetProfile?.role === 'teacher' ? (
                       <>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Degree</p>
                           {isEditingID ? <input value={idDraft.degree || ''} onChange={e => setIdDraft({...idDraft, degree: e.target.value})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink">{targetProfile.degree || 'BSEd/BEEd'}</p>}
                         </div>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Major</p>
                           {isEditingID ? <input value={idDraft.major || ''} onChange={e => setIdDraft({...idDraft, major: e.target.value})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink">{targetProfile.major || 'Gen Education'}</p>}
                         </div>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Service</p>
                           {isEditingID ? <input type="number" value={idDraft.yearsInService || 0} onChange={e => setIdDraft({...idDraft, yearsInService: parseInt(e.target.value)})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink">{targetProfile.yearsInService || 0} Years</p>}
                         </div>
                       </>
                     ) : (
                       <>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">LRN No.</p>
                           {isMe && isEditingID ? <input value={idDraft.lrn || ''} onChange={e => setIdDraft({...idDraft, lrn: e.target.value})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink font-mono">{targetProfile?.lrn || '500447XXXXXX'}</p>}
                         </div>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Grade</p>
                           {isEditingID ? <input type="number" value={idDraft.gradeLevel || 10} onChange={e => setIdDraft({...idDraft, gradeLevel: parseInt(e.target.value)})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink">{targetProfile?.gradeLevel || 10}</p>}
                         </div>
                         <div className="space-y-[3px]">
                           <p className="text-[7px] font-black text-[#FFB7C5]/60 uppercase">Section</p>
                           {isEditingID ? <input value={idDraft.section || ''} onChange={e => setIdDraft({...idDraft, section: e.target.value})} className="w-full bg-white/50 border border-[#FFB7C5]/20 rounded px-1 py-0.5 text-[9px]" /> : <p className="text-[9px] font-bold text-brand-ink">{targetProfile?.section || 'Sampaguita'}</p>}
                         </div>
                       </>
                     )}
                  </div>
                  
                  {isMe && (
                    <div className="flex justify-end pt-2">
                       {isEditingID ? (
                         <div className="flex gap-2">
                           <button onClick={() => setIsEditingID(false)} className="text-[8px] font-black uppercase text-brand-secondary">Discard</button>
                           <button onClick={handleUpdateID} disabled={isSavingID} className="bg-brand-primary text-white px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-md">
                             {isSavingID ? <Loader2 size={8} className="animate-spin" /> : <Save size={8} />} Confirm Changes
                           </button>
                         </div>
                       ) : (
                         <button onClick={() => setIsEditingID(true)} className="p-1.5 bg-[#FFB7C5]/20 text-[#FFB7C5] rounded-full hover:bg-[#FFB7C5] hover:text-white transition-colors">
                           <Edit3 size={11} />
                         </button>
                       )}
                    </div>
                  )}
                </div>
                <div className="px-[12px] py-[8px] bg-[#FFB7C5]/5 border-t border-[#FFB7C5]/10 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[6px] font-black text-[#FFB7C5] uppercase">Institutional Location</span>
                      <span className="text-[8px] font-bold text-brand-ink/60 italic">Binaliw, Danao City, Cebu 6004</span>
                   </div>
                   <div className="px-2 py-0.5 bg-brand-ink text-white rounded-[4px] text-[7px] font-black uppercase tracking-widest shadow-lg">Authentic</div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'social' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-[12px]">
              <section className="space-y-[3px]">
                <div className="flex items-center gap-1.5 px-2 mb-1">
                  <Users size={11} className="text-brand-primary" />
                  <span className="text-[9px] font-black uppercase text-brand-secondary tracking-widest">Circle Contacts ({friends.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-[3px]">
                  {friends.map(f => (
                    <button key={f.id} onClick={() => onViewUser && onViewUser(f.id)} className="bg-brand-surface p-[10px] rounded-xl border border-brand-border/20 flex items-center gap-[10px] shadow-sm hover:border-brand-primary/20 transition-all">
                      <div className="relative">
                         <div className="size-[28px] rounded-lg bg-brand-bg border border-brand-border/10 overflow-hidden">
                           {f.profile.photoURL ? <img src={f.profile.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{f.profile.displayName[0]}</div>}
                         </div>
                         {f.isOnline && <div className="absolute -top-0.5 -right-0.5 size-2 bg-green-500 border border-brand-surface rounded-full shadow-sm animate-pulse" />}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-[10px] font-black text-brand-ink tracking-tight truncate">{f.profile.displayName}</h4>
                        <p className="text-[8px] font-bold text-brand-secondary/40 uppercase">{f.profile.role}</p>
                      </div>
                      <UserCheck size={11} className="text-brand-primary/30" />
                    </button>
                  ))}
                  {friends.length === 0 && <div className="py-10 text-center bg-brand-bg/10 rounded-xl italic text-[9px] text-brand-secondary/30 uppercase font-black">Private Circle Empty</div>}
                </div>
              </section>

              <section className="space-y-[3px]">
                <div className="flex items-center gap-1.5 px-2 mb-1">
                  <BookOpen size={11} className="text-brand-primary" />
                  <span className="text-[9px] font-black uppercase text-brand-secondary tracking-widest">{targetProfile?.role === 'teacher' ? 'Active Departments' : 'Registered Classes'}</span>
                </div>
                <div className="grid grid-cols-1 gap-[3px]">
                  {joinedClasses.map(c => (
                    <button key={c.id} onClick={() => onViewChange && onViewChange('classes')} className="bg-brand-surface p-[10px] rounded-xl border border-brand-border/20 flex items-center gap-[10px] shadow-sm hover:border-brand-primary/20 transition-all">
                      <div className="size-[28px] bg-brand-primary/5 rounded-lg border border-brand-primary/10 flex items-center justify-center text-brand-primary text-[10px] font-black uppercase">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-[10px] font-black text-brand-ink tracking-tight truncate">{c.name}</h4>
                        <p className="text-[8px] font-bold text-brand-secondary/40 uppercase">{c.subject}</p>
                      </div>
                      <Star size={11} className="text-brand-primary/20" />
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'more' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="space-y-[3px]">
              <button onClick={handleShare} className="w-full bg-brand-surface p-[15px] rounded-xl border border-brand-border/30 flex items-center justify-between shadow-sm hover:bg-brand-bg transition-all">
                <div className="flex items-center gap-3">
                  <div className="size-[32px] bg-brand-primary/5 text-brand-primary rounded-lg flex items-center justify-center">
                    {showShareSuccess ? <Check size={11} /> : <Share2 size={11} />}
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-black text-brand-ink uppercase">{showShareSuccess ? 'Link Stored' : 'Share Campus Sync'}</span>
                    <span className="text-[8px] font-bold text-brand-secondary/40 uppercase tracking-widest">Connect with peers</span>
                  </div>
                </div>
                <MoreHorizontal size={11} className="text-brand-secondary/20" />
              </button>

              {isMe && (
                <button onClick={logout} className="w-full bg-red-50/50 p-[15px] rounded-xl border border-red-100 flex items-center justify-between shadow-sm hover:bg-red-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-[32px] bg-red-100 text-red-600 rounded-lg flex items-center justify-center"><LogOut size={11} /></div>
                    <div className="text-left">
                      <span className="block text-[10px] font-black text-red-600 uppercase">Revoke Session</span>
                      <span className="text-[8px] font-bold text-red-400/60 uppercase tracking-widest">Securely Sign Out</span>
                    </div>
                  </div>
                  <ShieldCheck size={11} className="text-red-500/20" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-10 text-center opacity-30 pb-10">
        <p className="text-[8px] font-black text-brand-secondary uppercase tracking-[0.3em]">Binaliw Digital Environment v2.0</p>
      </div>
    </div>
  );
}
