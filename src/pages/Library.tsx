import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Plus, 
  ExternalLink,
  Eye,
  FileBox,
  Layout,
  Trash2,
  Globe,
  Loader2,
  FileUp,
  Files,
  X,
  Search,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Resource {
  id: string;
  title: string;
  link: string;
  fileName?: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: any;
}

export default function Library() {
  const { user, profile, auth } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];
      setResources(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLink.trim() || !user || isAdding) return;

    setIsAdding(true);
    const path = 'resources';
    try {
      // Basic URL hygiene: ensure it has a protocol
      let linkToSave = newLink.trim();
      if (!linkToSave.startsWith('http://') && !linkToSave.startsWith('https://')) {
        linkToSave = 'https://' + linkToSave;
      }

      await addDoc(collection(db, path), {
        title: newTitle.trim(),
        link: linkToSave,
        uploaderId: user.uid,
        uploaderName: profile?.displayName || 'Teacher',
        createdAt: serverTimestamp()
      });
      
      alert('Resource added successful!');
      setNewTitle('');
      setNewLink('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding resource:", error);
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    } finally {
      setIsAdding(false);
    }
  };

  const getFileIcon = (link: string) => {
    const ext = link.toLowerCase().split('.').pop()?.split('?')[0];
    if (ext === 'pdf') return { icon: FileText, color: 'text-red-500', label: 'PDF', bg: 'bg-red-50', border: 'border-red-100' };
    if (['doc', 'docx'].includes(ext || '')) return { icon: FileBox, color: 'text-blue-500', label: 'Word', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (['ppt', 'pptx'].includes(ext || '')) return { icon: Layout, color: 'text-orange-500', label: 'PPT', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (link.includes('drive.google.com')) return { icon: Globe, color: 'text-green-600', label: 'Google Drive', bg: 'bg-green-50', border: 'border-green-100' };
    return { icon: ExternalLink, color: 'text-brand-primary', label: 'Link', bg: 'bg-blue-50', border: 'border-blue-100' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-brand-ink">Digital Library</h2>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-95 transition-all outline-none"
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            {showAddForm ? 'Cancel' : 'Add Material'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-brand-surface border border-brand-primary/20 rounded-2xl p-4 mb-4 shadow-soft">
              <form onSubmit={handleAddResource} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Resource Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Week 1 - Intro to Programming"
                    className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Paste Google Drive/Web Link here</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono text-[10px]"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    required
                  />
                  <p className="text-[9px] text-brand-secondary/60 mt-1 px-1 italic">Note: Use Google Drive shared links to save storage space.</p>
                </div>
                <button 
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-brand-ink text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                  {isAdding ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                  Add Resource
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 group-focus-within:text-brand-primary transition-colors" size={16} />
        <input 
          type="text"
          placeholder="Search by title or teacher name..."
          className="w-full bg-brand-surface border border-brand-border/50 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key="files"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {resources.filter(r => 
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            r.uploaderName.toLowerCase().includes(searchQuery.toLowerCase())
          ).length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {resources
                .filter(r => 
                  r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  r.uploaderName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(resource => (
                  <ResourceCard key={resource.id} resource={resource} getFileIcon={getFileIcon} />
                ))}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
              <Book className="mx-auto text-brand-primary mb-3 opacity-50" size={32} />
              <h3 className="font-black text-brand-ink text-sm mb-1">
                {searchQuery ? "No matching materials" : "No materials yet"}
              </h3>
              <p className="text-xs text-brand-secondary font-medium">
                {searchQuery ? "Try searching for something else." : "Materials uploaded by teachers will appear here."}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ResourceCard({ resource, getFileIcon }: { resource: Resource, getFileIcon: (link: string) => any }) {
  const fileInfo = getFileIcon(resource.link);
  const Icon = fileInfo.icon;
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'resources', resource.id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-3 flex items-center gap-4 hover:border-brand-primary/50 transition-all group shadow-sm">
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform",
        fileInfo.bg,
        fileInfo.border
      )}>
        <Icon className={fileInfo.color} size={24} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-black text-brand-ink truncate leading-tight">{resource.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
            fileInfo.bg,
            fileInfo.border,
            fileInfo.color
          )}>
            {fileInfo.label}
          </span>
          <span className="text-[9px] font-bold text-brand-secondary/60 truncate">
            Shared by {resource.uploaderName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user?.uid === resource.uploaderId && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-2 text-brand-secondary hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
        <a 
          href={resource.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye size={12} />
          View
        </a>
      </div>
    </div>
  );
}
