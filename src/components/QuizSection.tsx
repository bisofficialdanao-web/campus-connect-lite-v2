import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Quiz, QuizQuestion, QuizResult } from '../types';
import { Plus, Trash2, BookOpen, Brain, Send, X, CheckCircle2, ChevronRight, BarChart3, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { createNotification } from '../lib/notifications';
import { getDoc } from 'firebase/firestore';

interface QuizSectionProps {
  classId: string;
  isTeacher: boolean;
}

export default function QuizSection({ classId, isTeacher }: QuizSectionProps) {
  const { user, profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userResults, setUserResults] = useState<Record<string, QuizResult>>({});
  const [showCreator, setShowCreator] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewResultsQuizId, setViewResultsQuizId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'quizzes'),
      where('classId', '==', classId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qz: Quiz[] = [];
      snapshot.forEach(doc => qz.push({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(qz.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!user || isTeacher) return;
    const q = query(
      collection(db, 'quizResults'),
      where('studentId', '==', user.uid),
      where('classId', '==', classId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Record<string, QuizResult> = {};
      snapshot.forEach(doc => {
        const data = doc.data() as QuizResult;
        results[data.quizId] = data;
      });
      setUserResults(results);
    });
    return () => unsubscribe();
  }, [user, isTeacher, classId]);

  const handleDelete = async (quizId: string) => {
    if (confirm('Delete this quiz?')) {
      await deleteDoc(doc(db, 'quizzes', quizId));
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-brand-border space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-brand-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink">Class Quizzes</h3>
        </div>
        {isTeacher && (
          <button 
            onClick={() => setShowCreator(true)}
            className="p-1 px-3 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1"
          >
            <Plus size={14} /> Create
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {quizzes.map(quiz => {
          const result = userResults[quiz.id];
          return (
            <div 
              key={quiz.id}
              className="flex items-center justify-between p-4 bg-brand-bg border border-brand-border rounded-2xl group hover:border-brand-primary transition-all"
            >
              <button 
                onClick={() => setActiveQuiz(quiz)}
                className="flex-1 flex items-center gap-3 text-left outline-none"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-brand-border text-brand-primary shadow-sm group-hover:scale-110 transition-transform">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-brand-ink truncate">{quiz.title}</h4>
                    {result && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> {result.score}/{result.totalQuestions}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                    {quiz.questions.length} Questions • {quiz.createdAt ? formatDistanceToNow(quiz.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </p>
                </div>
                <ChevronRight size={16} className="ml-2 text-brand-border group-hover:text-brand-primary transition-colors shrink-0" />
              </button>
              
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {isTeacher && (
                  <>
                    <button 
                      onClick={() => setViewResultsQuizId(quiz.id)}
                      className="p-2 text-brand-secondary hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-all"
                      title="View Results"
                    >
                      <BarChart3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2 text-brand-secondary hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                      title="Delete Quiz"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="py-12 text-center bg-brand-bg rounded-2xl border-2 border-dashed border-brand-border">
            <Brain size={32} className="mx-auto text-brand-border mb-3" />
            <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest leading-relaxed"> No quizzes available yet.<br/>Teachers can create one to start testing!</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreator && (
          <QuizCreator 
            classId={classId} 
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

function QuizCreator({ classId, onClose }: { classId: string, onClose: () => void }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
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
      const quizDoc = await addDoc(collection(db, 'quizzes'), {
        classId,
        title,
        questions,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });

      // Notify students
      const classSnap = await getDoc(doc(db, 'classes', classId));
      if (classSnap.exists()) {
        const classData = classSnap.data();
        const studentIds = classData.studentIds || [];
        for (const sid of studentIds) {
          await createNotification({
            recipientId: sid,
            senderId: user.uid,
            senderName: profile?.displayName || 'Teacher',
            type: 'quiz',
            text: `New quiz available in ${classData.name}: ${title}`,
            link: '/classes'
          });
        }
      }

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
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-brand-surface w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col border-2 border-brand-border"
      >
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-bg">
          <h3 className="text-xl font-black tracking-tight">Create Quiz</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Quiz Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Physics Assessment"
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand-primary font-bold"
            />
          </div>

          <div className="space-y-8">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 bg-brand-bg border border-brand-border rounded-2xl relative space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-brand-primary text-white px-3 py-1 rounded-lg uppercase tracking-widest">Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="text-brand-secondary hover:text-red-500"><X size={16} /></button>
                  )}
                </div>
                <textarea 
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="Type your question..."
                  className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                />
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          q.correctAnswer === oIndex ? "bg-green-500 border-green-500 text-white" : "border-brand-border"
                        )}
                      >
                        {q.correctAnswer === oIndex && <CheckCircle2 size={14} />}
                      </button>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1 bg-white border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-brand-border rounded-2xl text-brand-secondary font-black text-xs uppercase tracking-widest hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Question
          </button>
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-bg">
          <button 
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="w-full bg-brand-primary text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
          >
            <Send size={18} />
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
    let finalScore = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) finalScore++;
    });
    setScore(finalScore);
    setShowResult(true);

    if (user && profile) {
      setIsSaving(true);
      try {
        await addDoc(collection(db, 'quizResults'), {
          quizId: quiz.id,
          studentId: user.uid,
          studentName: profile.displayName || user.email,
          score: finalScore,
          totalQuestions: quiz.questions.length,
          teacherId: quiz.teacherId,
          classId: quiz.classId,
          createdAt: serverTimestamp()
        });

        // Notify teacher
        await createNotification({
          recipientId: quiz.teacherId,
          senderId: user.uid,
          senderName: profile.displayName || 'A student',
          type: 'quiz',
          text: `${profile.displayName || 'A student'} completed the quiz "${quiz.title}" with a score of ${finalScore}/${quiz.questions.length}`,
          link: '/classes'
        });
      } catch (error) {
        console.error("Failed to save quiz result:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (showResult) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-brand-ink/80" onClick={onClose} />
        <motion.div 
          initial={{ y: 20, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          className="relative bg-brand-surface w-full max-w-sm rounded-[32px] p-8 text-center border-2 border-brand-border shadow-2xl"
        >
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-brand-primary" />
          </div>
          <h3 className="text-2xl font-black mb-2 tracking-tight">Quiz Completed!</h3>
          <p className="text-brand-secondary font-medium mb-6">Excellent work! You've finished the assessment.</p>
          <div className="bg-brand-bg border border-brand-border rounded-2xl p-6 mb-8">
            <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-1">Your Score</p>
            <p className="text-4xl font-black text-brand-ink">{score} / {quiz.questions.length}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-brand-ink text-white font-black py-4 rounded-xl hover:scale-[0.98] transition-all"
          >
            Back to Class
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-brand-surface w-full max-w-sm rounded-[32px] overflow-hidden border-2 border-brand-border shadow-2xl"
      >
        <div className="p-6 border-b border-brand-border bg-brand-bg flex items-center justify-between">
          <div className="flex flex-col">
            <h4 className="text-sm font-black truncate max-w-[200px]">{quiz.title}</h4>
            <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest mt-0.5">Question {currentStep + 1} of {quiz.questions.length}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="w-full bg-brand-bg rounded-2xl h-2 overflow-hidden border border-brand-border">
            <motion.div 
              className="h-full bg-brand-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>

          <h3 className="text-lg font-black text-brand-ink leading-tight min-h-[60px]">
            {q.question}
          </h3>

          <div className="space-y-3">
            {q.options.map((opt, idx) => (
              <button 
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentStep]: idx })}
                className={cn(
                  "w-full p-4 rounded-2xl text-left text-sm font-bold border-2 transition-all active:scale-[0.98]",
                  answers[currentStep] === idx 
                    ? "bg-brand-primary text-white border-brand-primary shadow-lg ring-4 ring-brand-primary/10" 
                    : "bg-brand-bg border-brand-border text-brand-ink hover:border-brand-primary/50"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-bg flex gap-3">
          <button 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex-1 py-3 border border-brand-border rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-white"
          >
            Prev
          </button>
          {currentStep === quiz.questions.length - 1 ? (
            <button 
              disabled={answers[currentStep] === undefined || isSaving}
              onClick={handleFinish}
              className="flex-[2] py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md hover:scale-[0.98]"
            >
              {isSaving ? 'Saving...' : 'Finish Quiz'}
            </button>
          ) : (
            <button 
              disabled={answers[currentStep] === undefined}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex-[2] py-3 bg-brand-ink text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md hover:scale-[0.98]"
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
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'quizResults'),
      where('quizId', '==', quizId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res: QuizResult[] = [];
      snapshot.forEach(doc => res.push({ id: doc.id, ...doc.data() } as QuizResult));
      setResults(res.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [quizId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative bg-brand-surface w-full max-w-lg max-h-[80vh] overflow-hidden rounded-[32px] border-2 border-brand-border shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-bg">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-brand-primary" />
            <h3 className="text-lg font-black tracking-tight">Quiz Results</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-brand-secondary font-bold text-xs uppercase tracking-widest">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={32} className="mx-auto text-brand-border mb-3" />
              <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest">No students have taken this quiz yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(res => (
                <div key={res.id} className="flex items-center justify-between p-4 bg-brand-bg border border-brand-border rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-brand-border font-black text-brand-primary text-xs uppercase">
                      {res.studentName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-brand-ink">{res.studentName}</p>
                      <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">
                        {res.createdAt ? formatDistanceToNow(res.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-brand-ink">{res.score} / {res.totalQuestions}</p>
                    <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
