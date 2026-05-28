import { randomUUID } from 'crypto';

export type AuditEventType =
    | 'DISPUTE_OPENED'
    | 'DISPUTE_RESOLVED'
    | 'DISPUTE_RESOLVED_FAILED'
    | 'DISPUTE_OPEN_FAILED';

export interface AuditLogEntry {
    id: string;
    eventType: AuditEventType;
    timestamp: string;
    actorAddress: string;
    commitmentId: string;
    details: Record<string, unknown>;
}

const auditLogStore: AuditLogEntry[] = [];

export function recordAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logEntry: AuditLogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        ...entry,
    };

    auditLogStore.push(logEntry);

    console.log(JSON.stringify({
        event: 'AuditLog',
        ...logEntry,
    }));

    return logEntry;
}

export function getAuditLog(commitmentId: string): AuditLogEntry[] {
    return auditLogStore.filter(entry => entry.commitmentId === commitmentId);
}

export function clearAuditLog(): void {
    auditLogStore.length = 0;
}
