import { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Assignee {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
  uploadedAt: Timestamp;
}

export interface ActivityLog {
  id: string;
  action: 'create' | 'update' | 'status_change' | 'comment' | 'assign' | 'upload';
  details: string;
  userId: string;
  userDisplayName: string;
  userPhoto?: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  visibility: 'public' | 'private'; // New field
  deadline?: Timestamp | Date | null;
  assignees?: Assignee[];
  attachments?: Attachment[];
  createdBy?: string;
  companyId: string;
  createdAt?: Timestamp;
}

export interface Column {
  id: TaskStatus;
  title: string;
}

export const TASK_STATUSES: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];