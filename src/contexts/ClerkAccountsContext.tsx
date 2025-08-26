// src/contexts/ClerkAccountsContext.tsx

import { createContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { ClerkAccount, NewClerkAccount, ImportJob, BulkUserData, UserOperationResult } from '@/types/clerk';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = 'http://localhost:3001/api';

interface ClerkAccountsContextType {
  accounts: ClerkAccount[];
  activeAccount: ClerkAccount | null;
  isLoading: boolean;
  addAccount: (account: NewClerkAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  loadAccounts: () => Promise<void>;
  importJobs: Record<string, ImportJob>;
  startImportJob: (accountId: string, users: BulkUserData[]) => void;
  pauseImportJob: (accountId: string) => void;
  resumeImportJob: (accountId: string) => void;
  stopImportJob: (accountId: string) => void;
  clearImportJob: (accountId: string) => void;
  updateJobSettings: (accountId: string, settings: Partial<ImportJob>) => void;
}

export const ClerkAccountsContext = createContext<ClerkAccountsContextType | undefined>(undefined);

const initialJobState: ImportJob = {
    status: 'idle',
    results: [],
    progress: 0,
    timeElapsed: 0,
    successCount: 0,
    failCount: 0,
    isPausedRef: { current: false },
    isStoppedRef: { current: false },
    timerRef: { current: null },
    showStats: false,
    userEmails: '',
    sendInvites: true,
    delayInSeconds: 1,
    countdown: 0,
    nextUserEmail: null,
};


export const ClerkAccountsProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<ClerkAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<ClerkAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [importJobs, setImportJobs] = useState<Record<string, ImportJob>>({});

  const jobRefs = useRef<Record<string, { isPausedRef: { current: boolean }, isStoppedRef: { current: boolean }, timerRef: { current: NodeJS.Timeout | null } }>>({}).current;


  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/accounts`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const parsedAccounts: ClerkAccount[] = await response.json();
      setAccounts(parsedAccounts);
      const active = parsedAccounts.find((acc) => acc.isActive);
      setActiveAccount(active || parsedAccounts[0] || null);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast({ title: "Error", description: "Could not load accounts.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);
  
  const updateJobState = (accountId: string, updates: Partial<ImportJob>) => {
    setImportJobs(prev => ({
        ...prev,
        [accountId]: {
            ...(prev[accountId] || initialJobState),
            ...updates,
        }
    }));
  };

  const startImportJob = async (accountId: string, users: BulkUserData[]) => {
    if (!jobRefs[accountId]) {
        jobRefs[accountId] = {
            isPausedRef: { current: false },
            isStoppedRef: { current: false },
            timerRef: { current: null },
        };
    }
    jobRefs[accountId].isPausedRef.current = false;
    jobRefs[accountId].isStoppedRef.current = false;

    const currentJobSettings = importJobs[accountId] || initialJobState;

    updateJobState(accountId, {
        status: 'running',
        results: [],
        progress: 0,
        timeElapsed: 0,
        successCount: 0,
        failCount: 0,
        showStats: true,
        countdown: 0,
        nextUserEmail: null,
    });
    
    jobRefs[accountId].timerRef.current = setInterval(() => {
        setImportJobs(prev => ({ ...prev, [accountId]: { ...prev[accountId], timeElapsed: prev[accountId].timeElapsed + 1 }}));
    }, 1000);

    const newResults: UserOperationResult[] = [];
    
    for (let i = 0; i < users.length; i++) {
        if (jobRefs[accountId].isStoppedRef.current) {
            toast({ title: "Job Ended", description: "The import process was stopped by the user." });
            break;
        }

        while (jobRefs[accountId].isPausedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (jobRefs[accountId].isStoppedRef.current) break;
        }

        if (jobRefs[accountId].isStoppedRef.current) {
            toast({ title: "Job Ended", description: "The import process was stopped by the user." });
            break;
        }
        
        // CORRECTED: Countdown logic now lives in the context
        if (i > 0 && currentJobSettings.delayInSeconds > 0) {
            updateJobState(accountId, { nextUserEmail: users[i].email, countdown: currentJobSettings.delayInSeconds });
            await new Promise<void>(resolve => {
                const interval = setInterval(() => {
                    setImportJobs(prev => {
                        const newCountdown = prev[accountId].countdown - 1;
                        if (newCountdown <= 0) {
                            clearInterval(interval);
                            resolve();
                        }
                        return { ...prev, [accountId]: { ...prev[accountId], countdown: newCountdown }};
                    });
                }, 1000);
            });
            updateJobState(accountId, { nextUserEmail: null, countdown: 0 });
        }

        const user = users[i];
        let result: UserOperationResult;
        try {
            const response = await fetch(`${API_BASE_URL}/import-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, accountId: accountId, sendInvites: currentJobSettings.sendInvites }),
            });
            result = await response.json();
            newResults.push(result);
        } catch (error) {
            result = { email: user.email, status: 'error', message: 'Failed to connect to backend.' };
            newResults.push(result);
        }
        
        setImportJobs(prev => {
            const currentJob = prev[accountId];
            return {
                ...prev,
                [accountId]: {
                    ...currentJob,
                    results: [...newResults],
                    progress: ((i + 1) / users.length) * 100,
                    successCount: result.status === 'success' ? currentJob.successCount + 1 : currentJob.successCount,
                    failCount: result.status === 'error' ? currentJob.failCount + 1 : currentJob.failCount,
                }
            };
        });
    }
    
    if (jobRefs[accountId].timerRef.current) {
        clearInterval(jobRefs[accountId].timerRef.current!);
    }
    
    updateJobState(accountId, { status: jobRefs[accountId].isStoppedRef.current ? 'stopped' : 'completed' });

    if (!jobRefs[accountId].isStoppedRef.current) {
      toast({ title: "Import Complete", description: `${newResults.filter(r => r.status === 'success').length}/${newResults.length} users processed.` });
    }
  };

  const pauseImportJob = (accountId: string) => {
    if (jobRefs[accountId]) {
        jobRefs[accountId].isPausedRef.current = true;
        updateJobState(accountId, { status: 'paused' });
        if (jobRefs[accountId].timerRef.current) {
            clearInterval(jobRefs[accountId].timerRef.current!);
        }
    }
  };

  const resumeImportJob = (accountId: string) => {
    if (jobRefs[accountId]) {
        jobRefs[accountId].isPausedRef.current = false;
        updateJobState(accountId, { status: 'running' });
        jobRefs[accountId].timerRef.current = setInterval(() => {
            setImportJobs(prev => ({ ...prev, [accountId]: { ...prev[accountId], timeElapsed: prev[accountId].timeElapsed + 1 }}));
        }, 1000);
    }
  };
  
  const stopImportJob = (accountId: string) => {
    if (jobRefs[accountId]) {
        jobRefs[accountId].isStoppedRef.current = true;
        // The loop will handle setting the status to 'stopped'
        if (jobRefs[accountId].timerRef.current) {
            clearInterval(jobRefs[accountId].timerRef.current!);
        }
    }
  };
  
  const clearImportJob = (accountId: string) => {
      updateJobState(accountId, initialJobState);
  };
  
  const updateJobSettings = (accountId: string, settings: Partial<ImportJob>) => {
      updateJobState(accountId, settings);
  };


  const addAccount = async (account: NewClerkAccount) => {
    // ... (rest of the code is unchanged)
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      if (!response.ok) throw new Error('Failed to add account');
      await loadAccounts();
      toast({ title: "Account Added", description: `${account.name} has been added successfully` });
    } catch (error) {
      console.error('Failed to save account:', error);
      toast({ title: "Error", description: "Could not save the new account.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (id: string) => {
    // ... (rest of the code is unchanged)
    setIsLoading(true);
    try {
      const accountToDelete = accounts.find(acc => acc.id === id);
      const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');
      await loadAccounts();
      if (accountToDelete) {
        toast({ title: "Account Deleted", description: `${accountToDelete.name} has been removed` });
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({ title: "Error", description: "Could not delete the account.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (id: string) => {
    // ... (rest of the code is unchanged)
    try {
      const newlySelectedAccount = accounts.find(acc => acc.id === id) || null;
      setActiveAccount(newlySelectedAccount);

      const response = await fetch(`${API_BASE_URL}/accounts/set-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to switch account');
      await loadAccounts();
    } catch (error) {
      console.error('Failed to switch account:', error);
      toast({ title: "Error", description: "Could not switch the active account.", variant: "destructive" });
      await loadAccounts();
    }
  };

  const contextValue = {
    accounts,
    activeAccount,
    isLoading,
    addAccount,
    deleteAccount,
    switchAccount,
    loadAccounts,
    importJobs,
    startImportJob,
    pauseImportJob,
    resumeImportJob,
    stopImportJob,
    clearImportJob,
    updateJobSettings
  };

  return (
    <ClerkAccountsContext.Provider value={contextValue}>
      {children}
    </ClerkAccountsContext.Provider>
  );
};