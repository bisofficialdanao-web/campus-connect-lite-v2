import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Quiz, QuizQuestion, Submission } from '../types';
import { Plus, Trash2, BookOpen, Brain, Send, X, CheckCircle2, ChevronRight, BarChart3, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { createNotification } from '../lib/notifications';

interface QuizSectionProps {
  subject: string;
  gradeLevel: number;
}

export default function QuizSection({ subject, gradeLevel }: QuizSectionProps) {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<Record<string, Submission>>({});
  const [showCreator, setShowCreator] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewResultsQuizId, setViewResultsQuizId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'quizzes'),
      where('subject', '==', subject.toLowerCase()),
      where('gradeLevel', '==', gradeLevel)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qz: Quiz[] = [];
      snapshot.forEach(doc => qz.push({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(qz.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => unsubscribe();
  }, [subject, gradeLevel]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', user.uid),
      where('subject', '==', subject.toLowerCase()),
      where('gradeLevel', '==', gradeLevel)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Record<string, Submission> = {};
      snapshot.forEach(doc => {
        const data = doc.data() as Submission;
        results[data.quizId] = data;
      });
      setUserSubmissions(results);
    });
    return () => unsubscribe();
  }, [user, subject, gradeLevel]);

  const handleDelete = async (quizId: string) => {
    if (confirm('Delete this quiz?')) {
      await deleteDoc(doc(db, 'quizzes', quizId));
      await deleteDoc(doc(db, 'quizKeys', quizId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-brand-ink uppercase tracking-tight">Available Quizzes</h3>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-1.5 h-[28px] px-3 bg-brand-primary text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-sm"
          >
            <Plus size={12} /> Create Quiz
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {quizzes.map(quiz => {
          const submission = userSubmissions[quiz.id];
          return (
            <div 
              key={quiz.id}
              className="flex items-center justify-between p-3 bg-white border border-brand-border/40 rounded-xl hover:border-brand-primary/20 transition-all shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[12px] font-bold text-brand-ink truncate">{quiz.title}</h4>
                  {submission && (
                    <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded-md text-[9px] font-bold uppercase tracking-tight border border-green-100">
                      Score: {submission.score}/{submission.totalQuestions}
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-medium text-brand-secondary/60 uppercase tracking-tight mt-0.5">
                  {quiz.questions.length} Items • {quiz.createdAt ? formatDistanceToNow(quiz.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                {isTeacher ? (
                  <>
                    <button 
                      onClick={() => setViewResultsQuizId(quiz.id)}
                      className="h-[28px] px-3 border border-brand-border/30 rounded-lg text-[9px] font-bold uppercase hover:bg-brand-bg transition-colors"
                    >
                      Results
                    </button>
                    <button 
                      onClick={() => handleDelete(quiz.id)}
                      className="p-1.5 text-brand-secondary/40 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  submission ? (
                    <div className="px-3 h-[28px] flex items-center bg-brand-bg text-brand-secondary/60 rounded-lg text-[9px] font-bold uppercase tracking-tight border border-brand-border/20">
                      Submitted
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveQuiz(quiz)}
                      className="h-[28px] px-4 bg-brand-ink text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:brightness-125 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      Start <Send size={10} />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="py-8 px-4 text-center bg-brand-surface rounded-xl border border-brand-border/40 border-dashed">
            <Brain size={24} className="mx-auto text-brand-secondary/20 mb-2" />
            <p className="text-[10px] font-bold text-brand-secondary/60 uppercase tracking-widest">
              No assignments found for this grade level.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreator && (
          <QuizCreator 
            subject={subject}
            gradeLevel={gradeLevel}
            onClose={() => setShowCreator(false)} 
          />
        )}
        {activeQuiz && (
          <QuizViewer 
            quiz={activeQuiz} 
            onClose={() => setActiveQuiz(null)} 
          />
        )}
        {viewResultsQuizId && (
          <ResultsModal 
            quizId={viewResultsQuizId} 
            onClose={() => setViewResultsQuizId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuizCreator({ subject, gradeLevel, onClose }: { subject: string, gradeLevel: number, onClose: () => void }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<any[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 15) return;
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!title.trim() || !user) return;
    setIsSaving(true);
    try {
      // 1. Separate answers from questions for security
      const cleanQuestions = questions.map(q => ({
        question: q.question,
        options: q.options
      }));
      const answers = questions.map(q => q.correctAnswer);

      // 2. Create the quiz doc (no answers)
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        title,
        questions: cleanQuestions,
        subject: subject.toLowerCase(),
        gradeLevel,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });

      // 3. Create the secret key doc
      await setDoc(doc(db, 'quizKeys', quizRef.id), {
        quizId: quizRef.id,
        answers: answers
      });

      // 4. Notifications (Optional: finding students in this grade level)
      // For now, let's just close
      onClose();
    } catch (error) {
      console.error("Quiz creation failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-brand-ink/60 transition-all" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-huge border border-brand-border/40 flex flex-col"
      >
        <div className="p-4 border-b border-brand-border/20 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-tight text-brand-ink">New {subject} Quiz</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-brand-bg rounded-lg transition-all text-brand-secondary"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-brand-secondary/60">Quiz Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Math Quiz"
              className="w-full bg-brand-bg border border-brand-border/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-primary/30 text-[12px] font-bold text-brand-ink"
            />
          </div>

          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 bg-brand-bg/30 border border-brand-border/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest">Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="text-brand-secondary/40 hover:text-red-500"><X size={14} /></button>
                  )}
                </div>
                <textarea 
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="Type your question..."
                  className="w-full bg-white border border-brand-border/20 rounded-lg px-3 py-2 text-[12px] font-medium focus:outline-none focus:border-brand-primary/30 resize-none h-[60px]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                          q.correctAnswer === oIndex ? "bg-green-500 border-green-500 text-white" : "border-brand-border/40 hover:border-green-500/50"
                        )}
                      >
                        {q.correctAnswer === oIndex && <CheckCircle2 size={12} />}
                      </button>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="w-full bg-white border border-brand-border/20 rounded-lg px-2.5 py-1.5 text-[11px] font-medium focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {questions.length < 15 && (
            <button 
              onClick={addQuestion}
              className="w-full py-3 border border-dashed border-brand-border/40 rounded-xl text-brand-secondary/60 font-bold text-[10px] uppercase tracking-wider hover:bg-brand-bg transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Add Question
            </button>
          )}
        </div>

        <div className="p-4 border-t border-brand-border/20">
          <button 
            onClick={handleSave}
            disabled={isSaving || !title.trim() || questions.length === 0}
            className="w-full bg-brand-primary text-white font-bold h-[40px] rounded-xl flex items-center justify-center gap-2 hover:brightness-110 shadow-sm disabled:opacity-50 text-[11px] uppercase tracking-wider"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publish Quiz
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizViewer({ quiz, onClose }: { quiz: Quiz, onClose: () => void }) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // 1. Fetch secret key for calculation
      const keySnap = await getDoc(doc(db, 'quizKeys', quiz.id));
      if (!keySnap.exists()) throw new Error("Quiz key missing");
      
      const sessionKey = keySnap.data().answers;
      let finalScore = 0;
      quiz.questions.forEach((_q, idx) => {
        if (answers[idx] === sessionKey[idx]) finalScore++;
      });

      // 2. Save submission
      if (user && profile) {
        await addDoc(collection(db, 'submissions'), {
          quizId: quiz.id,
          studentId: user.uid,
          studentName: profile.displayName || user.email,
          quizTitle: quiz.title,
          score: finalScore,
          totalQuestions: quiz.questions.length,
          subject: quiz.subject,
          gradeLevel: quiz.gradeLevel,
          timestamp: serverTimestamp()
        });

        // 3. Score summary UI
        setScore(finalScore);
        setShowResult(true);
      }
    } catch (error) {
      console.error("Quiz submission failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (showResult) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 text-left"
      >
        <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div 
          initial={{ y: 20, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          className="relative bg-white w-full max-w-sm rounded-2xl p-6 text-center border border-brand-border/40 shadow-huge"
        >
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h3 className="text-[14px] font-bold mb-1 tracking-tight">Quiz Submitted!</h3>
          <p className="text-[11px] font-medium text-brand-secondary mb-5">Your score has been recorded securely.</p>
          <div className="bg-brand-bg/50 border border-brand-border/20 rounded-xl p-5 mb-6">
            <p className="text-[9px] font-bold uppercase text-brand-secondary/60 tracking-widest mb-1">Final Score</p>
            <p className="text-3xl font-black text-brand-ink">{score} / {quiz.questions.length}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-brand-ink text-white font-bold h-[40px] rounded-xl hover:brightness-125 transition-all text-[11px] uppercase tracking-wider"
          >
            Close Results
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const q = quiz.questions[currentStep];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 text-left"
    >
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-white w-full max-w-md rounded-2xl overflow-hidden border border-brand-border/40 shadow-huge"
      >
        <div className="p-4 border-b border-brand-border/20 bg-brand-bg/50 flex items-center justify-between">
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-brand-ink truncate uppercase tracking-tight">{quiz.title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold text-brand-secondary/60">Q{currentStep + 1} OF {quiz.questions.length}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-border/20 rounded-md transition-all text-brand-secondary"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="w-full bg-brand-bg rounded-full h-1.5 overflow-hidden border border-brand-border/10">
            <motion.div 
              className="h-full bg-brand-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>

          <h3 className="text-[12px] font-bold text-brand-ink leading-relaxed">
            {q.question}
          </h3>

          <div className="space-y-2">
            {q.options.map((opt, idx) => (
              <button 
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentStep]: idx })}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-left text-[11px] font-medium border transition-all active:scale-[0.99]",
                  answers[currentStep] === idx 
                    ? "bg-brand-primary/5 text-brand-primary border-brand-primary/40 shadow-sm" 
                    : "bg-brand-bg/30 border-brand-border/10 text-brand-secondary hover:border-brand-primary/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all",
                    answers[currentStep] === idx ? "bg-brand-primary text-white border-brand-primary" : "border-brand-border/40 text-brand-secondary/40"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {opt}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-brand-border/20 bg-brand-bg/30 flex gap-2">
          <button 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex-1 h-[36px] border border-brand-border/30 rounded-lg text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 transition-all hover:bg-white"
          >
            Prev
          </button>
          {currentStep === quiz.questions.length - 1 ? (
            <button 
              disabled={answers[currentStep] === undefined || isSaving}
              onClick={handleFinish}
              className="flex-[2] h-[36px] bg-brand-primary text-white rounded-lg text-[9px] font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Finish Quiz
            </button>
          ) : (
            <button 
              disabled={answers[currentStep] === undefined}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex-[2] h-[36px] bg-brand-ink text-white rounded-lg text-[9px] font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm"
            >
              Next
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResultsModal({ quizId, onClose }: { quizId: string, onClose: () => void }) {
  const [results, setResults] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('quizId', '==', quizId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res: Submission[] = [];
      snapshot.forEach(doc => res.push({ id: doc.id, ...doc.data() } as Submission));
      setResults(res.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [quizId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 text-left"
    >
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-white w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-brand-border/40 shadow-huge flex flex-col"
      >
        <div className="p-4 border-b border-brand-border/20 flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-bold tracking-tight uppercase">Quiz Gradebook</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-border/20 rounded-md transition-all text-brand-secondary"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-2">
          {loading ? (
            <div className="py-8 text-center text-[10px] font-bold text-brand-secondary/40 uppercase tracking-widest">Fetching scores...</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={24} className="mx-auto text-brand-secondary/20 mb-2" />
              <p className="text-[9px] font-bold uppercase text-brand-secondary/60 tracking-widest">No submissions yet</p>
            </div>
          ) : (
            results.map(res => (
              <div key={res.id} className="flex items-center justify-between p-3 bg-brand-bg/30 border border-brand-border/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-brand-border/20 font-bold text-brand-primary text-[10px] uppercase">
                    {res.studentName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-brand-ink">{res.studentName}</p>
                    <p className="text-[9px] font-medium text-brand-secondary/60 uppercase tracking-tight">
                      {res.timestamp ? formatDistanceToNow(res.timestamp.toDate(), { addSuffix: true }) : 'Recently'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-black text-brand-ink">{res.score} <span className="text-[9px] font-bold text-brand-secondary/40">/ {res.totalQuestions}</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
