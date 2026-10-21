import { supabaseService } from './supabaseService';

export interface OfflineQueueItem {
  id: string;
  type:
    | 'upsert_school'
    | 'delete_school'
    | 'upsert_teacher'
    | 'delete_teacher'
    | 'upsert_course'
    | 'delete_course'
    | 'upsert_classroom'
    | 'delete_classroom'
    | 'insert_transaction'
    | 'delete_transaction'
    | 'upsert_debt'
    | 'delete_debt'
    | 'insert_expense'
    | 'delete_expense';
  payload: any;
  schoolId?: string;
  options?: any;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'school_saas_offline_queue';

export const offlineQueue = {
  getQueue(): OfflineQueueItem[] {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading offline queue:', e);
      return [];
    }
  },

  saveQueue(queue: OfflineQueueItem[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Error saving offline queue:', e);
    }
  },

  enqueue(type: OfflineQueueItem['type'], payload: any, schoolId?: string, options?: any): void {
    const queue = this.getQueue();
    const item: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      schoolId,
      options,
      timestamp: Date.now(),
    };
    queue.push(item);
    this.saveQueue(queue);
  },

  getPendingCount(): number {
    return this.getQueue().length;
  },

  clearQueue(): void {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing offline queue:', e);
    }
  },

  async processQueue(): Promise<{ processed: number; remaining: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, remaining: 0 };

    const remainingQueue: OfflineQueueItem[] = [];
    let processed = 0;

    for (const item of queue) {
      try {
        let success = false;
        switch (item.type) {
          case 'upsert_school':
            success = !!(await supabaseService.upsertSchool(item.payload));
            break;
          case 'delete_school':
            success = !!(await supabaseService.deleteSchool(item.payload));
            break;
          case 'upsert_teacher':
            success = !!(await supabaseService.upsertTeacher(item.payload, item.schoolId));
            break;
          case 'delete_teacher':
            success = !!(await supabaseService.deleteTeacher(item.payload));
            break;
          case 'upsert_course': {
            const courseRes = await supabaseService.upsertCourse(item.payload, item.schoolId, item.options);
            success = !!(courseRes && courseRes.success);
            break;
          }
          case 'delete_course':
            success = !!(await supabaseService.deleteCourse(item.payload));
            break;
          case 'upsert_classroom':
            success = !!(await supabaseService.upsertClassroom(item.payload, item.schoolId));
            break;
          case 'delete_classroom':
            success = !!(await supabaseService.deleteClassroom(item.payload));
            break;
          case 'insert_transaction':
            success = !!(await supabaseService.insertTransaction(item.payload, item.schoolId));
            break;
          case 'delete_transaction':
            success = !!(await supabaseService.deleteTransaction(item.payload));
            break;
          case 'upsert_debt':
            success = !!(await supabaseService.upsertDebt(item.payload, item.schoolId));
            break;
          case 'delete_debt':
            success = !!(await supabaseService.deleteDebt(item.payload));
            break;
          case 'insert_expense':
            success = !!(await supabaseService.upsertExpense(item.payload, item.schoolId));
            break;
          case 'delete_expense':
            success = !!(await supabaseService.deleteExpense(item.payload));
            break;
          default:
            success = true;
            break;
        }

        if (success) {
          processed++;
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        console.warn('Failed to process offline queue item:', item, err);
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    return { processed, remaining: remainingQueue.length };
  },
};
