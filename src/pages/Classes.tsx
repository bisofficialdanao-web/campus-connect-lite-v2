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

export default function Classes() {
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
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Your Classes</h2>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-brand-primary text-white p-3 rounded-2xl flex items-center gap-2 hover:scale-95 transition-all shadow-lg"
          >
            <Plus size={20} />
            <span className="text-xs font-black uppercase tracking-widest">New Class</span>
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
            <form onSubmit={handleCreate} className="bg-brand-surface border-2 border-brand-primary/20 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Class Name</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Advanced Physics"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Subject</label>
                <input 
                  type="text" 
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  placeholder="e.g. Science"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-ink text-white font-black py-4 rounded-2xl hover:scale-[0.98] transition-all"
              >
                Launch Classroom
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
      "bg-brand-surface border-2 rounded-3xl p-5 shadow-sm transition-all",
      isExpanded ? "border-brand-primary ring-4 ring-brand-primary/5" : "border-brand-border hover:border-brand-primary/30"
    )}>
      <div 
        className={cn("flex items-center justify-between", isJoined && "cursor-pointer")}
        onClick={() => isJoined && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center border border-brand-border shadow-inner">
            {profile?.role === 'teacher' ? <GraduationCap className="text-brand-primary" /> : <BookOpen className="text-brand-primary" />}
          </div>
          <div>
            <h4 className="font-black text-brand-ink text-lg">{c.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black bg-brand-bg px-2 py-0.5 rounded text-brand-secondary uppercase tracking-widest">
                {c.subject}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-brand-secondary">
                <Users size={12} />
                {c.studentIds.length} Student{c.studentIds.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onJoin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onJoin(); }}
              className="bg-brand-primary text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest hover:scale-95 transition-all shadow-md"
            >
              Join
            </button>
          )}
          
          {isPending && (
            <div className="bg-orange-50 text-orange-500 border border-orange-100 font-black px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest">
              Pending
            </div>
          )}

          {isJoined && (
            <div className="text-brand-secondary">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
