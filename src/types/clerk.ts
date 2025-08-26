// src/types/clerk.ts

// The ClerkAccount type as used by the FRONTEND.
// Notice the secretKey is no longer here.
export interface ClerkAccount {
  id: string;
  name: string;
  apiKey: string; // This is the publishable key
  isActive: boolean;
}

// This interface is used when CREATING a new account.
// The secretKey is included here so it can be sent ONCE to the backend.
export interface NewClerkAccount {
  name: string;
  apiKey: string;
  secretKey: string;
}

export interface BulkUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string; 
}

export interface UserOperationResult {
  email: string;
  status: 'success' | 'error';
  message: string;
  userId?: string;
}

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: { email_address: string }[];
  banned: boolean;
  last_sign_in_at: number | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string | null;
  body: string;
  from_email_name: string;
  reply_to_email_name: string;
  delivered_by_clerk: boolean;
  can_revert: boolean;
  resource_type: 'user' | 'system';
  available_variables: string[];
}

// CORRECTED: Interface for a single import job's state
export type JobStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

export interface ImportJob {
  status: JobStatus;
  results: UserOperationResult[];
  progress: number;
  timeElapsed: number;
  successCount: number;
  failCount: number;
  isPausedRef: { current: boolean };
  isStoppedRef: { current: boolean };
  timerRef: { current: NodeJS.Timeout | null };
  showStats: boolean;
  userEmails: string;
  sendInvites: boolean;
  delayInSeconds: number;
  // Added missing properties
  countdown: number;
  nextUserEmail: string | null;
}