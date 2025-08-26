import { useState, useEffect } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { User, UserOperationResult } from '@/types/clerk';
import { Users, Trash2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

export default function UserManagement() {
  const { activeAccount } = useClerkAccounts();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [deletionResults, setDeletionResults] = useState<UserOperationResult[]>([]);
  const [progress, setProgress] = useState(0);

  const fetchUsers = async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    setDeletionResults([]);
    setSelectedUsers([]);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${activeAccount.id}`);
      const data = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: data.errors?.[0]?.long_message || "Failed to fetch users.", variant: "destructive" });
        setUsers([]);
      } else {
        setUsers(data);
      }
    } catch (error) {
      toast({ title: "Network Error", description: "Could not connect to the backend.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const deleteUsers = async () => {
    if (!activeAccount) return;

    const usersToDelete = selectedUsers.length > 0 
        ? users.filter(user => selectedUsers.includes(user.id)) 
        : users;

    if (usersToDelete.length === 0) {
        toast({ title: "No Users to Delete", description: "Please select users to delete.", variant: "destructive"});
        return;
    }
    
    setIsDeleting(true);
    setDeletionResults([]);
    setProgress(0);

    const newResults: UserOperationResult[] = [];
    for (let i = 0; i < usersToDelete.length; i++) {
      const user = usersToDelete[i];
      try {
        const response = await fetch(`http://localhost:3001/api/users/${activeAccount.id}/${user.id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        newResults.push({
            email: user.email_addresses[0]?.email_address || user.id,
            ...result
        });
      } catch (error) {
        newResults.push({
            email: user.email_addresses[0]?.email_address || user.id,
            status: 'error',
            message: 'Failed to connect to backend.'
        });
      }
      setDeletionResults([...newResults]);
      setProgress(((i + 1) / usersToDelete.length) * 100);
    }

    toast({ title: "Deletion Complete", description: `${newResults.filter(r => r.status === 'success').length} users deleted.` });
    setIsDeleting(false);
    fetchUsers();
  };

  useEffect(() => {
    if (activeAccount) {
      fetchUsers();
    }
  }, [activeAccount]);

  // --- THIS CHECK IS NOW AT THE TOP ---
  // It acts as a "guard clause" to prevent rendering the rest of the component
  // if there's no active account yet.
  if (!activeAccount) {
    return (
      <div className="p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-warning" />No Account Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select an account to manage users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usersToDeleteCount = selectedUsers.length > 0 ? selectedUsers.length : users.length;
  const deleteButtonText = selectedUsers.length > 0 ? `Delete ${selectedUsers.length} Selected` : 'Delete All Users';

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3"><Users className="w-8 h-8 text-primary" />User Management</h1>
            <p className="text-muted-foreground">Viewing and managing users for {activeAccount.name}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading || isDeleting || users.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteButtonText}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {usersToDeleteCount} user(s) from the "{activeAccount.name}" Clerk account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteUsers}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>All Users ({users.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading || isDeleting}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="text-center py-8">Loading users...</div>
            ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox
                                checked={selectedUsers.length === users.length && users.length > 0}
                                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Sign In</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length > 0 ? users.map(user => (
                        <TableRow key={user.id} data-state={selectedUsers.includes(user.id) && "selected"}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedUsers.includes(user.id)}
                                    onCheckedChange={(checked) => handleSelectUser(user.id, Boolean(checked))}
                                    aria-label={`Select user ${user.id}`}
                                />
                            </TableCell>
                            <TableCell className="font-mono">{user.email_addresses[0]?.email_address || 'N/A'}</TableCell>
                            <TableCell>{user.first_name || ''} {user.last_name || ''}</TableCell>
                            <TableCell>{user.banned ? <Badge variant="destructive">Banned</Badge> : <Badge className="bg-success">Active</Badge>}</TableCell>
                            <TableCell>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="text-center h-24">No users found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
            )}
        </CardContent>
      </Card>

      {(isDeleting || deletionResults.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Deletion Results</CardTitle></CardHeader>
          <CardContent>
            {isDeleting && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span>Deleting users...</span><span>{Math.round(progress)}%</span></div>
                <Progress value={progress} />
              </div>
            )}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {deletionResults.map((result, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  {result.status === 'success' ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.email}</p>
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
