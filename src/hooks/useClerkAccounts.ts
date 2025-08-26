// src/hooks/useClerkAccounts.ts

import { useContext } from 'react';
import { ClerkAccountsContext } from '@/contexts/ClerkAccountsContext';

// This hook now provides access to the shared context.
export function useClerkAccounts() {
  const context = useContext(ClerkAccountsContext);
  if (context === undefined) {
    throw new Error('useClerkAccounts must be used within a ClerkAccountsProvider');
  }
  return context;
}