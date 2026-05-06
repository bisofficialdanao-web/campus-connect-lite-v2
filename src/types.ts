export type UserRole = 'teacher' | 'student';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  type: 'message' | 'announcement' | 'request' | 'quiz' | 'reaction' | 'comment' | 'class_request' | 'system';
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
  bio?: string;
  // School ID fields
  lrn?: string;
  section?: string;
  degree?: string;
  major?: string;
  subjects?: string[];
  yearsInService?: number;
  gradeLevel?: number;
  createdAt: any;
  updatedAt: any;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: 'post' | 'comment' | 'reaction' | 'quiz_complete' | 'class_create';
  content: string;
  targetId?: string; // id of the post/quiz/class
  targetName?: string; // title of post/quiz
  targetContent?: string; // preview of original post for comments
  timestamp: any;
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
  senderPhoto?: string;
  receiverId?: string;
  classId?: string;
  reactions?: Record<string, string[]>; // emoji key -> array of uids
  isEdited?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface Quiz {
  id: string;
  classId?: string;
  title: string;
  questions: QuizQuestion[];
  teacherId: string;
  subject: string;
  gradeLevel: number;
  createdAt: any;
}

export interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizKey {
  quizId: string;
  answers: number[];
}

export interface Submission {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  subject: string;
  gradeLevel: number;
  timestamp: any;
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
