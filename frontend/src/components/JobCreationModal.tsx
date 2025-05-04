'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'; // Ensure useEffect is imported
import { Button } from "@/components/shadcn/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/shadcn/dialog"
import { Input } from "@/components/ui/input" // Assuming shadcn input
import { Label } from "@/components/shadcn/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import { Terminal, AnimatedSpan } from "@/components/magicui/terminal"
import { IconCircleCheckFilled, IconAlertCircleFilled, IconLoader } from '@tabler/icons-react'; // Added IconLoader
import { useCreateJobMutation } from '@/features/jobs/jobApiSlice'; // Import the hook
import { toast } from "sonner"; // Import toast

// Define expected props
interface JobCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  // Removed onCreateJob prop - will use mutation directly
}

const JOB_TYPES = ['csv', 'json', 'sql', 'parquet']; // Keep or fetch dynamically?

type CreationStatus = 'idle' | 'creating' | 'success' | 'error';

export function JobCreationModal({ isOpen, onOpenChange, projectId }: JobCreationModalProps) {
  const [jobName, setJobName] = React.useState(''); // Keep optional name if desired
  const [jobType, setJobType] = React.useState('');
  const [jobConfig, setJobConfig] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [creationStatus, setCreationStatus] = React.useState<CreationStatus>('idle');
  const [creationLogs, setCreationLogs] = React.useState<string[]>([]);

  // --- RTK Query Hook ---
  const [createJob, { isLoading, isError, error: apiError }] = useCreateJobMutation();

  // Reset form and status when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setJobName('');
        setJobType('');
        setJobConfig('');
        setFormError('');
        setCreationStatus('idle');
        setCreationLogs([]);
      }, 300); 
    } else {
       // Reset status immediately when opened
       setCreationStatus('idle');
       setCreationLogs([]);
       setFormError('');
    }
  }, [isOpen]);

  const addLog = (message: string) => {
    setCreationLogs(prev => [...prev, message]);
  };

  const handleSubmit = async () => {
    if (!jobType || !jobConfig) {
        setFormError('Job Type and Configuration are required.');
        return;
    }
    setFormError('');
    setCreationStatus('creating');
    setCreationLogs(['[1/3] Validating configuration...']);

    // Simple JSON validation client-side
    try {
      JSON.parse(jobConfig);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate check
      addLog('      -> Configuration syntax OK.');
    } catch (jsonError) {
      addLog(`      -> Error: Invalid JSON format.`);
      setCreationStatus('error');
      return;
    }

    addLog('[2/3] Submitting job to backend...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    try {
      // Call the actual mutation
      await createJob({
        projectId,
        // Pass jobName if backend supports it, otherwise derive/omit
        newJob: { jobType, jobConfig /*, name: jobName */ }, 
      }).unwrap();

      addLog('      -> Backend accepted job submission.');
      addLog('[3/3] Finalizing job creation...');
      await new Promise(resolve => setTimeout(resolve, 300));
      addLog('      -> Job creation process initiated successfully!');
      setCreationStatus('success');
      toast.success("Job creation initiated!");
      // Optionally close modal after a short delay on success
      // setTimeout(() => onOpenChange(false), 1500);
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Unknown error occurred';
      console.error("Job creation failed:", err);
      addLog(`      -> Error: ${errorMessage}`);
      setCreationStatus('error');
      toast.error(errorMessage);
    }
  };

  // Disable form fields/submit button when not idle
  const isSubmittingOrDone = creationStatus !== 'idle';
  const canSubmit = jobType && jobConfig && !isSubmittingOrDone;

  return (
    <Dialog open={isOpen} onOpenChange={creationStatus === 'creating' ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[500px] min-h-[300px] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {creationStatus === 'idle' ? 'Create New Job' : 'Job Creation Progress'}
          </DialogTitle>
          {creationStatus === 'idle' && (
            <DialogDescription>
              Configure the details for your new data generation job in project {projectId}.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Conditional Content: Form or Terminal */}
        {creationStatus === 'creating' || creationStatus === 'success' || creationStatus === 'error' ? (
            <div className="flex-grow overflow-hidden py-4">
                 <Terminal className="h-full max-h-full">
                    {creationLogs.map((log, index) => (
                         <AnimatedSpan key={index} delay={index * 150}>
                            {log}
                         </AnimatedSpan>
                    ))}
                    {creationStatus === 'success' && (
                         <AnimatedSpan delay={creationLogs.length * 150} className="text-green-500 flex items-center gap-2">
                           <IconCircleCheckFilled size={16}/> Job Created Successfully!
                         </AnimatedSpan>
                    )}
                    {creationStatus === 'error' && (
                         <AnimatedSpan delay={creationLogs.length * 150} className="text-red-500 flex items-center gap-2">
                            <IconAlertCircleFilled size={16}/> Job Creation Failed.
                         </AnimatedSpan>
                    )}
                </Terminal>
            </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Job Name (Optional) */}
            <div>
              <Label htmlFor="jobName" className="text-sm font-medium">
                Job Name <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="jobName"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g., User Profile Generation Q3"
                className="mt-1"
                disabled={isSubmittingOrDone}
              />
            </div>

            {/* Job Type */}
            <div>
              <Label htmlFor="jobType" className="text-sm font-medium">
                Job Type <span className="text-destructive">*</span>
              </Label>
              <Select value={jobType} onValueChange={setJobType} disabled={isSubmittingOrDone}>
                  <SelectTrigger id="jobType" className="w-full mt-1">
                      <SelectValue placeholder="Select job type..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectGroup>
                          <SelectLabel>Available Types</SelectLabel>
                          {JOB_TYPES.map(type => (
                              <SelectItem key={type} value={type} className="capitalize">
                                  {type}
                              </SelectItem>
                          ))}
                      </SelectGroup>
                  </SelectContent>
              </Select>
            </div>

            {/* Configuration */}
            <div>
               <Label htmlFor="jobConfig" className="text-sm font-medium">
                 Configuration <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="jobConfig"
                value={jobConfig}
                onChange={(e) => setJobConfig(e.target.value)}
                placeholder='Enter job configuration (e.g., JSON format)&#10;{\n  "rows": 10000,\n  "schema": [ { "name": "id", "type": "uuid" } ]\n}'
                className="mt-1 min-h-[150px] font-mono text-xs"
                disabled={isSubmittingOrDone}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the job configuration, typically in JSON format.</p>
            </div>

            {/* Form Error Message (for frontend validation) */}
            {formError && (
              <p className="text-center text-sm text-destructive">
                  {formError}
              </p>
            )}
          </div>
        )}

        {/* Conditional Footer */}
        <DialogFooter>
          {(creationStatus === 'idle' || creationStatus === 'creating') && (
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={creationStatus === 'creating'}>
                Cancel
                </Button>
            </DialogClose>
          )}
          {creationStatus === 'idle' && (
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isLoading}>
              {isLoading ? <IconLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Job
            </Button>
          )}
          {creationStatus === 'creating' && (
             <Button type="button" disabled>
                 <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                <span className="animate-pulse">Creating...</span>
             </Button>
          )}
          {(creationStatus === 'success' || creationStatus === 'error') && (
            <Button type="button" onClick={() => onOpenChange(false)}> 
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 