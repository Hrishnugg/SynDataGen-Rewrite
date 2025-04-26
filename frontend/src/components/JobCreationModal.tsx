'use client'

import * as React from 'react'

import { Button } from "@/components/shadcn/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/shadcn/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/shadcn/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import { Terminal, AnimatedSpan } from "@/components/magicui/terminal"
import { IconCircleCheckFilled, IconAlertCircleFilled } from '@tabler/icons-react';

// Define expected props
interface JobCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  // Make onCreateJob async to simulate progress reporting
  onCreateJob: (details: { name: string; type: string; config: string; projectId: string }) => Promise<boolean>; // Returns true on success, false on error
}

const JOB_TYPES = ['csv', 'json', 'sql', 'parquet'];

type CreationStatus = 'idle' | 'creating' | 'success' | 'error';

export function JobCreationModal({ isOpen, onOpenChange, projectId, onCreateJob }: JobCreationModalProps) {
  const [jobName, setJobName] = React.useState('');
  const [jobType, setJobType] = React.useState('');
  const [jobConfig, setJobConfig] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [creationStatus, setCreationStatus] = React.useState<CreationStatus>('idle');
  const [creationLogs, setCreationLogs] = React.useState<string[]>([]);

  // Reset form and status when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow closing animation
      setTimeout(() => {
        setJobName('');
        setJobType('');
        setJobConfig('');
        setFormError('');
        setCreationStatus('idle');
        setCreationLogs([]);
      }, 300);
    }
  }, [isOpen]);

  const addLog = (message: string) => {
    setCreationLogs(prev => [...prev, message]);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!jobType) {
        setFormError('Job Type is required.');
        return;
    }
    if (!jobConfig) {
        setFormError('Job Configuration is required.');
        return;
    }
    setFormError('');
    setCreationStatus('creating');
    setCreationLogs([]); // Clear logs

    addLog(`[1/5] Initializing job creation...`);

    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        addLog(`[2/5] Validating configuration locally...`);
        // TODO: Add actual config validation logic if possible client-side
        // Simulate validation success/failure (e.g., check if config is valid JSON)
        try {
            JSON.parse(jobConfig); // Basic JSON validation
            await new Promise(resolve => setTimeout(resolve, 600));
            addLog(`      -> Configuration syntax OK.`);
        } catch (jsonError) {
             addLog(`      -> Error: Invalid JSON format in configuration.`);
             throw new Error("Invalid JSON format in configuration."); // Stop process
        }

        addLog(`[3/5] Preparing job record...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        addLog(`      -> Job details prepared.`);

        addLog(`[4/5] Submitting job to backend service...`);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simulate potential backend/API error (e.g., 10% chance of failure)
        const shouldSimulateError = Math.random() < 0.1; // 10% chance
        if (shouldSimulateError) {
             addLog(`      -> Error: Backend service unavailable (Simulated).`);
             throw new Error("Backend service unavailable (Simulated).");
        }

        // Call the actual creation function passed as prop
        addLog(`      -> Calling onCreateJob function...`);
        const success = await onCreateJob({ name: jobName, type: jobType, config: jobConfig, projectId });
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call duration

        if (success) {
            addLog(`      -> Backend accepted job submission.`);
            addLog(`[5/5] Finalizing job creation...`);
            await new Promise(resolve => setTimeout(resolve, 300));
            addLog(`      -> Job creation process completed successfully!`);
            setCreationStatus('success');
        } else {
             addLog(`      -> Error: Backend reported failure during job creation.`);
             throw new Error('Job creation failed on the backend.');
        }
    } catch (error) {
        console.error("Job creation failed:", error);
        // Ensure the specific error is logged
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addLog(`      -> Error: ${errorMessage}`);
        setCreationStatus('error');
        // No need to add the generic "Job Creation Failed" message here,
        // it will be added by the conditional rendering logic based on the status.
    }
  }

  const canSubmit = jobType && jobConfig && creationStatus === 'idle';

  return (
    // Prevent closing via overlay click during creation
    <Dialog open={isOpen} onOpenChange={creationStatus !== 'creating' ? onOpenChange : undefined}>
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
            {/* Job Name */}
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
                disabled={creationStatus !== 'idle'}
              />
            </div>

            {/* Job Type */}
            <div>
              <Label htmlFor="jobType" className="text-sm font-medium">
                Job Type <span className="text-destructive">*</span>
              </Label>
              <Select value={jobType} onValueChange={setJobType} disabled={creationStatus !== 'idle'}>
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
                disabled={creationStatus !== 'idle'}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the job configuration, typically in JSON format.</p>
            </div>

            {/* Form Error Message */}
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
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              Create Job
            </Button>
          )}
          {creationStatus === 'creating' && (
             <Button type="button" disabled>
                <span className="animate-pulse">Creating...</span>
             </Button>
          )}
          {(creationStatus === 'success' || creationStatus === 'error') && (
            <Button type="button" onClick={() => onOpenChange(false)}> {/* Allow closing */} 
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 