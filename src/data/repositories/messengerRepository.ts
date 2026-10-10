/**
 * Messenger Repository Interface and In-Memory Implementation
 * Admin SUN89 — Biro Jasa Management System
 */

import { MessengerTaskItem, MessengerTaskStatus } from "../../domain/messenger/types";
import { orderStore } from "../../app/data/orderStore";
import { deriveMessengerTasksFromOrders } from "../../app/data/messengerTaskAdapter";

export interface IMessengerRepository {
  getAllTasks(): MessengerTaskItem[];
  getTasksByMessenger(messengerName: string): MessengerTaskItem[];
  getTasksByStatus(status: MessengerTaskStatus): MessengerTaskItem[];
  updateTaskStatus(orderNo: string, status: MessengerTaskStatus, notes?: string): void;
  subscribe(listener: () => void): () => void;
}

export class InMemoryMessengerRepository implements IMessengerRepository {
  getAllTasks(): MessengerTaskItem[] {
    const active = orderStore.getActiveOrders();
    return deriveMessengerTasksFromOrders(active);
  }

  getTasksByMessenger(messengerName: string): MessengerTaskItem[] {
    return this.getAllTasks().filter((t) => t.messenger === messengerName);
  }

  getTasksByStatus(status: MessengerTaskStatus): MessengerTaskItem[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  updateTaskStatus(orderNo: string, status: MessengerTaskStatus, notes?: string): void {
    orderStore.updateOrder(orderNo, {
      messengerTaskStatus: status,
      messengerTaskNotes: notes,
    });
  }

  subscribe(listener: () => void): () => void {
    return orderStore.subscribe(listener);
  }
}

export const messengerRepository = new InMemoryMessengerRepository();
