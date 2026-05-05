export type UserRole = 'teacher' | 'student';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  type: 'message' | 'announcement' | 'request' | 'quiz' | 'reaction' | 'comment';
  text: string;
  link?: string;
  isRead: boolean;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  studentIds: string[];
  pendingStudentIds: string[];
  createdAt: any;
}

export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  isAnonymous?: boolean;
  reactions: Record<string, string[]>; // e.g., "like" | "heart" | "blush" | "laugh" | "sad" | "angry"
  commentCount: number;
  isModule?: boolean;
  moduleName?: string;
  fileUrl?: string; // Kept for teacher modules only
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  reactions: Record<string, string[]>;
  createdAt: any;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  classId?: string;
  createdAt: any;
}

export interface Quiz {
  id: string;
  classId: string;
  title: string;
  questions: QuizQuestion[];
  teacherId: string;
  createdAt: any;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  teacherId: string;
  classId: string;
  createdAt: any;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted';
  createdAt: any;
  updatedAt: any;
}

export interface Presence {
  status: 'online' | 'offline';
  displayName?: string;
  lastSeen: any;
}
