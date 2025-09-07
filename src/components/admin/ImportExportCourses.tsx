'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Using window.alert for now - replace with your toast implementation
const useToast = () => ({
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    const message = [props.title, props.description].filter(Boolean).join(' - ');
    if (props.variant === 'destructive') {
      console.error(message);
    } else {
      console.log(message);
    }
    alert(message);
  }
});
import { Download, Upload } from 'lucide-react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: number;
  details: Array<{
    title: string;
    status: string;
    message?: string;
  }>;
}

export function ImportExportCourses() {
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/courses/export');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export courses');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courses-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast({
        title: 'Export successful',
        description: 'Courses have been exported successfully.',
        variant: 'default',
      } as ToastProps);
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export courses';
      toast({
        title: 'Export failed',
        description: errorMessage,
        variant: 'destructive',
      } as ToastProps);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setIsLoading(true);
    setImportResults(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/courses/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response.json() as ImportResult;
      
      if (!response.ok) {
        throw new Error((result as any).error || 'Failed to import courses');
      }
      
      setImportResults(result);
      
      toast({
        title: 'Import successful',
        description: `Successfully processed ${result.total} courses (${result.created} created, ${result.updated} updated)`,
        variant: 'default',
      } as ToastProps);
      
      // Refresh the page to show the imported courses
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import courses';
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive',
      } as ToastProps);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Courses</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleImport} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file">JSON File</Label>
              <Input
                id="file"
                type="file"
                accept=".json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Upload a JSON file containing courses and modules data
              </p>
            </div>

            {importResults && (
              <div className="mt-4 p-4 bg-muted/50 rounded-md">
                <h4 className="font-medium mb-2">Import Results:</h4>
                <div className="text-sm space-y-1">
                  <div>Total: {importResults.total}</div>
                  <div>Created: {importResults.created}</div>
                  <div>Updated: {importResults.updated}</div>
                  {importResults.errors > 0 && (
                    <div className="text-amber-600">Errors: {importResults.errors}</div>
                  )}
                </div>
                
                {importResults?.details && importResults.details.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto text-sm">
                    {importResults?.details?.map((item: { title: string; status: string; message?: string }, index: number) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b">
                        <span className="truncate">{item.title || 'Untitled'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          item.status === 'created' ? 'bg-green-100 text-green-800' :
                          item.status === 'updated' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!file || isLoading}>
                {isLoading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
