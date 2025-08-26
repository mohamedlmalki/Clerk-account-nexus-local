import { useState } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Key, Download, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { UserOperationResult } from '@/types/clerk';

export default function ResetPasswords() {
  const { activeAccount } = useClerkAccounts();
  const [userEmails, setUserEmails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UserOperationResult[]>([]);
  const [resetMethod, setResetMethod] = useState<'email' | 'generate'>('email');

  const parseEmails = (text: string): string[] => {
    return text.trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('@'));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const simulatePasswordReset = async (email: string): Promise<UserOperationResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));
    
    // Simulate some failures for demo
    const success = Math.random() > 0.08; // 92% success rate
    
    if (success) {
      const newPassword = resetMethod === 'generate' ? generatePassword() : undefined;
      return {
        email,
        status: 'success',
        message: resetMethod === 'email' 
          ? 'Password reset email sent' 
          : `Password reset to: ${newPassword}`,
        userId: `user_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        email,
        status: 'error',
        message: 'User not found or reset failed'
      };
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setUserEmails(content);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV or TXT file",
        variant: "destructive"
      });
    }
  };

  const handleBulkReset = async () => {
    if (!activeAccount) {
      toast({
        title: "No Account Selected",
        description: "Please select a Clerk account first",
        variant: "destructive"
      });
      return;
    }

    if (!userEmails.trim()) {
      toast({
        title: "No Data",
        description: "Please enter email addresses",
        variant: "destructive"
      });
      return;
    }

    const emails = parseEmails(userEmails);
    if (emails.length === 0) {
      toast({
        title: "Invalid Data",
        description: "No valid email addresses found",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: UserOperationResult[] = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const result = await simulatePasswordReset(email);
      newResults.push(result);
      setResults([...newResults]);
      setProgress(((i + 1) / emails.length) * 100);
    }

    setIsProcessing(false);
    
    const successCount = newResults.filter(r => r.status === 'success').length;
    toast({
      title: "Password Reset Complete",
      description: `${successCount}/${emails.length} passwords reset successfully`
    });
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    
    const csv = [
      'Email,Status,Message',
      ...results.map(r => `${r.email},${r.status},"${r.message}"`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password-reset-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeAccount) {
    return (
      <div className="p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              No Account Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please select a Clerk account from the sidebar to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Key className="w-8 h-8 text-primary" />
          Bulk Password Reset
        </h1>
        <p className="text-muted-foreground">
          Reset passwords for multiple users in {activeAccount.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reset Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Reset Method</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="resetMethod"
                      value="email"
                      checked={resetMethod === 'email'}
                      onChange={(e) => setResetMethod(e.target.value as 'email')}
                      className="text-primary"
                    />
                    <span className="text-sm">Send reset email</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="resetMethod"
                      value="generate"
                      checked={resetMethod === 'generate'}
                      onChange={(e) => setResetMethod(e.target.value as 'generate')}
                      className="text-primary"
                    />
                    <span className="text-sm">Generate new password</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resetMethod === 'email' 
                    ? 'Users will receive password reset links via email'
                    : 'New passwords will be generated and displayed in results'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Email Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="w-4 h-4" />
                  Upload File (CSV/TXT)
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  One email address per line
                </p>
              </div>

              <div>
                <Label htmlFor="user-emails">Or paste email addresses:</Label>
                <Textarea
                  id="user-emails"
                  placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
                  value={userEmails}
                  onChange={(e) => setUserEmails(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleBulkReset} 
                disabled={isProcessing || !userEmails.trim()}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Reset Passwords'}
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Resetting passwords...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reset Results</CardTitle>
              {results.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Reset results will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      Total: {results.length}
                    </Badge>
                    <Badge className="bg-success">
                      Success: {results.filter(r => r.status === 'success').length}
                    </Badge>
                    <Badge variant="destructive">
                      Failed: {results.filter(r => r.status === 'error').length}
                    </Badge>
                  </div>

                  {/* Individual Results */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        {result.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.email}
                          </p>
                          <p className="text-xs text-muted-foreground break-words">
                            {result.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Warning */}
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-warning" />
                Security Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>
                Generated passwords should be shared securely and users should be prompted to change them on first login.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}