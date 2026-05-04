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
  Ghost,
  Trash2,
  Edit3
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
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import UserProfileModal from '../components/UserProfileModal';
import { Post, Comment as CommentType } from '../types';

export default function Campus() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || isPosting) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        content: newPost,
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
      setIsAnonymous(false);
    } catch (error) {
      console.error("Error adding post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const quickActions = [
    { icon: <School size={16} />, label: 'Create Class', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { icon: <Calendar size={16} />, label: 'Add Event', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { icon: <ClipboardList size={16} />, label: 'Post Task', color: 'bg-green-50 text-green-600 border-green-100' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-20">
      {/* Main Feed */}
      <div className="flex-1 space-y-4">
        {/* Quick Actions (Mobile Top Scroll) */}
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-2 min-w-max">
            {quickActions.map((action, i) => (
              <button key={i} className={cn("px-4 py-2 rounded-xl flex items-center gap-2 border font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all", action.color)}>
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Create Post */}
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-3 shadow-sm">
          <form onSubmit={handlePost} className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border/30 flex items-center justify-center overflow-hidden shrink-0">
                {isAnonymous ? <Ghost size={16} className="text-brand-ink" /> : (
                  profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : <div className="text-xs font-bold text-brand-primary uppercase">{profile?.displayName?.[0]}</div>
                )}
              </div>
              <textarea 
                placeholder="Share a thought or confession..."
                className="w-full bg-transparent resize-none focus:outline-none text-brand-ink font-medium text-sm min-h-[50px] py-1.5"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-brand-border/30">
              <div className="flex items-center gap-1">
                <button 
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border",
                    isAnonymous ? "bg-brand-ink text-white border-brand-ink" : "bg-brand-bg text-brand-secondary border-brand-border/50 hover:bg-white"
                  )}
                >
                  <Users size={12} />
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </button>
                <div className="flex px-1">
                  <button type="button" className="p-1.5 text-brand-secondary hover:text-brand-primary transition-colors"><Smile size={16} /></button>
                  <button type="button" className="p-1.5 text-brand-secondary hover:text-brand-primary transition-colors"><ImageIcon size={16} /></button>
                </div>
              </div>
              <button 
                type="submit"
                disabled={!newPost.trim() || isPosting}
                className="bg-brand-primary text-white p-2 rounded-xl hover:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-3">
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
              <button key={i} className={cn("w-full px-4 py-3 rounded-xl flex items-center gap-3 border font-black text-[10px] uppercase tracking-widest hover:scale-[0.98] transition-all", action.color)}>
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
      </AnimatePresence>
    </div>
  );
}

function PostCard({ post, onUserClick }: { post: Post, onUserClick: (uid: string) => void }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const handleReact = async () => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    const hasReacted = post.reactions['heart']?.includes(user.uid);
    
    await updateDoc(postRef, {
      [`reactions.heart`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      content: editContent,
      updatedAt: serverTimestamp()
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this post?')) {
      await deleteDoc(doc(db, 'posts', post.id));
    }
  };

  const displayPhoto = post.isAnonymous ? null : post.authorPhoto;
  const timeLabel = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'just now';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brand-surface border border-brand-border/50 rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border border-brand-border/30 shadow-inner transition-transform active:scale-95",
                post.isAnonymous ? "bg-brand-ink border-brand-ink cursor-default" : "bg-brand-bg border-brand-border"
              )}
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              ) : post.isAnonymous ? (
                <Ghost size={16} className="text-white opacity-50" />
              ) : (
                <span className="text-xs font-bold text-brand-primary uppercase">{post.authorName?.[0] || 'U'}</span>
              )}
            </button>
            <div className="text-left">
              <button 
                onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
                className={cn(
                  "text-xs font-black tracking-tight flex items-center gap-1.5 hover:underline decoration-brand-border",
                  post.isAnonymous ? "text-brand-ink/60 no-underline cursor-default" : "text-brand-ink"
                )}
              >
                {post.isAnonymous ? 'Anonymous Member' : post.authorName}
                {post.isAnonymous && <span className="text-[8px] font-black text-brand-secondary bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border/30">LITE</span>}
              </button>
              <p className="text-[9px] font-medium text-brand-secondary uppercase tracking-widest">{timeLabel}</p>
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
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm font-medium focus:outline-none min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-brand-secondary">Cancel</button>
              <button onClick={handleEdit} className="px-3 py-1.5 bg-brand-ink text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-brand-ink text-sm font-medium leading-relaxed mb-4 whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-brand-border/30">
          <button 
            onClick={handleReact}
            className={cn(
              "flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border border-transparent",
              post.reactions?.['heart']?.includes(user?.uid || '')
                ? "bg-red-50 text-red-500 border-red-100" 
                : "bg-brand-bg text-brand-secondary hover:bg-white hover:border-brand-border/50"
            )}
          >
            <Heart size={14} fill={post.reactions?.['heart']?.includes(user?.uid || '') ? "currentColor" : "none"} />
            {post.reactions?.['heart']?.length || 0}
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border border-transparent",
              showComments 
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" 
                : "bg-brand-bg text-brand-secondary hover:bg-white hover:border-brand-border/50"
            )}
          >
            <MessageSquare size={14} />
            {post.commentCount || 0}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && <CommentsList postId={post.id} currentCommentCount={post.commentCount} />}
      </AnimatePresence>
    </motion.div>
  );
}

function CommentsList({ postId, currentCommentCount }: { postId: string, currentCommentCount: number }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const c = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommentType[];
      setComments(c);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isCommenting) return;
    
    setIsCommenting(true);
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
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
      console.error("Comment failed", error);
    } finally {
      setIsCommenting(false);
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
          <div className="space-y-2 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-surface border border-brand-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                   {c.authorPhoto ? <img src={c.authorPhoto} className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-brand-primary uppercase">{c.authorName?.[0]}</div>}
                </div>
                <div className="flex-1 bg-brand-surface border border-brand-border/30 p-2 rounded-xl">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-wider">{c.authorName}</span>
                    <span className="text-[8px] font-bold text-brand-secondary opacity-50 uppercase">
                      {c.createdAt ? formatDistanceToNow(c.createdAt.toDate()) : 'just now'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-brand-ink leading-snug">{c.content}</p>
                </div>
              </div>
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
            <Send size={14} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
