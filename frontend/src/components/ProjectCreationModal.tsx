'use client'

import * as React from 'react'

import { Button } from "@/components/shadcn/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/shadcn/dialog"
import { Input } from "@/components/ui/input" // Use the custom input
import { Label } from "@/components/shadcn/label"
import { Textarea } from "@/components/shadcn/textarea"
import { Terminal, AnimatedSpan } from "@/components/magicui/terminal" // Import Terminal components
import { IconCircleCheckFilled, IconAlertCircleFilled } from '@tabler/icons-react'; // For status icons

// Define expected props
interface ProjectCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  // Callback to handle actual project creation logic (e.g., API call)
  // Passes name, description, and settings
  onCreateProject: (details: {
    name: string;
    description: string;
    settings: { dataRetentionDays: number; maxStorageGB: number };
  }) => Promise<boolean>; // Returns true on success, false on error
  isCreating?: boolean; // Add optional prop from parent
}

type CreationStatus = 'idle' | 'creating' | 'success' | 'error';

export function ProjectCreationModal({
  isOpen,
  onOpenChange,
  onCreateProject,
  isCreating // Destructure the new prop
}: ProjectCreationModalProps) {
  const [projectName, setProjectName] = React.useState('');
  const [projectDescription, setProjectDescription] = React.useState('');
  const [retentionDays, setRetentionDays] = React.useState('30'); // Default value
  const [maxStorage, setMaxStorage] = React.useState('10'); // Default value
  const [formError, setFormError] = React.useState('');
  const [creationStatus, setCreationStatus] = React.useState<CreationStatus>('idle');
  const [creationLogs, setCreationLogs] = React.useState<string[]>([]);

  // Reset form and status when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setProjectName('');
        setProjectDescription('');
        setRetentionDays('30');
        setMaxStorage('10');
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
    if (!projectName) {
        setFormError('Project Name is required.');
        return;
    }
    if (!projectDescription) {
        setFormError('Project Description is required.');
        return;
    }
    const retention = parseInt(retentionDays, 10);
    const storage = parseInt(maxStorage, 10);
    if (isNaN(retention) || retention <= 0) {
        setFormError('Valid Data Retention (days > 0) is required.');
        return;
    }
     if (isNaN(storage) || storage <= 0) {
        setFormError('Valid Max Storage (GB > 0) is required.');
        return;
    }

    setFormError('');
    setCreationStatus('creating');
    setCreationLogs([]); // Clear logs

    addLog(`[1/6] Initializing project creation for "${projectName}"...`);

    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        addLog(`[2/6] Validating project details...`);
        // Add any other client-side checks if needed
        await new Promise(resolve => setTimeout(resolve, 600));
        addLog(`      -> Details validated.`);

        addLog(`[3/6] Preparing project record...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        addLog(`      -> Record prepared.`);

        addLog(`[4/6] Submitting project to backend service...`);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simulate potential backend/API error (e.g., 10% chance)
        const shouldSimulateError = Math.random() < 0.1;
        if (shouldSimulateError) {
             addLog(`      -> Error: Project naming conflict (Simulated).`);
             throw new Error("Project naming conflict (Simulated).");
        }

        // Call the actual creation function passed as prop
        addLog(`      -> Calling onCreateProject function...`);
        const success = await onCreateProject({
            name: projectName,
            description: projectDescription,
            settings: { dataRetentionDays: retention, maxStorageGB: storage }
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        if (success) {
            addLog(`      -> Backend accepted project submission.`);

            addLog(`[5/6] Allocating associated GCS bucket...`);
            const fakeBucketId = `gcs-bucket-proj-${Math.random().toString(36).substring(2, 8)}`;
            await new Promise(resolve => setTimeout(resolve, 900));
            addLog(`      -> Bucket allocated: ${fakeBucketId}`);

            addLog(`[6/6] Finalizing project setup...`);
            await new Promise(resolve => setTimeout(resolve, 300));
            addLog(`      -> Project creation process completed successfully!`);
            setCreationStatus('success');
        } else {
             addLog(`      -> Error: Backend reported failure during project creation.`);
             throw new Error('Project creation failed on the backend.');
        }
    } catch (error) {
        console.error("Project creation failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addLog(`      -> Error: ${errorMessage}`);
        setCreationStatus('error');
    }
  }

  // Use isCreating prop from parent to determine if submission is allowed/button disabled
  const canSubmit = projectName && projectDescription && retentionDays && maxStorage && creationStatus === 'idle' && !isCreating;
  const isDisabled = creationStatus === 'creating' || isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={!isDisabled ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[550px] min-h-[300px] flex flex-col"> {/* Slightly wider */}
        <DialogHeader>
          <DialogTitle>
            {creationStatus === 'idle' ? 'Create New Project' : 'Project Creation Progress'}
          </DialogTitle>
          {creationStatus === 'idle' && (
            <DialogDescription>
              Configure the details for your new data generation project.
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
                           <IconCircleCheckFilled size={16}/> Project Created Successfully!
                         </AnimatedSpan>
                    )}
                    {creationStatus === 'error' && (
                         <AnimatedSpan delay={creationLogs.length * 150} className="text-red-500 flex items-center gap-2">
                            <IconAlertCircleFilled size={16}/> Project Creation Failed.
                         </AnimatedSpan>
                    )}
                </Terminal>
            </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Project Name */}
            <div>
              <Label htmlFor="projectName" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Customer Churn Prediction Q3"
                className="mt-1"
                disabled={creationStatus !== 'idle'}
              />
            </div>

            {/* Project Description */}
             <div>
               <Label htmlFor="projectDescription" className="text-sm font-medium">
                 Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Briefly describe the purpose of this project..."
                className="mt-1 min-h-[80px] text-sm" // Shorter textarea
                disabled={creationStatus !== 'idle'}
              />
            </div>

            {/* Settings Section */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                    <Label htmlFor="retentionDays" className="text-sm font-medium">
                        Data Retention <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="retentionDays"
                        type="number"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(e.target.value)}
                        placeholder="e.g., 30"
                        min="1"
                        className="mt-1"
                        disabled={creationStatus !== 'idle'}
                     />
                     <p className="text-xs text-muted-foreground mt-1">Days to keep generated data.</p>
                </div>
                 <div>
                    <Label htmlFor="maxStorage" className="text-sm font-medium">
                        Max Storage (GB) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="maxStorage"
                        type="number"
                        value={maxStorage}
                        onChange={(e) => setMaxStorage(e.target.value)}
                        placeholder="e.g., 10"
                        min="1"
                        className="mt-1"
                        disabled={creationStatus !== 'idle'}
                     />
                      <p className="text-xs text-muted-foreground mt-1">Storage limit for this project.</p>
                </div>
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
           {/* ... (Keep same footer logic as JobCreationModal) ... */} 
          {(creationStatus === 'idle' || creationStatus === 'creating') && (
            <DialogClose asChild>
                {/* Disable cancel if externally marked as creating */}
                <Button type="button" variant="outline" disabled={isDisabled}>
                Cancel
                </Button>
            </DialogClose>
          )}
          {creationStatus === 'idle' && (
            // Use combined disabled state
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isDisabled}>
              {isCreating ? (
                 <span className="animate-pulse">Creating...</span>
              ) : (
                 'Create Project'
              )}
            </Button>
          )}
          {/* Keep existing logic for showing Creating... based on internal status for terminal view */}
          {creationStatus === 'creating' && !isCreating && (
             <Button type="button" disabled>
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