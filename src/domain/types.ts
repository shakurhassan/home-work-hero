export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  email: string;
  isReviewer: boolean;
}

export type SubmissionStatus = 'ASSIGNED' | 'AWAITING_REVIEW' | 'NEEDS_REVISION' | 'CLOSED';
export type Decision = 'APPROVED' | 'NOT_APPROVED';
export type NextAction = 'CONTINUE' | 'REPEAT' | 'CORRECT' | 'DONE';

export interface Review {
  id: string;
  reviewerId: PersonId;
  decision: Decision;
  score: number;
  nextAction: NextAction;
  comment: string;
  reviewedAt: string;
}

export interface Attempt {
  id: string;
  answer: string;
  submittedAt: string;
  review: Review | null;
}

export interface Submission {
  id: string;
  studentId: PersonId;
  reviewerId: PersonId;
  question: string;
  status: SubmissionStatus;
  createdBy: PersonId;
  createdAt: string;
  attempts: Attempt[];
}

export interface AppState {
  people: Person[];
  submissions: Submission[];
}
