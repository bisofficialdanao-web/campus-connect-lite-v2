import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Class, UserProfile } from '../types';
import { Plus, Users, ShieldCheck, Clock, Check, X, BookOpen, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import QuizSection from '../components/QuizSection';
import { createNotification } from '../lib/notifications';

import { PageView } from '../components/BottomNav';

export default function Classes({ onViewChange }: { onViewChange: (view: PageView) => void }) {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = profile?.role === 'teacher' 
      ? query(collection(db, 'classes'), where('teacherId', '==', user.uid))
      : query(collection(db, 'classes')); // Students see all for joining
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const c: Class[] = [];
      snapshot.forEach(doc => {
        c.push({ id: doc.id, ...doc.data() } as Class);
      });
      setClasses(c);
    });
    return () => unsubscribe();
  }, [user, profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassSubject.trim() || !user) return;
    try {
      await addDoc(collection(db, 'classes'), {
        name: newClassName,
        subject: newClassSubject,
        teacherId: user.uid,
        studentIds: [],
        pendingStudentIds: [],
        createdAt: serverTimestamp()
      });
      setNewClassName('');
      setNewClassSubject('');
      setShowCreate(false);
      // Redirection as requested
      setTimeout(() => onViewChange('library'), 500); 
    } catch (error) {
      console.error("Create class failed", error);
    }
  };

  const handleJoin = async (classId: string) => {
    if (!user) return;
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      pendingStudentIds: arrayUnion(user.uid)
    });

    const targetClass = classes.find(c => c.id === classId);
    if (targetClass) {
      await createNotification({
        recipientId: targetClass.teacherId,
        senderId: user.uid,
        senderName: profile?.displayName || 'Student',
        type: 'request',
        text: `${profile?.displayName || 'A student'} wants to join your class: ${targetClass.name}`,
        link: '/classes'
      });
    }
  };

  const myClasses = profile?.role === 'teacher' 
    ? classes 
    : classes.filter(c => c.studentIds.includes(user?.uid || ''));

  const pendingClasses = classes.filter(c => c.pendingStudentIds.includes(user?.uid || ''));
  
  const availableClasses = classes.filter(c => 
    !c.studentIds.includes(user?.uid || '') && 
    !c.pendingStudentIds.includes(user?.uid || '') &&
    c.teacherId !== user?.uid
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Classes</h2>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-brand-primary text-white h-[34px] px-4 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all shadow-soft"
          >
            <Plus size={16} />
            <span className="text-[12px] font-semibold uppercase tracking-wider">New Class</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="bg-brand-surface border border-brand-border/40 rounded-xl p-4 space-y-4 shadow-soft">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary ml-1">Class Name</label>
                <input 
                  required
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Advanced Physics"
                  className="w-full bg-brand-bg border border-brand-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/30 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary ml-1">Subject</label>
                <input 
                  required
                  type="text" 
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  placeholder="e.g. Science"
                  className="w-full bg-brand-bg border border-brand-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/30 outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-ink text-white font-semibold py-2.5 rounded-lg text-sm hover:brightness-110 transition-all mt-2"
              >
                Create Class
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        {myClasses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {myClasses.map(c => (
              <ClassItem key={c.id} c={c} isJoined={true} />
            ))}
          </div>
        ) : (
          <EmptyState title="No active classes" message={profile?.role === 'teacher' ? "Start by creating your first subject-based class." : "Join a class below to access materials."} />
        )}
      </section>

      {profile?.role === 'student' && (
        <>
          {pendingClasses.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="text-orange-500" size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest">Pending Approval</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 opacity-75">
                {pendingClasses.map(c => (
                  <ClassItem key={c.id} c={c} isPending={true} />
                ))}
              </div>
            </section>
          )}

          {availableClasses.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="text-brand-primary" size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest">Join New Class</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {availableClasses.map(c => (
                  <ClassItem key={c.id} c={c} onJoin={() => handleJoin(c.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ClassItem({ c, isJoined, isPending, onJoin }: { c: Class, isJoined?: boolean, isPending?: boolean, onJoin?: () => void }) {
  const { user, profile } = useAuth();
  const [showStudents, setShowStudents] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const approveStudent = async (studentId: string) => {
    const classRef = doc(db, 'classes', c.id);
    await updateDoc(classRef, {
      studentIds: arrayUnion(studentId),
      pendingStudentIds: arrayRemove(studentId)
    });

    await createNotification({
      recipientId: studentId,
      senderId: user?.uid,
      senderName: profile?.displayName || 'Teacher',
      type: 'request',
      text: `Your request to join ${c.name} has been approved!`,
      link: '/classes'
    });
  };

  const rejectStudent = async (studentId: string) => {
    const classRef = doc(db, 'classes', c.id);
    await updateDoc(classRef, {
      pendingStudentIds: arrayRemove(studentId)
    });
  };

  return (
    <div className={cn(
      "bg-brand-surface border border-brand-border/40 rounded-xl p-4 shadow-soft transition-all",
      isExpanded ? "border-brand-primary/30" : "hover:border-brand-primary/20"
    )}>
      <div 
        className={cn("flex items-center justify-between", isJoined && "cursor-pointer")}
        onClick={() => isJoined && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center border border-brand-border/20">
            {profile?.role === 'teacher' ? <GraduationCap className="text-brand-primary" size={20} /> : <BookOpen className="text-brand-primary" size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-brand-ink text-sm leading-tight">{c.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-medium text-brand-secondary/60">
                {c.subject}
              </span>
              <span className="text-brand-border/40 text-[8px]">•</span>
              <div className="flex items-center gap-1 text-[11px] font-medium text-brand-secondary/60">
                <Users size={12} />
                {c.studentIds.length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onJoin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onJoin(); }}
              className="bg-brand-primary text-white font-semibold h-[34px] px-4 rounded-lg text-[12px] uppercase tracking-wider hover:brightness-105 transition-all shadow-soft"
            >
              Join
            </button>
          )}
          
          {isPending && (
            <div className="bg-brand-bg text-brand-secondary border border-brand-border/20 font-semibold px-3 h-[30px] flex items-center rounded-lg text-[11px] uppercase tracking-wider">
              Pending
            </div>
          )}

          {isJoined && (
            <div className="text-brand-secondary/40">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && isJoined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <QuizSection classId={c.id} isTeacher={profile?.role === 'teacher'} />
          </motion.div>
        )}
      </AnimatePresence>

      {profile?.role === 'teacher' && c.pendingStudentIds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="flex items-center justify-between mb-3">
             <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
              Join Requests ({c.pendingStudentIds.length})
             </span>
             <button onClick={() => setShowStudents(!showStudents)} className="text-[10px] font-black uppercase text-brand-primary tracking-widest hover:underline">
              {showStudents ? 'Hide' : 'Review'}
             </button>
          </div>
          <AnimatePresence>
            {showStudents && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {c.pendingStudentIds.map(sid => (
                  <div key={sid} className="flex items-center justify-between bg-brand-bg p-3 rounded-2xl border border-brand-border">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-lg bg-white border border-brand-border" />
                       <span className="text-xs font-bold truncate">Student-{sid.slice(0, 5)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => approveStudent(sid)} className="p-1.5 bg-green-500 text-white rounded-lg hover:scale-110 transition-transform"><Check size={14} /></button>
                      <button onClick={() => rejectStudent(sid)} className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, message }: { title: string, message: string }) {
  return (
    <div className="py-12 px-6 bg-brand-surface border-2 border-dashed border-brand-border rounded-3xl text-center">
      <h4 className="font-black text-brand-ink mb-1">{title}</h4>
      <p className="text-xs font-medium text-brand-secondary max-w-[200px] mx-auto leading-relaxed">{message}</p>
    </div>
  );
}
