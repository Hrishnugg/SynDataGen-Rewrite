/**
 * DataDownloadButton Component
 * 
 * A button for downloading data in various formats (CSV, JSON, Parquet).
 * Includes format selection and progress indication.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet, FileBox, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

interface DataDownloadButtonProps {
  onDownload: (format: 'csv' | 'json' | 'parquet') => Promise<void>;
  disabled?: boolean;
  fileName?: string;
}

export function DataDownloadButton({ 
  onDownload, 
  disabled = false,
  fileName = 'data'
}: DataDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'json' | 'parquet' | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Handle download
  const handleDownload = async (format: 'csv' | 'json' | 'parquet') => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadFormat(format);
    setProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 100 ? 99 : newProgress;
      });
    }, 200);
    
    try {
      await onDownload(format);
      setProgress(100);
      
      toast({
        title: 'Download complete',
        description: `${fileName}.${format} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      
      // Reset after a short delay to show 100% completion
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadFormat(null);
        setProgress(0);
      }, 1000);
    }
  };
  
  // Get icon based on format
  const getFormatIcon = (format: 'csv' | 'json' | 'parquet') => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      case 'json':
        return <FileJson className="h-4 w-4 mr-2" />;
      case 'parquet':
        return <FileBox className="h-4 w-4 mr-2" />;
    }
  };
  
  // Get format display name
  const getFormatName = (format: 'csv' | 'json' | 'parquet') => {
    switch (format) {
      case 'csv':
        return 'CSV';
      case 'json':
        return 'JSON';
      case 'parquet':
        return 'Parquet';
    }
  };
  
  return (
    <div className="space-y-2">
      {isDownloading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              Downloading {getFormatName(downloadFormat!)}...
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              disabled={disabled}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload('csv')}>
              {getFormatIcon('csv')}
              <span>Download as CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('json')}>
              {getFormatIcon('json')}
              <span>Download as JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('parquet')}>
              {getFormatIcon('parquet')}
              <span>Download as Parquet</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
} 