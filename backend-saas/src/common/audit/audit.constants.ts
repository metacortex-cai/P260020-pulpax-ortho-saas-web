/** BullMQ kuyruk adı — audit logları için asenkron kuyruk */
export const AUDIT_QUEUE = 'audit-log';

/** Kuyrukta çalışan iş tipleri */
export const AUDIT_JOB = {
  LOG_EVENT: 'log-event',
} as const;
