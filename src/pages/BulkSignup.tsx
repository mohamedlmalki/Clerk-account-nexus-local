import { useState } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserPlus, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BulkUserData, UserOperationResult } from '@/types/clerk';

export default function BulkSignup() {
  const { activeAccount } = useClerkAccounts();
  const [userEmails, setUserEmails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UserOperationResult[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const parseUserData = (text: string): BulkUserData[] => {
    const lines = text.trim().split('\n');
    return lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          email: parts[0],
          firstName: parts[1] || '',
          lastName: parts[2] || '',
          password: parts[3] || generatePassword()
        };
      })
      .filter(user => user.email && user.email.includes('@'));
  };

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setUserEmails(content);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
    }
  };

  const simulateClerkSignup = async (user: BulkUserData): Promise<UserOperationResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simulate some failures for demo
    const success = Math.random() > 0.15; // 85% success rate
    
    if (success) {
      return {
        email: user.email,
        status: 'success',
        message: 'User created successfully',
        userId: `user_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        email: user.email,
        status: 'error',
        message: 'Email already exists or invalid format'
      };
    }
  };

  const handleBulkSignup = async () => {
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
        description: "Please enter user data or upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    const users = parseUserData(userEmails);
    if (users.length === 0) {
      toast({
        title: "Invalid Data",
        description: "No valid user data found",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: UserOperationResult[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const result = await simulateClerkSignup(user);
      newResults.push(result);
      setResults([...newResults]);
      setProgress(((i + 1) / users.length) * 100);
    }

    setIsProcessing(false);
    
    const successCount = newResults.filter(r => r.status === 'success').length;
    toast({
      title: "Bulk Signup Complete",
      description: `${successCount}/${users.length} users created successfully`
    });
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    
    const csv = [
      'Email,Status,Message,User ID',
      ...results.map(r => `${r.email},${r.status},${r.message},${r.userId || ''}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-signup-results.csv';
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
          <UserPlus className="w-8 h-8 text-primary" />
          Bulk User Signup
        </h1>
        <p className="text-muted-foreground">
          Create multiple user accounts in {activeAccount.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Data Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload CSV File
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: email,firstName,lastName,password (one per line)
                </p>
              </div>

              <Separator />

              <div>
                <Label htmlFor="user-data">Or paste data manually:</Label>
                <Textarea
                  id="user-data"
                  placeholder="john@example.com,John,Doe,password123&#10;jane@example.com,Jane,Smith&#10;bob@example.com,Bob,Johnson"
                  value={userEmails}
                  onChange={(e) => setUserEmails(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleBulkSignup} 
                disabled={isProcessing || !userEmails.trim()}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Create Users'}
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing users...</span>
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
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              {results.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Results will appear here after processing
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="flex gap-2">
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
                        className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30"
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
                          <p className="text-xs text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
}