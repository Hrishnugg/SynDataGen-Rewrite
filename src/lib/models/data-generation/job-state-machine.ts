/**
 * Job State Machine
 * 
 * Manages the state transitions for data generation jobs.
 */

import { JobStatus, JobStage, JobError, JobStatusValue } from './types';

type JobState = JobStatusValue;

/**
 * Valid state transitions for jobs
 */
const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  'queued': ['running', 'cancelled', 'failed'],
  'running': ['completed', 'failed', 'cancelled', 'paused'],
  'completed': [],
  'failed': ['queued'],
  'cancelled': ['queued'],
  'paused': ['running', 'cancelled', 'failed'],
  'pending': ['queued', 'cancelled'],
  'accepted': ['queued', 'cancelled'],
  'rejected': ['queued']
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(currentState: JobState, newState: JobState): boolean {
  return VALID_TRANSITIONS[currentState]?.includes(newState) || false;
}

/**
 * Error codes for job state transitions
 */
export const StateTransitionErrors = {
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  COOLDOWN_PERIOD: 'COOLDOWN_PERIOD',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
};

/**
 * Create default stages for a job based on the job type
 */
export function createDefaultStages(dataType: string): JobStage[] {
  // Different job types might have different stages
  const defaultStages: JobStage[] = [
    {
      name: 'initialization',
      status: 'pending',
      progress: 0
    },
    {
      name: 'data-processing',
      status: 'pending',
      progress: 0
    },
    {
      name: 'model-generation',
      status: 'pending',
      progress: 0
    },
    {
      name: 'data-generation',
      status: 'pending',
      progress: 0
    },
    {
      name: 'output-formatting',
      status: 'pending',
      progress: 0
    },
    {
      name: 'finalization',
      status: 'pending',
      progress: 0
    },
  ];

  // Customize stages based on data type if needed
  if (dataType === 'tabular') {
    // Add tabular-specific stages
  } else if (dataType === 'text') {
    // Add text-specific stages
  }

  return defaultStages;
}

/**
 * Calculate overall progress based on stages
 */
export function calculateProgress(stages: JobStage[]): number {
  if (!stages.length) return 0;
  
  // Define stage weights (sum should be 100)
  const stageWeights: Record<string, number> = {
    'initialization': 5,
    'data-processing': 15,
    'model-generation': 30,
    'data-generation': 35,
    'output-formatting': 10,
    'finalization': 5,
  };
  
  let totalProgress = 0;
  
  stages.forEach(stage => {
    const weight = stageWeights[stage.name] || 0;
    
    if (stage.status === 'completed') {
      totalProgress += weight;
    } else if (stage.status === 'running' && stage.progress !== undefined) {
      totalProgress += (weight * stage.progress / 100);
    }
  });
  
  return Math.round(totalProgress);
}

/**
 * Update a stage status
 */
export function updateStageStatus(
  stages: JobStage[],
  stageName: string,
  status: JobStage['status'],
  progress?: number
): JobStage[] {
  return stages.map(stage => {
    if (stage.name === stageName) {
      const updatedStage: JobStage = {
        ...stage,
        status,
        progress: progress !== undefined ? progress : stage.progress,
      };
      
      // Add start time if stage is now running
      if (status === 'running' && !stage.startTime) {
        updatedStage.startTime = new Date();
      }
      
      // Add end time if stage is now completed or failed
      if (['completed', 'failed'].includes(status) && !stage.endTime) {
        updatedStage.endTime = new Date();
      }
      
      return updatedStage;
    }
    return stage;
  });
}

/**
 * Create an error object
 */
export function createJobError(code: string, message: string, details?: any): JobError {
  return {
    code,
    message,
    details
  };
}

/**
 * Get the next stage to process
 */
export function getNextPendingStage(stages: JobStage[]): JobStage | null {
  // Find the first stage that's pending
  const pendingStage = stages.find(stage => stage.status === 'pending');
  
  // If no pending stage is found, return null
  if (!pendingStage) {
    return null;
  }
  
  // Check if the previous stage is completed
  const stageIndex = stages.findIndex(s => s.name === pendingStage.name);
  
  // If this is the first stage or the previous stage is completed, return this stage
  if (stageIndex === 0 || stages[stageIndex - 1].status === 'completed') {
    return pendingStage;
  }
  
  // Otherwise, return null as the previous stage is not completed
  return null;
}

/**
 * Check if all stages are completed
 */
export function areAllStagesCompleted(stages: JobStage[]): boolean {
  return stages.every(stage => stage.status === 'completed');
}

/**
 * Check if any stage has failed
 */
export function hasAnyStageFailedOrCancelled(stages: JobStage[]): boolean {
  return stages.some(stage => ['failed', 'cancelled'].includes(stage.status));
}

/**
 * Job State Machine Class
 * 
 * Provides an object-oriented interface to the job state machine functions.
 */
export class JobStateMachine {
  /**
   * Initialize a job in the state machine
   */
  async initiate(job: any): Promise<void> {
    // In a real implementation, this would store the job state,
    // initialize stages, etc. For now, this is just a mock implementation
    console.log(`Initiating job ${job.id} in state machine`);
    return Promise.resolve();
  }

  /**
   * Transition a job to a new state
   */
  async transition(job: any, newState: JobState): Promise<void> {
    // Verify the transition is valid
    if (!isValidTransition(job.status, newState)) {
      throw new Error(`Invalid job state transition from ${job.status} to ${newState}`);
    }
    
    // In a real implementation, this would update the job state,
    // trigger side effects, etc.
    console.log(`Transitioning job ${job.id} from ${job.status} to ${newState}`);
    return Promise.resolve();
  }
} 