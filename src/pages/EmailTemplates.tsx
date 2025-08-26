import { useState, useEffect, useRef } from 'react';
import { useClerkAccounts } from '@/hooks/useClerkAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { EmailTemplate } from '@/types/clerk';
import { Mail, AlertCircle, RefreshCw, Save, Undo, ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EmailTemplates() {
  const { activeAccount } = useClerkAccounts();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- State for the Image Dialog ---
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageAlign, setImageAlign] = useState('center');
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async () => {
    if (!activeAccount) return;
    setIsLoadingList(true);
    setSelectedTemplate(null);
    try {
      const response = await fetch(`http://localhost:3001/api/templates/${activeAccount.id}/email`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0]?.message || 'Failed to fetch templates');
      setTemplates(data);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchTemplateDetails = async (slug: string) => {
    if (!activeAccount) return;
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:3001/api/templates/${activeAccount.id}/email/${slug}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0]?.message || 'Failed to fetch template details');
      setSelectedTemplate(data);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  const handleUpdateTemplate = async () => {
    if (!activeAccount || !selectedTemplate) return;
    setIsSaving(true);
    try {
        const { name, subject, body, from_email_name, reply_to_email_name, delivered_by_clerk } = selectedTemplate;
        const payload = {
            name,
            subject,
            body,
            markup: body, // Ensure markup is sent with the body
            from_email_name,
            reply_to_email_name,
            delivered_by_clerk
        };
        const response = await fetch(`http://localhost:3001/api/templates/${activeAccount.id}/email/${selectedTemplate.slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.message || 'Failed to update template');
        toast({ title: "Success", description: "Template saved successfully." });
        fetchTemplateDetails(selectedTemplate.slug); // Refresh details
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRevertTemplate = async () => {
    if (!activeAccount || !selectedTemplate) return;
    setIsSaving(true);
    try {
        const response = await fetch(`http://localhost:3001/api/templates/${activeAccount.id}/email/${selectedTemplate.slug}/revert`, {
            method: 'POST',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.message || 'Failed to revert template');
        toast({ title: "Success", description: "Template reverted to default." });
        fetchTemplateDetails(selectedTemplate.slug);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  useEffect(() => {
    if (activeAccount) {
      fetchTemplates();
    } else {
      setTemplates([]);
      setSelectedTemplate(null);
    }
  }, [activeAccount]);

  const handleInsertImage = () => {
    if (!imageUrl) {
        toast({ title: "Image URL is required", variant: "destructive" });
        return;
    }
    let imgTag = `<img src="${imageUrl}" alt="${imageAlt}" style="width: ${imageWidth ? imageWidth + 'px' : '100%'}; max-width: 100%; height: auto; border: 0;" border="0" />`;
    if (linkUrl) {
        imgTag = `<a href="${linkUrl}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
    }
    const finalHtml = `<div style="text-align: ${imageAlign};">${imgTag}</div>`;
    const textarea = bodyTextareaRef.current;
    if (textarea && selectedTemplate) {
        const currentBody = selectedTemplate.body || '';
        const cursorPosition = textarea.selectionStart;
        const newBody = currentBody.substring(0, cursorPosition) + '\n' + finalHtml + '\n' + currentBody.substring(cursorPosition);
        
        setSelectedTemplate({ ...selectedTemplate, body: newBody });
    }
    setIsImageDialogOpen(false);
    setImageUrl('');
    setLinkUrl('');
    setImageWidth('');
    setImageAlt('');
    setImageAlign('center');
    toast({ title: "Image HTML added!" });
  };

  if (!activeAccount) {
    return (
      <div className="p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-warning" />No Account Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select an account to manage email templates.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Mail className="w-8 h-8 text-primary" />Email Templates</h1>
        <p className="text-muted-foreground">Manage email templates for {activeAccount?.name}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Templates</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={isLoadingList}><RefreshCw className={`w-4 h-4 mr-2 ${isLoadingList ? 'animate-spin' : ''}`} />Refresh</Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {isLoadingList ? <p className="p-4 text-center">Loading...</p> :
                templates.map(template => (
                  <div key={template.id} onClick={() => fetchTemplateDetails(template.slug)}
                       className={`p-4 border-b cursor-pointer hover:bg-secondary ${selectedTemplate?.id === template.id ? 'bg-secondary' : ''}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{template.name}</span>
                        {template.resource_type === 'user' && <Badge variant="outline">Customized</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{template.slug}</p>
                  </div>
                ))
              }
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {isLoadingDetails ? <p className="m-auto">Loading template details...</p> :
           !selectedTemplate ? <p className="m-auto">Select a template to view or edit</p> :
            (
              <>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <div className="flex items-center gap-4">
                        {selectedTemplate.can_revert && <Button variant="outline" size="sm" onClick={handleRevertTemplate} disabled={isSaving}><Undo className="w-4 h-4 mr-2"/>Revert</Button>}
                        <Button onClick={handleUpdateTemplate} disabled={isSaving}><Save className="w-4 h-4 mr-2"/>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                        <Switch id="delivered-by-clerk" checked={selectedTemplate.delivered_by_clerk} onCheckedChange={(checked) => setSelectedTemplate(t => t ? {...t, delivered_by_clerk: checked} : null)} />
                        <Label htmlFor="delivered-by-clerk">Delivered by Clerk</Label>
                    </div>
                    <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={selectedTemplate.subject || ''} onChange={(e) => setSelectedTemplate(t => t ? {...t, subject: e.target.value} : null)} />
                    </div>
                    <div>
                        <Label htmlFor="from_email_name">From Name</Label>
                        <Input id="from_email_name" value={selectedTemplate.from_email_name || ''} onChange={(e) => setSelectedTemplate(t => t ? {...t, from_email_name: e.target.value} : null)} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="body">Body (HTML)</Label>
                            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <ImagePlus className="w-4 h-4 mr-2" />
                                        Add Image
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add Image to Template</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div>
                                            <Label htmlFor="imageUrl">Image URL</Label>
                                            <Input id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" />
                                        </div>
                                        {imageUrl && (
                                            <div className="p-4 border rounded-md flex justify-center bg-secondary">
                                                <img src={imageUrl} alt="Preview" className="max-w-full max-h-48" />
                                            </div>
                                        )}
                                        <div>
                                            <Label htmlFor="linkUrl">Link URL (Optional)</Label>
                                            <Input id="linkUrl" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com/page-to-link" />
                                        </div>
                                         <div>
                                            <Label htmlFor="imageAlt">Alt Text (for accessibility)</Label>
                                            <Input id="imageAlt" value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="A descriptive caption" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="imageWidth">Width (in pixels)</Label>
                                                <Input id="imageWidth" type="number" value={imageWidth} onChange={e => setImageWidth(e.target.value)} placeholder="e.g., 600" />
                                            </div>
                                            <div>
                                                <Label htmlFor="imageAlign">Alignment</Label>
                                                <Select value={imageAlign} onValueChange={setImageAlign}>
                                                    <SelectTrigger><SelectValue placeholder="Select alignment" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="left">Left</SelectItem>
                                                        <SelectItem value="center">Center</SelectItem>
                                                        <SelectItem value="right">Right</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleInsertImage}>Add HTML to Body</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Textarea ref={bodyTextareaRef} id="body" value={selectedTemplate.body || ''} onChange={(e) => setSelectedTemplate(t => t ? {...t, body: e.target.value} : null)} className="min-h-[300px] font-mono" />
                    </div>
                    <div>
                        <Label>Available Variables</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTemplate.available_variables.map(v => <Badge key={v} variant="secondary">{`{{${v}}}`}</Badge>)}
                        </div>
                    </div>
                </CardContent>
              </>
            )
          }
        </Card>
      </div>
    </div>
  );
}