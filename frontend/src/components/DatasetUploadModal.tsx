'use client'

import React, { useState, useCallback } from 'react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/shadcn/dialog"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { useDropzone } from 'react-dropzone'
import { IconUpload, IconX, IconLoader } from '@tabler/icons-react'
import { toast } from 'sonner'
// Import the actual upload mutation hook
import { useUploadDatasetMutation } from '@/features/projects/projectApiSlice'; 

interface DatasetUploadModalProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUploadComplete?: () => void; // Optional callback
}

export function DatasetUploadModal({ 
  projectId, 
  isOpen, 
  onOpenChange, 
  onUploadComplete 
}: DatasetUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState(''); // Optional: allow user to name it
  const [isLoading, setIsLoading] = useState(false); // Local loading state for now

  // Use the actual RTK Query hook
  const [uploadDataset, { isLoading: hookIsLoading }] = useUploadDatasetMutation(); // Renamed isUploading -> isLoading for consistency

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Basic validation (e.g., file type - allow CSV for now)
      if (file.type !== 'text/csv') {
          toast.error("Invalid file type. Please upload a CSV file.");
          return;
      }
      // Optional: Limit file size frontend
      // if (file.size > 500 * 1024 * 1024) { // 500MB limit
      //   toast.error("File size exceeds 500MB limit.");
      //   return;
      // }
      setSelectedFile(file);
      setDatasetName(file.name); // Pre-fill name with filename
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'text/csv': ['.csv'] } // Accept only CSV
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!datasetName.trim()) {
        toast.error("Please provide a name for the dataset.");
        return;
    }

    // setIsLoading(true); // isLoading state now comes from the hook
    const formData = new FormData();
    formData.append('datasetFile', selectedFile!); // Add non-null assertion
    // Optional: send datasetName if backend uses it
    // formData.append('datasetName', datasetName);

    try {
      // --- Use the actual API call --- 
      console.log("Uploading:", datasetName, "to project:", projectId);
      const result = await uploadDataset({ projectId, formData }).unwrap();
      // --- End API call --- 

      toast.success(result.message || `Dataset '${result.datasetName || datasetName}' uploaded successfully!`); // Use message from backend if available
      setSelectedFile(null); // Clear selection
      setDatasetName('');
      onOpenChange(false); // Close modal
      if (onUploadComplete) {
        onUploadComplete(); // Call callback if provided
      }
    } catch (err: any) {
      console.error("Dataset upload failed:", err);
      // Attempt to get more specific error message from backend response
      const errorMsg = err?.data?.error || err?.data?.message || "Failed to upload dataset.";
      toast.error(errorMsg);
    } finally {
      // setIsLoading(false); // isLoading state now comes from the hook
    }
  };

  const handleClose = () => {
      if (hookIsLoading) return; // Prevent closing while uploading
      setSelectedFile(null);
      setDatasetName('');
      onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload Dataset</DialogTitle>
          <DialogDescription>
            Select a CSV file to upload to project: {projectId}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* File Dropzone */}
          <div 
            {...getRootProps()} 
            className={`mt-1 flex justify-center rounded-md border-2 border-dashed border-input px-6 pb-6 pt-5 cursor-pointer hover:border-primary transition-colors ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
           >
             <input {...getInputProps()} />
             <div className="space-y-1 text-center">
               <IconUpload className="mx-auto h-12 w-12 text-gray-400" stroke={1.5}/>
               <div className="flex text-sm text-muted-foreground">
                 <Label
                     htmlFor="file-upload"
                     className="relative cursor-pointer rounded-md bg-background font-medium text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/80"
                 >
                    <span>Upload a file</span>
                 </Label>
                 <p className="pl-1">or drag and drop</p>
               </div>
               <p className="text-xs text-muted-foreground">CSV up to 500MB</p>
             </div>
          </div>

          {/* Selected File Info & Name Input */}
          {selectedFile && (
            <div className="space-y-2 rounded-md border p-3">
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium text-foreground truncate pr-2">
                   Selected: {selectedFile.name}
                 </p>
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)} disabled={hookIsLoading}>
                   <IconX className="h-4 w-4" />
                   <span className="sr-only">Remove file</span>
                 </Button>
               </div>
               <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="dataset-name">Dataset Name</Label>
                  <Input 
                     id="dataset-name" 
                     type="text" 
                     placeholder="Enter dataset name (e.g., customer_data_v1.csv)"
                     value={datasetName}
                     onChange={(e) => setDatasetName(e.target.value)}
                     disabled={hookIsLoading}
                  />
               </div>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={hookIsLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || hookIsLoading}>
            {hookIsLoading ? (
              <><IconLoader className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><IconUpload className="mr-2 h-4 w-4" /> Upload Dataset</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 