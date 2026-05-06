import { addDays } from 'date-fns';

export const RETENTION_CYCLES = {
  LONG: 230, // Classes, Posts, Chats, Events, Students
  SHORT: 30, // Quizzes, Assignments, Results
};

export function calculateExpiry(days: number): Date {
  return addDays(new Date(), days);
}
