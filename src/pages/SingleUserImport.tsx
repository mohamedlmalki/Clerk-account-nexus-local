import { useState } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BulkUserData } from '@/types/clerk';

export default function SingleUserImport() {
  const { activeAccount } = useClerkAccounts();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [sendInvites, setSendInvites] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverResponse, setServerResponse] = useState('');

  const handleStartImport = async () => {
    if (!activeAccount) {
      toast({ title: "No Account Selected", description: "Please select a Clerk account first", variant: "destructive" });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!sendInvites && !password.trim()) {
        toast({ title: "Password Required", description: "A password is required when not sending an invitation.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    setServerResponse('Processing...');

    const user: BulkUserData = {
        email,
        firstName,
        lastName,
        password: sendInvites ? undefined : password
    };

    try {
        const response = await fetch('http://localhost:3001/api/import-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, accountId: activeAccount.id, sendInvites }),
        });
        const result = await response.json();
        setServerResponse(JSON.stringify(result, null, 2));

        if (response.ok) {
            toast({ title: "Import Successful", description: `User ${email} has been processed.` });
        } else {
            toast({ title: "Import Failed", description: result.message || 'An unknown error occurred.', variant: "destructive" });
        }

    } catch (error) {
        const errorMessage = 'Failed to connect to the backend.';
        setServerResponse(JSON.stringify({ error: errorMessage }, null, 2));
        toast({ title: "Network Error", description: errorMessage, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  if (!activeAccount) {
    return (
      <div className="p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-warning" />No Account Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select an account to import a user.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3"><UserCheck className="w-8 h-8 text-primary" />Single User Import</h1>
        <p className="text-muted-foreground">Import one user into {activeAccount.name} and see the direct API response.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name (Optional)</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name (Optional)</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="send-invites" checked={sendInvites} onChange={(e) => setSendInvites(e.target.checked)} className="rounded border-border" />
                <Label htmlFor="send-invites">Send invitation email</Label>
            </div>

            {!sendInvites && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password" />
                <p className="text-xs text-muted-foreground mt-1">A password is required if you are not sending an invitation.</p>
              </div>
            )}
            
            <Button onClick={handleStartImport} disabled={isProcessing} className="w-full">
              {isProcessing ? 'Processing...' : 'Import User'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Server Response</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    value={serverResponse}
                    readOnly
                    placeholder="The raw JSON response from the server will appear here..."
                    className="min-h-[300px] font-mono text-sm bg-secondary/50"
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}