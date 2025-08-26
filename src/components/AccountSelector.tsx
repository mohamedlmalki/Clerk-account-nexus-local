import { useState, useEffect, useMemo } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NewClerkAccount } from '@/types/clerk';

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

export function AccountSelector() {
  const {
    accounts,
    activeAccount,
    addAccount,
    switchAccount,
    deleteAccount,
    isLoading,
    importJobs, // <-- Get the jobs state from the context
  } = useClerkAccounts();
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    'idle'
  );

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<object | null>(
    null
  );

  const [newAccount, setNewAccount] = useState<NewClerkAccount>({
    name: '',
    apiKey: '',
    secretKey: '',
  });

  const testConnection = async () => {
    if (!activeAccount) return;
    setConnectionStatus('testing');
    setConnectionDetails(null);
    try {
      const response = await fetch(
        'http://localhost:3001/api/accounts/test-connection-by-id',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeAccount.id }),
        }
      );
      const result = await response.json();
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('failed');
      }
      setConnectionDetails(result);
    } catch (error) {
      setConnectionStatus('failed');
      setConnectionDetails({
        error: 'Failed to fetch',
        message: (error as Error).message,
      });
      console.error('Connection test failed:', error);
    }
  };

  useEffect(() => {
    if (activeAccount) {
      testConnection();
    } else {
      setConnectionStatus('idle');
      setConnectionDetails(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount]);
  
  const getJobDisplay = (job) => {
    if (!job || job.status === 'idle') {
      return null;
    }
    const totalEmails = job.userEmails.trim()
      ? job.userEmails.trim().split('\n').filter(line => line.trim()).length
      : 0;
    const processedCount = job.successCount + job.failCount;
    const statusText = job.status.charAt(0).toUpperCase() + job.status.slice(1);
    
    return (
        <span className="ml-auto pl-4 text-xs text-muted-foreground whitespace-nowrap">
            {processedCount}/{totalEmails} {statusText}
        </span>
    );
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.apiKey || !newAccount.secretKey) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    await addAccount(newAccount);
    setNewAccount({ name: '', apiKey: '', secretKey: '' });
    setIsAddingAccount(false);
  };

  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      deleteAccount(accountId);
    }
  };

  const renderStatus = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-2 h-2 animate-spin text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Testing...
            </span>
          </div>
        );
      case 'connected':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
            onClick={() => setIsDetailsOpen(true)}
          >
            <div className="w-2 h-2 bg-success rounded-full pulse-glow" />
            <span className="text-xs font-medium text-success">Connected</span>
          </div>
        );
      case 'failed':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
            onClick={() => setIsDetailsOpen(true)}
          >
            <AlertTriangle className="w-2 h-2 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              Connection Failed
            </span>
          </div>
        );
      default:
        return <div className="h-4" />;
    }
  };
  
  const activeJob = activeAccount ? importJobs[activeAccount.id] : null;

  return (
    <div className="space-y-3">
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Raw API Response</DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-secondary rounded-md p-4 max-h-[60vh] overflow-auto">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {connectionDetails
                ? JSON.stringify(connectionDetails, null, 2)
                : 'No details available.'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Active Account
        </Label>

        {isLoading && !activeAccount ? (
          <div className="text-sm text-muted-foreground">
            Loading accounts...
          </div>
        ) : activeAccount ? (
          <Select value={activeAccount.id} onValueChange={switchAccount}>
            <SelectTrigger className="w-full bg-secondary">
              <div className="flex items-center justify-between w-full truncate">
                  <span className="truncate">{activeAccount.name}</span>
                  {getJobDisplay(activeJob)}
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              {accounts.map((account) => {
                const job = importJobs[account.id];
                return (
                    <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                                <span>{account.name}</span>
                                {account.id === activeAccount.id && (
                                <div className="w-2 h-2 bg-primary rounded-full ml-2" />
                                )}
                            </div>
                            {getJobDisplay(job)}
                        </div>
                    </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 text-center">
            No accounts configured
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Clerk Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production"
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                  className="bg-input"
                />
              </div>
              <div>
                <Label htmlFor="apiKey">Publishable Key</Label>
                <Input
                  id="apiKey"
                  placeholder="pk_test_..."
                  value={newAccount.apiKey}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, apiKey: e.target.value })
                  }
                  className="bg-input"
                />
              </div>
              <div>
                <Label htmlFor="secretKey">Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="sk_test_..."
                  value={newAccount.secretKey}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, secretKey: e.target.value })
                  }
                  className="bg-input"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAccount} className="flex-1">
                  Add Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingAccount(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {activeAccount && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteAccount(activeAccount.id)}
            className="px-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {activeAccount && (
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                {renderStatus()}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">API Key</span>
                <span className="text-xs font-mono">
                  {activeAccount.apiKey.slice(0, 8)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}