import { getFirebaseFirestore } from './firebase';
import { logger } from './logger';

export interface AuditLogEntry {
  action: string;
  resource: string;
  userId: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// Helper function to get Firestore instance
async function getDb() {
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Creates an audit log entry in the database
 * @param logEntry The audit log entry to create
 * @returns The ID of the created audit log entry
 */
export async function createAuditLog(logEntry: AuditLogEntry): Promise<string> {
  try {
    // Set timestamp if not provided
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }

    const db = await getDb();
    const docRef = await db.collection('audit_logs').add(logEntry);
    
    logger.info(`Created audit log entry: ${docRef.id}`, {
      action: logEntry.action,
      resource: logEntry.resource,
      userId: logEntry.userId
    });
    
    return docRef.id;
  } catch (error) {
    logger.error('Error creating audit log entry:', error);
    throw error;
  }
}

/**
 * Gets audit log entries for a specific resource
 * @param resource The resource to get audit logs for
 * @param limit Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getAuditLogsForResource(
  resource: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const snapshot = await db.collection('audit_logs')
      .where('resource', '==', resource)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as AuditLogEntry;
      return {
        ...data,
        id: doc.id,
      };
    });
  } catch (error) {
    logger.error('Error getting audit logs for resource:', error);
    throw error;
  }
}

/**
 * Gets audit log entries for a specific user
 * @param userId The user ID to get audit logs for
 * @param limit Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const snapshot = await db.collection('audit_logs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as AuditLogEntry;
      return {
        ...data,
        id: doc.id,
      };
    });
  } catch (error) {
    logger.error('Error getting audit logs for user:', error);
    throw error;
  }
}

/**
 * Gets recent audit log entries
 * @param limit Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getRecentAuditLogs(
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const snapshot = await db.collection('audit_logs')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as AuditLogEntry;
      return {
        ...data,
        id: doc.id,
      };
    });
  } catch (error) {
    logger.error('Error getting recent audit logs:', error);
    throw error;
  }
} 