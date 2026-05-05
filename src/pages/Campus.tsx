import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Send, 
  Heart, 
  MessageSquare, 
  Users, 
  MoreHorizontal, 
  Image as ImageIcon, 
  Smile, 
  Hash,
  ArrowRight,
  School,
  Calendar,
  ClipboardList,
  MessageCircle,
  Clock,
  MapPin,
  Ghost,
  Trash2,
  Edit3,
  Loader2,
  X,
  Share2,
  BookOpen,
  Download,
  FileText,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { regulateImage } from '../lib/imageRegulator';
import UserProfileModal from '../components/UserProfileModal';
import { Post, Comment as CommentType } from '../types';
import { createNotification } from '../lib/notifications';

import { PageView } from '../components/BottomNav';

import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Campus({ onViewChange }: { onViewChange: (view: PageView) => void }) {
  const { user, profile, auth } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isAITutorOpen, setIsAITutorOpen] = useState(false);

  useEffect(() => {
    const path = 'posts';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path, auth);
    });
    return () => unsubscribe();
  }, [auth]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || isPosting) return;

    setIsPosting(true);
    const path = 'posts';
    
    const postData = {
      authorId: user.uid,
      authorName: isAnonymous ? 'Anonymous Member' : (profile?.displayName || user.displayName || 'Campus Member'),
      content: newPost,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reactions: {}, 
      commentCount: 0,
      authorPhoto: isAnonymous ? null : (profile?.photoURL || user.photoURL || null),
      isAnonymous: !!isAnonymous
    };

    try {
      await addDoc(collection(db, path), postData);
      setNewPost('');
      setIsAnonymous(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    } finally {
      setIsPosting(false);
    }
  };

  const userRole = profile?.role || 'student';
  const quickActions = [
    { 
      icon: <School size={16} />, 
      label: 'Create Class', 
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      onClick: () => onViewChange('classes') 
    },
    { 
      icon: <Calendar size={16} />, 
      label: 'Add Event', 
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      onClick: () => setIsEventModalOpen(true),
      visible: userRole === 'teacher'
    },
    { 
      icon: <BookOpen size={16} />, 
      label: 'New Module', 
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      onClick: () => setIsModuleModalOpen(true),
      visible: userRole === 'teacher'
    },
    { 
      icon: <ClipboardList size={16} />, 
      label: 'Assignments', 
      color: 'bg-green-50 text-green-600 border-green-100',
      onClick: () => onViewChange('classes') 
    },
  ].filter(a => a.visible !== false);

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-20">
      {/* Main Feed */}
      <div className="flex-1 space-y-4">
        {/* Quick Actions (Mobile Top Scroll) */}
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-2 min-w-max">
            {quickActions.map((action, i) => (
              <button 
                key={i} 
                onClick={action.onClick}
                className={cn("px-4 py-2 rounded-xl flex items-center gap-2 border font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all", action.color)}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Create Post */}
        <div className="bg-brand-surface border border-brand-card-border rounded-xl p-4 sm:p-5 shadow-soft">
          <form onSubmit={handlePost} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-brand-bg border border-brand-border/30 items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {isAnonymous ? <Ghost size={20} className="text-brand-ink" /> : (
                  profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : <div className="text-sm font-black text-brand-primary uppercase">{profile?.displayName?.[0]}</div>
                )}
              </div>
              <div className="flex-1">
                <textarea 
                  placeholder="Share a thought or confession..."
                  className="w-full bg-[#f5f5f5] border-none rounded-2xl p-4 text-brand-ink font-medium text-sm min-h-[100px] focus:ring-1 focus:ring-brand-primary placeholder:text-brand-secondary/50 resize-none"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#f0f0f0] ml-0 sm:ml-14">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all font-black text-[10px] uppercase tracking-widest border",
                    isAnonymous ? "bg-brand-ink text-white border-brand-ink" : "bg-brand-bg text-brand-secondary border-brand-border/50 hover:bg-white"
                  )}
                >
                  <Users size={12} />
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </button>
                <div className="flex items-center">
                  <button type="button" className="p-2 text-brand-secondary hover:text-brand-primary transition-colors"><Smile size={18} /></button>
                </div>
              </div>
              
              <motion.button 
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!newPost.trim() || isPosting}
                className="bg-brand-primary text-white px-8 py-3 sm:py-2 rounded-full font-black text-[11px] uppercase tracking-widest hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-neon flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isPosting ? <Loader2 size={16} className="animate-spin" /> : <>Post <Send size={14} /></>}
              </motion.button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-brand-surface rounded-2xl border border-brand-border/50">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-brand-surface rounded-2xl border border-brand-border/50 text-center px-6">
              <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mb-4 text-brand-secondary/30">
                <MessageCircle size={32} />
              </div>
              <h3 className="font-black text-brand-ink mb-1">No posts yet</h3>
              <p className="text-xs text-brand-secondary font-medium leading-relaxed">Be the first to share a confession or an update!</p>
            </div>
          ) : (
            <AnimatePresence>
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onUserClick={(uid) => setSelectedUserUid(uid)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Sidebar (Desktop Widgets) */}
      <div className="hidden lg:block w-72 space-y-4">
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-4">Quick Actions</h4>
          <div className="space-y-2">
            {quickActions.map((action, i) => (
              <button 
                key={i} 
                onClick={action.onClick}
                className={cn("w-full px-4 py-3 rounded-xl flex items-center gap-3 border font-black text-[10px] uppercase tracking-widest hover:scale-[0.98] transition-all", action.color)}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-3">Community Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {['#CSBasics', '#ExamWeek', '#CoffeeRun', '#LibraryVibes', '#Confessions'].map((tag) => (
              <span key={tag} className="px-2 py-1 bg-brand-bg border border-brand-border/30 rounded-lg text-[9px] font-bold text-brand-secondary cursor-pointer hover:bg-white transition-colors">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedUserUid && (
          <UserProfileModal targetUid={selectedUserUid} onClose={() => setSelectedUserUid(null)} />
        )}
        {isEventModalOpen && (
          <EventModal onClose={() => setIsEventModalOpen(false)} />
        )}
        {isModuleModalOpen && (
          <ModuleModal onClose={() => setIsModuleModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Event Modal and Module Modal follow...

function ModuleModal({ onClose }: { onClose: () => void }) {
  const { user, profile, auth } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user || isSaving) return;

    setIsSaving(true);
    try {
      let fileUrl = '';
      if (file) {
        const storageRef = ref(storage, `modules/${user.uid}/${Date.now()}_${file.name}`);
        setProgress(10);
        const snapshot = await uploadBytes(storageRef, file);
        setProgress(100);
        fileUrl = await getDownloadURL(snapshot.ref);
      }

      const postData = {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'Teacher',
        content: `📚 NEW MODULE: ${title}\n\n${description}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reactions: {},
        commentCount: 0,
        // Module specific fields
        fileUrl,
        isModule: true,
        moduleName: title,
        authorPhoto: profile?.photoURL || user.photoURL || null,
        isAnonymous: false
      };

      console.log('Attempting to publish module post with alignment:', postData);
      await addDoc(collection(db, 'posts'), postData);
      console.log('Module post successful');
      onClose();
    } catch (error: any) {
      console.error("Module post failed dramatically:", error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`MODULE UPLOAD ERROR: ${errorMessage}\n\nPlease verify your teacher permissions or connection.`);
      handleFirestoreError(error, OperationType.WRITE, 'posts', auth);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-ink/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface rounded-2xl border border-brand-border shadow-huge overflow-hidden"
      >
        <div className="p-4 border-b border-brand-border/50 flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <BookOpen size={18} />
            </div>
            <h3 className="font-black text-brand-ink text-sm uppercase tracking-tight">Upload Module</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest block mb-1">Module Title</label>
            <input 
              required
              type="text" 
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Module 1: Introduction to..."
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest block mb-1">Description</label>
            <textarea 
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none h-24 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of the module..."
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest block mb-1">File (PDF/Image)</label>
            <input 
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-brand-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-brand-bg file:text-brand-ink hover:file:bg-brand-border"
            />
          </div>

          {isSaving && (
            <div className="w-full h-1 bg-brand-bg rounded-full overflow-hidden">
              <motion.div className="h-full bg-brand-primary" animate={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black uppercase border border-brand-border rounded-xl">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 text-[10px] font-black uppercase bg-brand-primary text-white rounded-xl shadow-md">
              {isSaving ? 'Uploading...' : 'Publish Module'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PostCard({ post, onUserClick }: { post: Post, onUserClick: (uid: string) => void }) {
  const { user, profile, auth } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const REACTION_TYPES = [
    { key: 'like', emoji: '👍', label: 'Like' },
    { key: 'heart', emoji: '❤️', label: 'Heart' },
    { key: 'blush', emoji: '😊', label: 'Blush' },
    { key: 'laugh', emoji: '😂', label: 'Laugh' },
    { key: 'sad', emoji: '😢', label: 'Sad' },
    { key: 'angry', emoji: '😠', label: 'Angry' },
  ];

  useEffect(() => {
    if (!isEditing) {
      setEditContent(post.content);
    }
  }, [post.content, isEditing]);

  const TRUNCATE_LIMIT = 280;
  const shouldTruncate = post.content.length > TRUNCATE_LIMIT;
  const displayContent = (shouldTruncate && !isExpanded) 
    ? post.content.substring(0, TRUNCATE_LIMIT) + '...' 
    : post.content;

  const handleReact = async (reactionKey: string) => {
    if (!user) return;
    const path = `posts/${post.id}`;
    try {
      const postRef = doc(db, 'posts', post.id);
      const hasReacted = post.reactions[reactionKey]?.includes(user.uid);
      
      // If user had a different reaction, we might want to remove it first? 
      // For simplicity, let's just toggle the specific one
      await updateDoc(postRef, {
        [`reactions.${reactionKey}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!hasReacted && user.uid !== post.authorId) {
        await createNotification({
          recipientId: post.authorId,
          senderId: user.uid,
          senderName: profile?.displayName || 'Someone',
          type: 'reaction',
          text: `${profile?.displayName || 'Someone'} reacted to your post: "${post.content.substring(0, 30)}..."`,
          link: `/campus`
        });
      }
      setShowReactionPicker(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    const path = `posts/${post.id}`;
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        content: editContent,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const path = `posts/${post.id}`;
    if (confirm('Delete this post?')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path, auth);
      }
    }
  };

  const displayPhoto = post.isAnonymous ? null : post.authorPhoto;
  const timeLabel = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white border border-brand-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 p-4 sm:p-6",
        post.isModule && "border-blue-200 ring-2 ring-blue-50 ring-offset-0"
      )}
    >
      {post.isModule && (
        <div className="bg-blue-50 px-5 py-2 -mx-5 -mt-5 mb-4 flex items-center gap-2 border-b border-blue-100">
          <BookOpen size={14} className="text-blue-500" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Class Module</span>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <motion.button 
              whileTap={!post.isAnonymous ? { scale: 0.95 } : {}}
              onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border transition-all",
                post.isAnonymous ? "bg-brand-ink border-brand-ink shadow-sm" : "bg-brand-bg border-brand-border/50 shadow-sm hover:border-brand-primary"
              )}
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              ) : post.isAnonymous ? (
                <Ghost size={22} className="text-white opacity-80" />
              ) : (
                <span className="text-base font-black text-brand-primary uppercase">{post.authorName?.[0] || 'U'}</span>
              )}
            </motion.button>
            <div className="text-left">
              <button 
                onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
                className={cn(
                  "text-[14px] font-black tracking-tight flex items-center gap-2",
                  post.isAnonymous ? "text-brand-ink/70 no-underline cursor-default" : "text-brand-ink cursor-pointer hover:text-brand-primary transition-colors"
                )}
              >
                {post.isAnonymous ? 'Anonymous Member' : post.authorName}
                {post.isAnonymous && <span className="text-[8px] font-black text-white bg-brand-ink px-1.5 py-0.5 rounded uppercase tracking-tighter">🔒 Hidden</span>}
              </button>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-brand-secondary/60 uppercase tracking-widest">{timeLabel}</span>
                {post.isModule && <span className="w-1 h-1 rounded-full bg-brand-secondary/30" />}
                {post.isModule && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Instructor</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {user?.uid === post.authorId && (
              <>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn("p-1.5 rounded-lg transition-colors", isEditing ? "text-brand-primary bg-brand-primary/10" : "text-brand-secondary hover:text-brand-primary hover:bg-brand-bg")}
                >
                  <Edit3 size={14} />
                </button>
                <button onClick={handleDelete} className="p-1.5 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button className="text-brand-secondary p-1.5 hover:bg-brand-bg rounded-lg transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3 mb-4">
            <textarea 
              value={editContent}
              disabled={isSaving}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-brand-primary min-h-[100px] transition-colors disabled:opacity-50"
              placeholder="Edit your post..."
            />
            <div className="flex justify-end gap-2 px-1">
              <button 
                onClick={() => setIsEditing(false)} 
                disabled={isSaving}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleEdit} 
                disabled={isSaving || !editContent.trim()}
                className="px-4 py-1.5 bg-brand-ink text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:scale-95 transition-all disabled:opacity-50 disabled:scale-100 min-w-[70px] flex items-center justify-center"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6 px-1">
            <motion.div 
              whileTap={shouldTruncate ? { scale: 0.995 } : {}}
              onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
              className={cn(
                "transition-all",
                shouldTruncate && "cursor-pointer hover:opacity-90"
              )}
            >
              <p className="text-brand-ink text-[15px] sm:text-[16px] font-medium leading-[1.6] whitespace-pre-wrap">
                {displayContent}
                {shouldTruncate && !isExpanded && (
                  <span className="text-brand-primary font-black text-[10px] ml-2 uppercase tracking-widest border-b-2 border-brand-primary/30 pb-0.5">Read Full Post</span>
                )}
                {shouldTruncate && isExpanded && (
                  <span className="text-brand-primary font-black text-[10px] ml-2 uppercase tracking-widest border-b-2 border-brand-primary/30 pb-0.5">Collapse View</span>
                )}
              </p>
            </motion.div>

            {post.isModule && post.fileUrl && (
              <a 
                href={post.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-brand-bg rounded-xl border border-brand-border/50 hover:border-blue-300 transition-colors group/module"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-brand-border/30">
                  <FileText size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black text-brand-ink truncate uppercase tracking-tight">{post.moduleName || 'Download File'}</p>
                  <p className="text-[9px] font-bold text-brand-secondary uppercase opacity-60">Click to view or download</p>
                </div>
                <Download size={16} className="text-brand-secondary group-hover/module:text-blue-500 group-hover/module:translate-y-0.5 transition-all" />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center flex-wrap gap-2 sm:gap-3 pt-4 border-t border-brand-border/20">
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className={cn(
                "flex items-center gap-1.5 py-2 px-4 rounded-full transition-all font-black text-[10px] uppercase tracking-widest border",
                Object.values(post.reactions || {}).some(uids => uids.includes(user?.uid || ''))
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm ring-4 ring-brand-primary/10" 
                  : "bg-brand-bg text-brand-secondary border-brand-border/50 hover:bg-white hover:text-brand-primary hover:border-brand-primary/30"
              )}
            >
              <Heart 
                size={14} 
                className={cn(Object.values(post.reactions || {}).some(uids => uids.includes(user?.uid || '')) && "fill-current")} 
              />
              <span>React</span>
            </motion.button>

            <AnimatePresence>
              {showReactionPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-2 p-1.5 bg-white border border-brand-border shadow-huge rounded-2xl flex items-center gap-1 z-20"
                >
                  {REACTION_TYPES.map((rt) => (
                    <button 
                      key={rt.key}
                      onClick={() => handleReact(rt.key)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-xl hover:bg-brand-bg transition-all active:scale-125 text-xl",
                        post.reactions?.[rt.key]?.includes(user?.uid || '') && "bg-brand-primary/10 scale-110"
                      )}
                      title={rt.label}
                    >
                      {rt.emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 py-2 px-4 rounded-full transition-all font-black text-[10px] uppercase tracking-widest border",
              showComments 
                ? "bg-brand-ink text-white border-brand-ink shadow-sm" 
                : "bg-brand-bg text-brand-secondary border-brand-border/50 hover:bg-white hover:text-brand-ink hover:border-brand-ink/30"
            )}
          >
            <MessageSquare size={14} />
            <span>{post.commentCount || 0}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Campus Life Post',
                  text: post.content,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            className="flex items-center gap-1.5 py-2 px-4 rounded-full transition-all font-black text-[10px] uppercase tracking-widest border bg-brand-bg text-brand-secondary border-brand-border/50 hover:bg-white hover:text-brand-ink hover:border-brand-ink/30 ml-auto sm:ml-0"
          >
            <Share2 size={14} />
            <span>Share</span>
          </motion.button>
        </div>

        {/* Reaction Summary Bar */}
        {Object.entries(post.reactions || {}).some(([_, uids]) => uids.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {REACTION_TYPES.map(rt => {
              const uids = post.reactions?.[rt.key] || [];
              if (uids.length === 0) return null;
              return (
                <div key={rt.key} className="flex items-center gap-1.5 px-2 py-1 bg-brand-bg border border-brand-border/10 rounded-full text-[10px] font-black text-brand-secondary shadow-sm">
                  <span>{rt.emoji}</span>
                  <span>{uids.length}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentsList 
            postId={post.id} 
            currentCommentCount={post.commentCount} 
            onUserClick={onUserClick}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CommentsList({ postId, currentCommentCount, onUserClick }: { postId: string, currentCommentCount: number, onUserClick: (uid: string) => void }) {
  const { user, profile, auth } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    const path = `posts/${postId}/comments`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const c = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommentType[];
      setComments(c);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path, auth);
    });
    return () => unsubscribe();
  }, [postId, auth]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isCommenting) return;
    
    setIsCommenting(true);
    const path = `posts/${postId}/comments`;
    try {
      await addDoc(collection(db, path), {
        postId,
        content: newComment,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'Anonymous',
        authorPhoto: profile?.photoURL || user.photoURL || null,
        reactions: {},
        createdAt: serverTimestamp()
      });
      // Increment comment count on post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: (currentCommentCount + 1)
      });

      setNewComment('');
    } catch (error: any) {
      console.error("Comment failed dramatically:", error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`COMMENT ERROR: ${errorMessage}\n\nPlease check your connection.`);
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    const path = `posts/${postId}/comments/${commentId}`;
    if (confirm('Delete this comment?')) {
      try {
        await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          commentCount: Math.max(0, currentCommentCount - 1)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path, auth);
      }
    }
  };

  const handleCommentUpdate = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    const path = `posts/${postId}/comments/${commentId}`;
    try {
      await updateDoc(doc(db, `posts/${postId}/comments`, commentId), {
        content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  };

  const handleCommentReact = async (commentId: string, reactionKey: string, currentReactions: Record<string, string[]>) => {
    if (!user) return;
    const path = `posts/${postId}/comments/${commentId}`;
    try {
      const commentRef = doc(db, `posts/${postId}/comments`, commentId);
      const uids = currentReactions[reactionKey] || [];
      const hasReacted = uids.includes(user.uid);

      await updateDoc(commentRef, {
        [`reactions.${reactionKey}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-brand-bg border-t border-brand-border/30 overflow-hidden"
    >
      <div className="p-3.5 space-y-3">
        {comments.length > 0 && (
          <div className="space-y-4 mb-4">
            {comments.map((c) => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                onDelete={() => handleCommentDelete(c.id)}
                onUpdate={(content) => handleCommentUpdate(c.id, content)}
                onUserClick={onUserClick}
                onReact={(key) => handleCommentReact(c.id, key, c.reactions || {})}
              />
            ))}
          </div>
        )}
        <form onSubmit={handleComment} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Write a comment..."
            className="flex-1 bg-brand-surface border border-brand-border/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!newComment.trim() || isCommenting}
            className="bg-brand-ink text-white p-1.5 rounded-lg disabled:opacity-50 transition-all active:scale-95"
          >
            {isCommenting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function CommentItem({ comment, onDelete, onUpdate, onUserClick, onReact }: { comment: CommentType, onDelete: () => void, onUpdate: (content: string) => void, onUserClick: (uid: string) => void, onReact: (key: string) => void }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const REACTION_TYPES = [
    { key: 'like', emoji: '👍', label: 'Like' },
    { key: 'heart', emoji: '❤️', label: 'Heart' },
    { key: 'blush', emoji: '😊', label: 'Blush' },
    { key: 'laugh', emoji: '😂', label: 'Laugh' },
    { key: 'sad', emoji: '😢', label: 'Sad' },
    { key: 'angry', emoji: '😠', label: 'Angry' },
  ];

  const handleSave = () => {
    onUpdate(editContent);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-3 group/item text-left animate-in fade-in slide-in-from-left-2 duration-300">
      <motion.button 
        whileTap={{ scale: 0.92 }}
        onClick={() => onUserClick(comment.authorId)}
        className="w-8 h-8 rounded-lg bg-white border border-brand-border/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-brand-primary/50 shadow-sm transition-all"
      >
         {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <div className="text-[11px] font-black text-brand-primary uppercase">{comment.authorName?.[0]}</div>}
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onUserClick(comment.authorId)}
              className="text-[10px] font-black text-brand-ink uppercase tracking-tight hover:text-brand-primary transition-colors"
            >
              {comment.authorName}
            </button>
            <span className="text-[9px] font-bold text-brand-secondary/50 uppercase tracking-tighter">
              {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
            </span>
          </div>
          {user?.uid === comment.authorId && (
            <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:text-brand-primary transition-colors">
                <Edit3 size={10} />
              </button>
              <button onClick={onDelete} className="p-1 hover:text-red-500 transition-colors">
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-1.5 mt-1">
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white border border-brand-border rounded-lg p-2 text-xs font-medium focus:outline-none min-h-[60px]"
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setIsEditing(false)} className="text-[8px] font-black uppercase text-brand-secondary">Cancel</button>
              <button onClick={handleSave} className="text-[8px] font-black uppercase text-brand-primary">Save</button>
            </div>
          </div>
        ) : (
          <div className="bg-brand-surface border border-brand-border/30 p-2 rounded-xl relative group">
             <p className="text-xs font-medium text-brand-ink leading-snug">{comment.content}</p>
             
             {/* Comment Reactions */}
             <div className="flex flex-wrap gap-1 mt-1.5 min-h-[16px]">
               {Object.entries(comment.reactions || {}).map(([key, uids]) => {
                 if (uids.length === 0) return null;
                 const rt = REACTION_TYPES.find(r => r.key === key);
                 if (!rt) return null;
                 return (
                   <button 
                    key={key}
                    onClick={() => onReact(key)}
                    className={cn(
                      "flex items-center gap-0.5 px-1 bg-brand-bg border border-brand-border/10 rounded-full text-[8px] font-black transition-all",
                      uids.includes(user?.uid || '') ? "text-brand-primary border-brand-primary/20" : "text-brand-secondary"
                    )}
                   >
                     <span>{rt.emoji}</span>
                     <span>{uids.length}</span>
                   </button>
                 );
               })}
               
               <div className="relative">
                 <button 
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-brand-secondary hover:text-brand-primary"
                 >
                   <Smile size={10} />
                 </button>
                 
                 <AnimatePresence>
                   {showReactionPicker && (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute bottom-full left-0 mb-1 p-1 bg-white border border-brand-border shadow-lg rounded-xl flex items-center gap-0.5 z-10"
                     >
                       {REACTION_TYPES.map(rt => (
                         <button 
                          key={rt.key}
                          onClick={() => { onReact(rt.key); setShowReactionPicker(false); }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-brand-bg transition-colors text-sm"
                         >
                           {rt.emoji}
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventModal({ onClose }: { onClose: () => void }) {
  const { user, profile, auth } = useAuth();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !location || !user || isSaving) return;

    setIsSaving(true);
    const eventData = {
      title,
      date,
      time,
      location,
      description,
      organizerId: user.uid,
      organizerName: profile?.displayName || user.displayName || 'Teacher',
      createdAt: serverTimestamp()
    };

    console.log('Attempting to schedule event with logging:', eventData);

    try {
      await addDoc(collection(db, 'events'), eventData);
      console.log('Event schedule successful');
      onClose();
    } catch (error: any) {
      console.error("Event schedule failed dramatically:", error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`EVENT SCHEDULING ERROR: ${errorMessage}\n\nPlease check your permissions.`);
      handleFirestoreError(error, OperationType.WRITE, 'events', auth);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-ink/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-brand-surface rounded-2xl border border-brand-border shadow-huge overflow-hidden"
      >
        <div className="p-4 border-b border-brand-border/50 flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-black text-brand-ink text-sm uppercase tracking-tight">Schedule Event</h3>
              <p className="text-[10px] font-bold text-brand-secondary uppercase">Campus-wide announcement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest ml-1">Event Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Science Fair 2024"
              className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:border-brand-primary outline-none transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest ml-1">Date</label>
              <div className="relative">
                <input 
                  required
                  type="date" 
                  className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-10 py-3 text-sm font-medium focus:border-brand-primary outline-none transition-colors appearance-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest ml-1">Time</label>
              <div className="relative">
                <input 
                  required
                  type="time" 
                  className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-10 py-3 text-sm font-medium focus:border-brand-primary outline-none transition-colors appearance-none"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-50" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest ml-1">Location</label>
            <div className="relative">
              <input 
                required
                type="text" 
                placeholder="e.g. Main Auditorium"
                className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-10 py-3 text-sm font-medium focus:border-brand-primary outline-none transition-colors"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary opacity-50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-brand-secondary uppercase tracking-widest ml-1">Description</label>
            <textarea 
              placeholder="What's happening?"
              className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:border-brand-primary outline-none transition-colors min-h-[100px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-brand-border text-[10px] font-black uppercase tracking-widest hover:bg-brand-bg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-brand-primary text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[0.98] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Schedule Event'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

