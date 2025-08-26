// src/pages/BulkImport.tsx

import { useMemo, useState } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';
import { Upload, Download, AlertCircle, CheckCircle, Users, Key, XCircle, Pause, Play, Timer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BulkUserData, ImportJob } from '@/types/clerk';
import { faker } from '@faker-js/faker';

type ResultFilter = 'all' | 'success' | 'error';

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

export default function BulkImport() {
  const { 
      activeAccount, 
      importJobs, 
      startImportJob, 
      pauseImportJob, 
      resumeImportJob, 
      stopImportJob,
      clearImportJob,
      updateJobSettings
  } = useClerkAccounts();
  
  const [filter, setFilter] = useState<ResultFilter>('all');
  
  const job = useMemo(() => activeAccount ? (importJobs[activeAccount.id] || initialJobState) : initialJobState, [importJobs, activeAccount]);
  
  const setUserEmails = (text: string) => {
    if (activeAccount) updateJobSettings(activeAccount.id, { userEmails: text });
  }
  
  const setSendInvites = (value: boolean) => {
    if (activeAccount) updateJobSettings(activeAccount.id, { sendInvites: value });
  }

  const setDelayInSeconds = (value: number) => {
      if (activeAccount) updateJobSettings(activeAccount.id, { delayInSeconds: value });
  }
  
  const emailCount = useMemo(() => {
    if (!job.userEmails.trim()) return 0;
    return job.userEmails.trim().split('\n').filter(line => line.trim()).length;
  }, [job.userEmails]);

  const filteredResults = useMemo(() => {
    if (filter === 'all') return job.results;
    return job.results.filter(result => result.status === filter);
  }, [job.results, filter]);

  const parseUserData = (text: string): BulkUserData[] => {
    const lines = text.trim().split('\n');
    return lines.filter(line => line.trim()).map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { email: parts[0], firstName: parts[1] || '', lastName: parts[2] || '', password: parts[3] || '' };
    }).filter(user => user.email && user.email.includes('@'));
  };

  const handleGeneratePasswords = () => {
    if (!job.userEmails.trim()) {
        toast({ title: "No Data", description: "Please paste user data before generating passwords.", variant: "destructive" });
        return;
    }
    const users = parseUserData(job.userEmails);
    const usersWithPasswords = users.map(user => {
        const password = user.password || faker.internet.password({ length: 12, memorable: false, prefix: '!A1' });
        return [user.email, user.firstName, user.lastName, password].join(',');
    }).join('\n');
    setUserEmails(usersWithPasswords);
    toast({ title: "Passwords Generated", description: "A secure password has been added for each user." });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (e) => setUserEmails(e.target?.result as string);
      reader.readAsText(file);
    } else {
      toast({ title: "Invalid File", description: "Please upload a CSV file", variant: "destructive" });
    }
  };
  
  const handleClearAll = () => {
      if (activeAccount) {
          clearImportJob(activeAccount.id);
          toast({ title: "Cleared", description: "User data and results have been cleared." });
      }
  };
  
  const handleStartImport = () => {
    if (!activeAccount) return;
    const users = parseUserData(job.userEmails);
    if (users.length === 0) {
      toast({ title: "Invalid Data", description: "No valid user data found", variant: "destructive" });
      return;
    }
    if (!job.sendInvites && users.some(u => !u.password)) {
        toast({ title: "Missing Passwords", description: "Please generate passwords before importing.", variant: "destructive" });
        return;
    }
    startImportJob(activeAccount.id, users);
  };
  
  const handleExport = () => {
    if (filteredResults.length === 0) {
        toast({ title: "No Data", description: "There are no results to export for the current filter.", variant: "destructive"});
        return;
    };
    const emailsToExport = filteredResults.map(r => r.email).join('\n');
    const blob = new Blob([emailsToExport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-results-${filter}.txt`;
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
              Please select or add a Clerk account from the sidebar to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isJobRunning = job.status === 'running' || job.status === 'paused';

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Upload className="w-8 h-8 text-primary" />Bulk User Import</h1>
        <p className="text-muted-foreground">
          Import existing users into {activeAccount.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Import Configuration</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                      <input type="checkbox" id="send-invites" checked={job.sendInvites} onChange={(e) => setSendInvites(e.target.checked)} className="rounded border-border" />
                      <Label htmlFor="send-invites">Send invitation emails to imported users</Label>
                  </div>
                  <div className="flex items-center gap-2">
                      <Label htmlFor="delay" className="flex items-center gap-2 whitespace-nowrap"><Timer className="w-4 h-4" />Delay (seconds)</Label>
                      <Input id="delay" type="number" value={job.delayInSeconds} onChange={(e) => setDelayInSeconds(Number(e.target.value))} className="w-24" min="0" />
                  </div>
              </div>
            </CardContent>
            
            {job.showStats && (
                <>
                    <Separator className="my-4" />
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <Label className="text-xs text-muted-foreground">Time Elapsed</Label>
                                <p className="text-lg font-bold font-mono">{new Date(job.timeElapsed * 1000).toISOString().substr(14, 5)}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Success</Label>
                                <p className="text-lg font-bold text-success">{job.successCount}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Failed</Label>
                                <p className="text-lg font-bold text-destructive">{job.failCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </>
            )}
          </Card>

          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>User Data Input</CardTitle>
                    <div className="flex items-center gap-4">
                        <Badge variant="secondary">Emails: {emailCount}</Badge>
                        <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={isJobRunning}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Clear All
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer"><Upload className="w-4 h-4" />Upload CSV File</Label>
                <Input id="file-upload" type="file" accept=".csv" onChange={handleFileUpload} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Format: email,firstName,lastName[,password] (one per line)</p>
              </div>
              <div>
                <Label htmlFor="user-data">Or paste data manually:</Label>
                <Textarea id="user-data" placeholder="john@example.com,John,Doe&#10;jane@example.com,Jane,Smith" value={job.userEmails} onChange={(e) => setUserEmails(e.target.value)} className="min-h-[200px] font-mono text-sm" />
              </div>
              
              {job.status === 'idle' || job.status === 'stopped' || job.status === 'completed' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={handleGeneratePasswords} disabled={isJobRunning || job.sendInvites} variant="outline"><Key className="w-4 h-4 mr-2" />Generate Passwords</Button>
                  <Button onClick={handleStartImport} disabled={isJobRunning || !job.userEmails.trim()}>Start Import</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {job.status === 'paused' ? (
                    <Button onClick={() => resumeImportJob(activeAccount.id)} variant="secondary"><Play className="w-4 h-4 mr-2" />Resume</Button>
                  ) : (
                    <Button onClick={() => pauseImportJob(activeAccount.id)} variant="secondary"><Pause className="w-4 h-4 mr-2" />Pause</Button>
                  )}
                  <Button onClick={() => stopImportJob(activeAccount.id)} variant="destructive"><XCircle className="w-4 h-4 mr-2" />End Job</Button>
                </div>
              )}
               <p className="text-xs text-muted-foreground mt-1 text-center">Note: Password generation is disabled when "Send invitation emails" is checked.</p>
            </CardContent>
          </Card>
          
          {(job.showStats || job.results.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Import Results</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isJobRunning}><Download className="w-4 h-4 mr-2" />Export Filtered</Button>
              </CardHeader>
              <CardContent>
                {isJobRunning && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Importing users...</span>
                        {/* CORRECTED: Now references job.countdown and job.nextUserEmail */}
                        {job.countdown > 0 && job.nextUserEmail ? (
                          <span className="text-muted-foreground">Next: {job.nextUserEmail} in {job.countdown}s</span>
                        ) : (
                          <span>{Math.round(job.progress)}%</span>
                        )}
                      </div>
                      <Progress value={job.progress} />
                    </div>
                )}
                
                <div className="py-4">
                    <RadioGroup defaultValue="all" value={filter} onValueChange={(value: string) => setFilter(value as ResultFilter)} className="flex items-center gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r1" /><Label htmlFor="r1">All ({job.results.length})</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="success" id="r2" /><Label htmlFor="r2">Success ({job.results.filter(r => r.status === 'success').length})</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="error" id="r3" /><Label htmlFor="r3">Failed ({job.results.filter(r => r.status === 'error').length})</Label></div>
                    </RadioGroup>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No results to display for the current filter.</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredResults
                      .slice()
                      .reverse()
                      .map((result, index) => (
                        <div
                          key={`${result.email}-${index}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <span className="text-sm font-medium text-muted-foreground">
                            {job.results.length - index}.
                          </span>
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
                            {result.userId && (
                              <p className="text-xs font-mono text-muted-foreground">
                                ID: {result.userId}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}