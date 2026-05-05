import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Plus, 
  ExternalLink,
  Eye,
  Trash2,
  Loader2,
  FileUp,
  X,
  Search,
  FileText,
  Youtube,
  PlayCircle,
  ChevronLeft,
  GraduationCap,
  Folder
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
  doc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Resource {
  id: string;
  title: string;
  link: string;
  subject: string;
  gradeLevel: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: any;
}

const SUBJECTS = [
  { id: 'english', name: 'English', color: '#000080' },
  { id: 'filipino', name: 'Filipino', color: '#800080' },
  { id: 'math', name: 'Math', color: '#008000' },
  { id: 'science', name: 'Science', color: '#FFA500' },
  { id: 'tle', name: 'TLE', color: '#FFFF00' },
  { id: 'ap', name: 'Araling Panlipunan', color: '#8B4513' },
  { id: 'esp', name: 'ESP', color: '#FF0000' },
  { id: 'mapeh', name: 'MAPeH', color: '#DAA520' },
];

const GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

export default function Library() {
  const { user, profile, auth } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newSubject, setNewSubject] = useState(SUBJECTS[0].id);
  const [newGrade, setNewGrade] = useState(GRADES[0]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Drill down logic
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    
    if (selectedSubject && selectedGrade) {
      q = query(
        collection(db, 'resources'), 
        where('subject', '==', selectedSubject),
        where('gradeLevel', '==', selectedGrade),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];
      setResources(data);
    }, (error) => {
      console.error("Snapshot error:", error);
    });
    return () => unsubscribe();
  }, [selectedSubject, selectedGrade]);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLink.trim() || !user || isAdding) return;

    setIsAdding(true);
    const path = 'resources';
    try {
      let linkToSave = newLink.trim();
      if (!linkToSave.startsWith('http://') && !linkToSave.startsWith('https://')) {
        linkToSave = 'https://' + linkToSave;
      }

      await addDoc(collection(db, path), {
        title: newTitle.trim(),
        link: linkToSave,
        subject: newSubject,
        gradeLevel: newGrade,
        uploaderId: user.uid,
        uploaderName: profile?.displayName || 'Teacher',
        createdAt: serverTimestamp()
      });
      
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
    const isYoutube = link.includes('youtube.com') || link.includes('youtu.be');
    const isDrive = link.includes('drive.google.com') || link.includes('docs.google.com');
    const isPdf = link.toLowerCase().includes('.pdf');
    
    if (isYoutube) {
      return { 
        icon: PlayCircle, 
        color: 'text-red-600', 
        label: 'YouTube', 
        bg: 'bg-red-50', 
        border: 'border-red-200' 
      };
    }
    
    if (isDrive) {
      return { 
        icon: FileText, 
        color: 'text-green-600', 
        label: 'Google Drive', 
        bg: 'bg-green-50', 
        border: 'border-green-200' 
      };
    }

    if (isPdf) {
      return { 
        icon: FileText, 
        color: 'text-orange-600', 
        label: 'PDF Document', 
        bg: 'bg-orange-50', 
        border: 'border-orange-200' 
      };
    }

    return { 
      icon: FileText, 
      color: 'text-brand-primary', 
      label: 'Document', 
      bg: 'bg-blue-50', 
      border: 'border-blue-100' 
    };
  };

  const currentSubjectData = SUBJECTS.find(s => s.id === (selectedSubject || newSubject));

  return (
    <div className="space-y-6 min-h-full pb-20">
      {/* Header & Back Button Section */}
      <div className="flex flex-col gap-4">
        {(selectedSubject || selectedGrade) && (
          <button 
            onClick={() => {
              if (selectedGrade) setSelectedGrade(null);
              else setSelectedSubject(null);
              setSearchQuery('');
            }}
            className="flex items-center gap-2 self-start px-4 py-2 bg-white border border-brand-border rounded-full text-[11px] font-black uppercase tracking-widest text-brand-secondary shadow-sm hover:translate-x-[-4px] transition-all"
          >
            <ChevronLeft size={16} />
            Back to {selectedGrade ? selectedSubject?.toUpperCase() : 'Subjects'}
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Book className="text-brand-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-brand-ink">
                {selectedSubject ? SUBJECTS.find(s => s.id === selectedSubject)?.name : 'Digital Library'}
              </h2>
              <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">
                {selectedGrade || (selectedSubject ? 'Select Grade' : 'Select Subject')}
              </p>
            </div>
          </div>
          
          {profile?.role === 'teacher' && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-ink text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-95 transition-all"
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              {showAddForm ? 'Cancel' : 'Add Resource'}
            </button>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 group-focus-within:text-brand-primary transition-colors" size={18} />
        <input 
          type="text"
          placeholder={selectedGrade ? `Search in this folder...` : "Search all titles or teachers..."}
          className="w-full bg-white border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-brand-bg rounded-full hover:bg-brand-border transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/50 backdrop-blur-sm"
          >
            <motion.div 
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-huge relative overflow-hidden"
              style={{ border: `4px solid ${currentSubjectData?.color || '#000'}` }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-brand-ink uppercase tracking-widest">Add New Resource</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddResource} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Subject</label>
                    <select 
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Grade Level</label>
                    <select 
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none"
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Resource Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Photosynthesis Chapter 1"
                    className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1 block px-1">Resource Link (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://google.com/drive/..."
                    className="w-full bg-brand-bg border border-brand-border/50 rounded-xl px-4 py-3 text-sm font-mono text-[10px] focus:outline-none"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white transition-all shadow-lg flex items-center justify-center gap-2 hover:brightness-110"
                  style={{ backgroundColor: currentSubjectData?.color || '#000' }}
                >
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  Upload Material
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        {searchQuery && !selectedGrade ? (
          // Search Results View (Global or within Subject)
          <motion.div 
            key="search-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">
                Search Results ({resources.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.uploaderName.toLowerCase().includes(searchQuery.toLowerCase())).length})
              </h3>
            </div>
            
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
              <div className="bg-white border border-brand-border border-dashed rounded-3xl p-12 text-center">
                <Search className="mx-auto text-brand-secondary mb-4 opacity-20" size={48} />
                <h3 className="font-black text-brand-ink text-sm mb-1 uppercase tracking-widest">No results found</h3>
                <p className="text-xs text-brand-secondary">Try a different keyword or teacher name.</p>
              </div>
            )}
          </motion.div>
        ) : !selectedSubject ? (
          // 1. Subject Grid View
          <motion.div 
            key="subjects"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {SUBJECTS.map(subject => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className="group relative overflow-hidden bg-white border border-brand-border rounded-3xl p-6 text-left hover:border-transparent transition-all hover:shadow-xl hover:-translate-y-1"
                style={{ '--hover-color': subject.color } as any}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" 
                  style={{ backgroundColor: subject.color }}
                />
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg"
                  style={{ backgroundColor: subject.color }}
                >
                  <Folder size={24} />
                </div>
                <h3 className="font-black text-brand-ink text-sm uppercase tracking-wider">{subject.name}</h3>
                <p className="text-[9px] font-bold text-brand-secondary mt-1 uppercase tracking-widest">Explore Materials</p>
              </button>
            ))}
          </motion.div>
        ) : !selectedGrade ? (
          // 2. Grade Drill-down View
          <motion.div 
            key="grades"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {GRADES.map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="flex items-center gap-4 bg-white border border-brand-border rounded-3xl p-8 hover:bg-brand-bg transition-all group"
              >
                <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all border border-transparent group-hover:border-brand-border">
                  <GraduationCap className="text-brand-primary" size={32} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black text-brand-ink">{grade}</h3>
                  <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Chapter Folders</p>
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          // 3. Resource List View
          <motion.div 
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
              <div className="bg-brand-bg border border-brand-border border-dashed rounded-3xl p-12 text-center">
                <Folder className="mx-auto text-brand-secondary mb-4 opacity-20" size={48} />
                <h3 className="font-black text-brand-ink text-sm mb-1 uppercase tracking-widest">
                  Folder is Empty
                </h3>
                <p className="text-xs text-brand-secondary font-medium">
                  No materials have been uploaded for this category yet.
                </p>
              </div>
            )}
          </motion.div>
        )}
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
    <div className="bg-white border border-brand-border rounded-2xl p-4 flex items-center gap-4 hover:border-brand-primary transition-all group shadow-sm">
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform",
        fileInfo.bg,
        fileInfo.border
      )}>
        <Icon className={fileInfo.color} size={28} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-black text-brand-ink truncate leading-tight group-hover:text-brand-primary transition-colors">
          {resource.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 px-0.5">
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
            fileInfo.bg,
            fileInfo.border,
            fileInfo.color
          )}>
            {fileInfo.label}
          </span>
          <span className="text-[9px] font-bold text-brand-secondary/60 truncate italic">
            Uploaded by {resource.uploaderName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user?.uid === resource.uploaderId && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-3 text-brand-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        )}
        <a 
          href={resource.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 bg-brand-ink text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary transition-all shadow-md active:scale-95"
          onClick={(e) => e.stopPropagation()}
        >
          {fileInfo.label === 'YouTube' ? <PlayCircle size={14} /> : <Eye size={14} />}
          Open
        </a>
      </div>
    </div>
  );
}
