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
  FileText
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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import UserProfileModal from '../components/UserProfileModal';
import { Post, Comment as CommentType } from '../types';
import { createNotification } from '../lib/notifications';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Campus() {
  const { user, profile, auth } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const moduleFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File is too large (max 10MB)');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Start upload immediately
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadImage(file);
        setUploadedImageUrl(url);
      } catch (error) {
        alert('Image upload failed. Please try again.');
        setSelectedImage(null);
        setImagePreview(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const uploadImage = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      if (!user) return resolve(null);
      const storageRef = ref(storage, `campus/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload failed", error);
          reject(error);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(storageRef);
          resolve(downloadURL);
        }
      );
    });
  };

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
    if ((!newPost.trim() && !uploadedImageUrl) || !user || isPosting || isUploading) return;

    setIsPosting(true);
    const path = 'posts';
    try {
      await addDoc(collection(db, path), {
        content: newPost,
        imageUrl: uploadedImageUrl,
        authorId: user.uid,
        authorName: profile?.displayName || 'Anonymous',
        authorPhoto: profile?.photoURL || null,
        isAnonymous,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reactions: { heart: [] },
        commentCount: 0
      });
      setNewPost('');
      setSelectedImage(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
      setIsAnonymous(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    } finally {
      setIsPosting(false);
    }
  };

  const quickActions = [
    { 
      icon: <School size={16} />, 
      label: 'Create Class', 
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      onClick: () => { window.location.href = '/classes' } 
    },
    { 
      icon: <Calendar size={16} />, 
      label: 'Add Event', 
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      onClick: () => setIsEventModalOpen(true),
      visible: profile?.role === 'teacher'
    },
    { 
      icon: <BookOpen size={16} />, 
      label: 'New Module', 
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      onClick: () => setIsModuleModalOpen(true),
      visible: profile?.role === 'teacher'
    },
    { 
      icon: <ClipboardList size={16} />, 
      label: 'Assignments', 
      color: 'bg-green-50 text-green-600 border-green-100',
      onClick: () => { window.location.href = '/classes' } 
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
        <div className="bg-brand-surface border border-brand-card-border rounded-xl p-5 shadow-soft">
          <form onSubmit={handlePost} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-border/30 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {isAnonymous ? <Ghost size={20} className="text-brand-ink" /> : (
                  profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : <div className="text-sm font-black text-brand-primary uppercase">{profile?.displayName?.[0]}</div>
                )}
              </div>
              <textarea 
                placeholder="Share a thought or confession..."
                className="w-full bg-[#f5f5f5] border-none rounded-2xl p-4 text-brand-ink font-medium text-sm min-h-[80px] focus:ring-1 focus:ring-brand-primary placeholder:text-brand-secondary/50"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            </div>

            {imagePreview && (
              <div className="relative w-full max-h-64 rounded-2xl overflow-hidden border border-brand-border/30 bg-brand-bg group ml-14">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-brand-ink/40 flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-brand-primary"
                      />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{Math.round(uploadProgress)}%</span>
                  </div>
                )}

                <button 
                  type="button"
                  disabled={isUploading}
                  onClick={() => { 
                    setSelectedImage(null); 
                    setImagePreview(null); 
                    setUploadedImageUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-brand-ink/80 text-white rounded-full hover:bg-brand-ink transition-colors disabled:opacity-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0] ml-14">
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
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-brand-secondary hover:text-brand-primary transition-colors"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
              <motion.button 
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={(!newPost.trim() && !uploadedImageUrl) || isPosting || isUploading}
                className="bg-brand-primary text-white px-6 py-2 rounded-full font-black text-[11px] uppercase tracking-widest hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md flex items-center justify-center gap-2"
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
                  onImageClick={(url) => setViewingImage(url)}
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
        {viewingImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-ink/95 backdrop-blur-md"
            onClick={() => setViewingImage(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-full max-h-full"
            >
              <img src={viewingImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-huge" />
              <button 
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setViewingImage(null)}
              >
                <X size={32} />
              </button>
            </motion.div>
          </div>
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
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            reject,
            async () => {
              fileUrl = await getDownloadURL(storageRef);
              resolve(null);
            }
          );
        });
      }

      await addDoc(collection(db, 'posts'), {
        content: `📚 NEW MODULE: ${title}\n\n${description}`,
        fileUrl,
        isModule: true,
        moduleName: title,
        authorId: user.uid,
        authorName: profile?.displayName || 'Teacher',
        authorPhoto: profile?.photoURL || null,
        isAnonymous: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reactions: { heart: [] },
        commentCount: 0
      });
      onClose();
    } catch (error) {
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

function PostCard({ post, onUserClick, onImageClick }: { post: Post, onUserClick: (uid: string) => void, onImageClick: (url: string) => void }) {
  const { user, profile, auth } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

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

  const handleReact = async () => {
    if (!user) return;
    const path = `posts/${post.id}`;
    try {
      const postRef = doc(db, 'posts', post.id);
      const hasReacted = post.reactions['heart']?.includes(user.uid);
      
      await updateDoc(postRef, {
        [`reactions.heart`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
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
        "bg-brand-surface border border-brand-card-border rounded-xl overflow-hidden shadow-soft p-5",
        post.isModule && "border-blue-200 border-2"
      )}
    >
      {post.isModule && (
        <div className="bg-blue-50 px-5 py-2 -mx-5 -mt-5 mb-4 flex items-center gap-2 border-b border-blue-100">
          <BookOpen size={14} className="text-blue-500" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Class Module</span>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={!post.isAnonymous ? { scale: 0.95 } : {}}
              onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-brand-border/30 shadow-inner transition-transform",
                post.isAnonymous ? "bg-brand-ink border-brand-ink cursor-default" : "bg-brand-bg border-brand-border cursor-pointer hover:border-brand-primary/30"
              )}
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              ) : post.isAnonymous ? (
                <Ghost size={20} className="text-white opacity-50" />
              ) : (
                <span className="text-sm font-black text-brand-primary uppercase">{post.authorName?.[0] || 'U'}</span>
              )}
            </motion.button>
            <div className="text-left">
              <button 
                onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
                className={cn(
                  "text-sm font-black tracking-tight flex items-center gap-1.5 hover:underline decoration-brand-border",
                  post.isAnonymous ? "text-brand-ink/60 no-underline cursor-default" : "text-brand-ink cursor-pointer"
                )}
              >
                {post.isAnonymous ? 'Anonymous Member' : post.authorName}
                {post.isAnonymous && <span className="text-[8px] font-black text-brand-secondary bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border/30">LITE</span>}
              </button>
              <p className="text-[10px] font-bold text-brand-secondary/60 uppercase tracking-widest">{timeLabel}</p>
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
          <div className="space-y-3 mb-4">
            <motion.div 
              whileTap={shouldTruncate ? { scale: 0.995 } : {}}
              onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
              className={cn(
                "group/content transition-all",
                shouldTruncate && "cursor-pointer hover:opacity-80"
              )}
            >
              <p className="text-brand-ink text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                {displayContent}
                {shouldTruncate && !isExpanded && (
                  <span className="text-brand-primary font-black text-[10px] ml-1 uppercase tracking-wider inline-block">Read More</span>
                )}
                {shouldTruncate && isExpanded && (
                  <span className="text-brand-primary font-black text-[10px] ml-1 uppercase tracking-wider inline-block">Show Less</span>
                )}
              </p>
            </motion.div>
            
            {post.imageUrl && (
              <div 
                onClick={() => onImageClick(post.imageUrl!)}
                className="rounded-xl overflow-hidden border border-brand-border/30 bg-brand-bg group/img relative cursor-zoom-in active:scale-[0.98] transition-transform"
              >
                <img 
                  src={post.imageUrl} 
                  alt="Post content" 
                  className="w-full max-h-80 object-cover transition-transform duration-500 group-hover/img:scale-105" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-brand-ink/0 group-hover/img:bg-brand-ink/5 transition-colors" />
              </div>
            )}

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

        <div className="flex items-center gap-2 pt-3 border-t border-brand-border/30">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReact}
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest border",
              post.reactions?.['heart']?.includes(user?.uid || '')
                ? "bg-red-50 text-red-500 border-red-100 shadow-sm" 
                : "bg-brand-bg text-brand-secondary border-brand-border/30 hover:bg-white hover:text-red-500 hover:border-red-200"
            )}
          >
            <Heart 
              size={14} 
              className={cn("transition-transform", post.reactions?.['heart']?.includes(user?.uid || '') && "animate-pulse")}
              fill={post.reactions?.['heart']?.includes(user?.uid || '') ? "currentColor" : "none"} 
            />
            {post.reactions?.['heart']?.length || 0}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest border",
              showComments 
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20 shadow-sm" 
                : "bg-brand-bg text-brand-secondary border-brand-border/30 hover:bg-white hover:text-brand-primary hover:border-brand-primary/20"
            )}
          >
            <MessageSquare size={14} />
            {post.commentCount || 0}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'SchoolLite Post',
                  text: post.content,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest border bg-brand-bg text-brand-secondary border-brand-border/30 hover:bg-white hover:text-brand-ink hover:border-brand-ink/20"
          >
            <Share2 size={14} />
            Share
          </motion.button>
        </div>
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
        authorName: profile?.displayName || 'Anonymous',
        authorPhoto: profile?.photoURL || null,
        createdAt: serverTimestamp()
      });
      // Increment comment count on post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: (currentCommentCount + 1)
      });

      setNewComment('');
    } catch (error) {
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

function CommentItem({ comment, onDelete, onUpdate, onUserClick }: { comment: CommentType, onDelete: () => void, onUpdate: (content: string) => void, onUserClick: (uid: string) => void }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleSave = () => {
    onUpdate(editContent);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-2 group/item text-left">
      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={() => onUserClick(comment.authorId)}
        className="w-6 h-6 rounded-md bg-brand-surface border border-brand-border/30 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-brand-primary/30 shadow-sm"
      >
         {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-brand-primary uppercase">{comment.authorName?.[0]}</div>}
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => onUserClick(comment.authorId)}
              className="text-[9px] font-black text-brand-primary uppercase tracking-wider hover:underline"
            >
              {comment.authorName}
            </button>
            <span className="text-[8px] font-bold text-brand-secondary opacity-50 uppercase tracking-tighter">
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
          <div className="bg-brand-surface border border-brand-border/30 p-2 rounded-xl">
             <p className="text-xs font-medium text-brand-ink leading-snug">{comment.content}</p>
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
    try {
      await addDoc(collection(db, 'events'), {
        title,
        date,
        time,
        location,
        description,
        organizerId: user.uid,
        organizerName: profile?.displayName || 'Teacher',
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
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
