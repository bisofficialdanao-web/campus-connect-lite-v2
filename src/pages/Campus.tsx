import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Post, Comment as CommentType } from '../types';
import { Heart, MessageSquare, Send, Trash2, Edit3, MoreVertical, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import UserProfileModal from '../components/UserProfileModal';

export default function Campus() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p: Post[] = [];
      snapshot.forEach(doc => {
        p.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(p);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || isPosting || !user) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        isAnonymous,
        reactions: { 'heart': [] },
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewPost('');
      setIsAnonymous(false);
    } catch (error) {
      console.error("Post failed", error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-brand-surface border-2 border-brand-border rounded-3xl p-4 shadow-sm">
        <form onSubmit={handlePost} className="space-y-3">
          <textarea 
            placeholder="Share a confession or update..."
            className="w-full bg-transparent resize-none focus:outline-none text-brand-ink font-medium min-h-[80px]"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <div className="flex items-center justify-between pt-2 border-t border-brand-border">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                  isAnonymous 
                    ? "bg-brand-ink text-white border-brand-ink" 
                    : "bg-brand-bg text-brand-secondary border-brand-border"
                )}
              >
                {isAnonymous ? "Posting Anonymously" : "Post Anonymously"}
              </button>
            </div>
            <button 
              type="submit" 
              disabled={!newPost.trim() || isPosting}
              className="bg-brand-primary text-white p-2 px-6 rounded-2xl font-bold flex items-center gap-2 hover:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-md"
            >
              <Send size={16} />
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <AnimatePresence>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onUserClick={(uid) => setSelectedUserUid(uid)} />
        ))}
      </AnimatePresence>

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

  const displayName = post.isAnonymous ? "Anonymous Student" : post.authorName;
  const displayPhoto = post.isAnonymous ? null : post.authorPhoto;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brand-surface border-2 border-brand-border rounded-3xl overflow-hidden shadow-sm"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden border shadow-inner transition-transform active:scale-95",
                post.isAnonymous ? "bg-brand-ink border-brand-ink cursor-default" : "bg-brand-bg border-brand-border"
              )}
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              ) : post.isAnonymous ? (
                <Users size={20} className="text-white opacity-50" />
              ) : (
                <span className="text-sm font-bold text-brand-primary uppercase">{post.authorName[0]}</span>
              )}
            </button>
            <div className="text-left">
              <button 
                onClick={() => !post.isAnonymous && onUserClick(post.authorId)}
                className={cn(
                  "text-sm font-black leading-none hover:underline",
                  post.isAnonymous ? "text-brand-ink/60 italic cursor-default no-underline" : "text-brand-ink"
                )}
              >
                {displayName}
              </button>
              <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider mt-1">
                {post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now'}
                {post.updatedAt?.seconds !== post.createdAt?.seconds && " • Edited"}
              </p>
            </div>
          </div>
          {user?.uid === post.authorId && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={cn("p-2 transition-colors", isEditing ? "text-brand-primary" : "text-brand-secondary hover:text-brand-primary")}
              >
                <Edit3 size={16} />
              </button>
              <button onClick={handleDelete} className="p-2 text-brand-secondary hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 text-sm font-medium focus:outline-none min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-secondary">Cancel</button>
              <button onClick={handleEdit} className="px-4 py-2 bg-brand-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Save Changes</button>
            </div>
          </div>
        ) : (
          <p className="text-brand-ink font-medium leading-relaxed mb-6 whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-brand-border">
          <button 
            onClick={handleReact}
            className={cn(
              "flex items-center gap-2 py-1 px-4 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-transparent",
              post.reactions['heart']?.includes(user?.uid || '')
                ? "bg-red-50 text-red-500 border-red-100" 
                : "bg-brand-bg text-brand-secondary hover:bg-white hover:border-brand-border"
            )}
          >
            <Heart size={16} fill={post.reactions['heart']?.includes(user?.uid || '') ? "currentColor" : "none"} />
            {post.reactions['heart']?.length || 0}
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-2 py-1 px-4 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-transparent",
              showComments 
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" 
                : "bg-brand-bg text-brand-secondary hover:bg-white hover:border-brand-border"
            )}
          >
            <MessageSquare size={16} />
            {post.commentCount || 0}
          </button>
        </div>
      </div>
      
      {showComments && <CommentsList postId={post.id} />}
    </motion.div>
  );
}

function CommentsList({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const c: CommentType[] = [];
      snapshot.forEach(doc => {
        c.push({ id: doc.id, ...doc.data() } as CommentType);
      });
      setComments(c);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        postId,
        content: newComment,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
      // Increment comment count on post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: (comments.length + 1)
      });
      setNewComment('');
    } catch (error) {
      console.error("Comment failed", error);
    }
  };

  return (
    <div className="bg-brand-bg p-4 border-t border-brand-border space-y-4">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="flex-1 bg-brand-surface border border-brand-border p-3 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider">{c.authorName}</span>
                <span className="text-[9px] font-bold text-brand-secondary opacity-50">
                  {c.createdAt ? formatDistanceToNow(c.createdAt.toDate()) : ''}
                </span>
              </div>
              <p className="text-xs font-medium text-brand-ink">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleComment} className="flex gap-2">
        <input 
          type="text" 
          placeholder="Add a comment..."
          className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!newComment.trim()}
          className="bg-brand-primary text-white p-2 rounded-xl disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
