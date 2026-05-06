import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Class, UserProfile } from '../types';
import { Plus, Users, ShieldCheck, Clock, Check, X, BookOpen, GraduationCap, ChevronDown, ChevronUp, Languages, Flag, Calculator, Atom, Hammer, Globe, Heart, Palette, ChevronLeft, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import QuizSection from '../components/QuizSection';
import { createNotification } from '../lib/notifications';

import { PageView } from '../components/BottomNav';

type TabType = 'my-classes' | 'assignments';

const SUBJECTS = [
  { id: 'english', name: 'English', icon: Languages, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'filipino', name: 'Filipino', icon: Flag, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
  { id: 'math', name: 'Math', icon: Calculator, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { id: 'science', name: 'Science', icon: Atom, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { id: 'tle', name: 'TLE', icon: Hammer, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  { id: 'ap', name: 'Araling Panlipunan', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' },
  { id: 'esp', name: 'ESP', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' },
  { id: 'mapeh', name: 'MAPeH', icon: Palette, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
];

const GRADES = [7, 8, 9, 10];

export default function Classes({ onViewChange, onViewUser }: { onViewChange: (view: PageView) => void, onViewUser: (uid: string) => void }) {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  
  const [activeTab, setActiveTab] = useState<TabType>('my-classes');
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

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
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold tracking-tight text-brand-ink/40 uppercase">Classroom</h2>
        {profile?.role === 'teacher' && activeTab === 'my-classes' && (
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-brand-primary text-white h-[32px] px-3 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all shadow-soft"
          >
            <Plus size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">New Class</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border/20">
        <button 
          onClick={() => setActiveTab('my-classes')}
          className={cn(
            "px-4 py-3 text-[12px] font-bold transition-all relative",
            activeTab === 'my-classes' ? "text-brand-ink" : "text-brand-secondary/60 hover:text-brand-anchor"
          )}
        >
          My Classes
          {activeTab === 'my-classes' && (
            <motion.div layoutId="activeClassTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary" />
          )}
        </button>
        <button 
          onClick={() => {
            setActiveTab('assignments');
            setSelectedSubject(null);
            setSelectedGrade(null);
          }}
          className={cn(
            "px-4 py-3 text-[12px] font-bold transition-all relative",
            activeTab === 'assignments' ? "text-brand-ink" : "text-brand-secondary/60 hover:text-brand-anchor"
          )}
        >
          Assignments
          {activeTab === 'assignments' && (
            <motion.div layoutId="activeClassTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary" />
          )}
        </button>
      </div>

      <div className="mt-2 text-left">
        {activeTab === 'my-classes' ? (
          <>
            <AnimatePresence>
              {showCreate && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <form onSubmit={handleCreate} className="bg-brand-surface border border-brand-border/40 rounded-xl p-4 space-y-4 shadow-soft">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary ml-1">Class Name</label>
                        <input 
                          required
                          type="text" 
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          placeholder="e.g. Advanced Physics"
                          className="w-full bg-brand-bg border border-brand-border/30 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-primary/30 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary ml-1">Subject</label>
                        <input 
                          required
                          type="text" 
                          value={newClassSubject}
                          onChange={(e) => setNewClassSubject(e.target.value)}
                          placeholder="e.g. Science"
                          className="w-full bg-brand-bg border border-brand-border/30 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-primary/30 outline-none"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-brand-ink text-white font-bold h-[36px] rounded-lg text-[11px] uppercase tracking-wider hover:brightness-110 transition-all"
                    >
                      Create Class
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <section className="space-y-3">
              {myClasses.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {myClasses.map(c => (
                    <ClassItem key={c.id} c={c} isJoined={true} onViewUser={onViewUser} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No active classes" message={profile?.role === 'teacher' ? "Start by creating your first subject-based class." : "Join a class below to access materials."} />
              )}
            </section>

            {profile?.role === 'student' && (
              <div className="space-y-6 mt-6">
                {pendingClasses.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="text-orange-500" size={14} />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Pending Approval</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 opacity-75">
                      {pendingClasses.map(c => (
                        <ClassItem key={c.id} c={c} isPending={true} onViewUser={onViewUser} />
                      ))}
                    </div>
                  </section>
                )}

                {availableClasses.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Plus className="text-brand-primary" size={14} />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Join New Class</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {availableClasses.map(c => (
                        <ClassItem key={c.id} c={c} onJoin={() => handleJoin(c.id)} onViewUser={onViewUser} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {!selectedSubject ? (
              /* Subject Grid */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SUBJECTS.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-[1.02] shadow-soft",
                      sub.bg, sub.border
                    )}
                  >
                    <div className={cn("p-2.5 rounded-lg bg-white mb-3 shadow-sm", sub.color)}>
                      <sub.icon size={20} />
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 text-center leading-tight">
                      {sub.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : !selectedGrade ? (
              /* Grade Folders */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedSubject(null)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase text-brand-secondary hover:text-brand-ink transition-colors"
                  >
                    <ChevronLeft size={12} /> Back to Subjects
                  </button>
                  <div className="flex items-center gap-2">
                    <selectedSubject.icon size={12} className={selectedSubject.color} />
                    <span className="text-[12px] font-bold">{selectedSubject.name}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {GRADES.map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className="flex items-center gap-3 p-3 bg-white border border-brand-border/40 rounded-xl hover:border-brand-primary/20 transition-all group shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center text-brand-secondary group-hover:text-brand-primary transition-colors">
                        <Folder size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-[12px] font-bold text-brand-ink">Grade {grade}</p>
                        <p className="text-[11px] font-medium text-brand-secondary/60">View assignments for this grade</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Assignments List */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedGrade(null)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase text-brand-secondary hover:text-brand-ink transition-colors"
                  >
                    <ChevronLeft size={12} /> Back to Grades
                  </button>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-brand-secondary uppercase tracking-tight">
                    <span>{selectedSubject.name}</span>
                    <span>•</span>
                    <span>Grade {selectedGrade}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <QuizSection 
                    subject={selectedSubject.id} 
                    gradeLevel={selectedGrade} 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassItem({ c, isJoined, isPending, onJoin, onViewUser }: { c: Class, isJoined?: boolean, isPending?: boolean, onJoin?: () => void, onViewUser: (uid: string) => void }) {
  const { user, profile } = useAuth();
  const [showStudents, setShowStudents] = useState(false);
  const [showMasterList, setShowMasterList] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [joinedStudents, setJoinedStudents] = useState<UserProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (isExpanded && c.studentIds.length > 0 && joinedStudents.length === 0) {
      const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
          // Fetch profiles in chunks of 10 if needed, but for now simple loop or single query
          // Firestore doesn't support 'where in' for more than 30 IDs easily
          const profiles: UserProfile[] = [];
          for (const sid of c.studentIds) {
             const docSnap = await getDoc(doc(db, 'users', sid));
             if (docSnap.exists()) {
               profiles.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
             }
          }
          setJoinedStudents(profiles);
        } catch (error) {
          console.error("Error fetching students:", error);
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [isExpanded, c.studentIds]);

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
      "bg-white border border-brand-border/40 rounded-xl p-3 shadow-soft transition-all",
      isExpanded ? "border-brand-primary/30" : "hover:border-brand-primary/20"
    )}>
      <div 
        className={cn("flex items-center justify-between", isJoined && "cursor-pointer")}
        onClick={() => isJoined && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-bg rounded-lg flex items-center justify-center border border-brand-border/20">
            {profile?.role === 'teacher' ? <GraduationCap className="text-brand-primary" size={16} /> : <BookOpen className="text-brand-primary" size={16} />}
          </div>
          <div>
            <h4 className="font-bold text-brand-ink text-[12px] leading-tight">{c.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-brand-secondary/60">
                {c.subject}
              </span>
              <span className="text-brand-border/40 text-[8px]">•</span>
              <div className="flex items-center gap-1 text-[9px] font-medium text-brand-secondary/60 uppercase tracking-tight">
                <Users size={10} />
                {c.studentIds.length} Students
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onJoin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onJoin(); }}
              className="bg-brand-primary text-white font-bold h-[30px] px-4 rounded-lg text-[10px] uppercase tracking-wider hover:brightness-105 transition-all shadow-soft"
            >
              Join
            </button>
          )}
          
          {isPending && (
            <div className="bg-brand-bg text-brand-secondary border border-brand-border/20 font-bold px-3 h-[28px] flex items-center rounded-lg text-[9px] uppercase tracking-wider">
              Pending
            </div>
          )}

          {isJoined && (
            <div className="text-brand-secondary/40">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
            className="overflow-hidden mt-3 pt-3 border-t border-brand-border/10 space-y-4"
          >
            {/* Master List of Students */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black uppercase text-brand-secondary/60 tracking-widest flex items-center gap-1.5">
                  <Users size={12} className="text-brand-primary" />
                  Class Roster ({c.studentIds.length})
                </h5>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMasterList(!showMasterList); }}
                  className="text-[9px] font-bold uppercase text-brand-primary tracking-tight h-[22px] px-2 flex items-center rounded-md hover:bg-brand-primary/5 transition-colors"
                >
                  {showMasterList ? 'Hide List' : 'Show List'}
                </button>
              </div>

              <AnimatePresence>
                {showMasterList && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="grid grid-cols-1 gap-1.5"
                  >
                    {loadingStudents ? (
                      <div className="py-4 text-center text-[9px] font-bold text-brand-secondary/40 uppercase animate-pulse">Loading members...</div>
                    ) : joinedStudents.length > 0 ? (
                      joinedStudents.map(student => (
                        <div key={student.uid} className="flex items-center justify-between p-2 bg-brand-bg/50 border border-brand-border/10 rounded-lg">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onViewUser(student.uid)}
                          >
                            <div className="w-6 h-6 rounded-md bg-white border border-brand-border/20 flex items-center justify-center overflow-hidden">
                              {student.photoURL ? (
                                <img src={student.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-brand-secondary/40">{student.displayName?.charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-brand-ink">{student.displayName}</span>
                          </div>
                          {student.role === 'teacher' && <ShieldCheck size={12} className="text-brand-primary" />}
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-[9px] font-bold text-brand-secondary/40 uppercase">No students have joined yet</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="py-4 text-center bg-brand-bg rounded-xl border border-dashed border-brand-border/20">
               <p className="text-[10px] font-bold text-brand-secondary/60 uppercase tracking-widest">
                 View assignments in the library tab
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {profile?.role === 'teacher' && c.pendingStudentIds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-brand-border/10">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
              Join Requests ({c.pendingStudentIds.length})
             </span>
             <button onClick={() => setShowStudents(!showStudents)} className="text-[9px] font-black uppercase text-brand-primary tracking-widest hover:underline">
              {showStudents ? 'Hide' : 'Review'}
             </button>
          </div>
          <AnimatePresence>
            {showStudents && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1.5"
              >
                {c.pendingStudentIds.map(sid => (
                  <div key={sid} className="flex items-center justify-between bg-brand-bg p-2 rounded-lg border border-brand-border/20">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded bg-white border border-brand-border/20" />
                       <span className="text-[11px] font-bold truncate">Student-{sid.slice(0, 5)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => approveStudent(sid)} className="p-1.5 bg-green-500 text-white rounded-md hover:scale-105 transition-transform"><Check size={10} /></button>
                      <button onClick={() => rejectStudent(sid)} className="p-1.5 bg-red-500 text-white rounded-md hover:scale-105 transition-transform"><X size={10} /></button>
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
    <div className="py-10 px-6 bg-brand-surface border-2 border-dashed border-brand-border/40 rounded-xl text-center">
      <h4 className="font-bold text-brand-ink text-[12px] mb-1">{title}</h4>
      <p className="text-[11px] font-medium text-brand-secondary/60 max-w-[200px] mx-auto leading-relaxed">{message}</p>
    </div>
  );
}

