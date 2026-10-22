/**
 * Messenger REST API Controller
 * Admin SUN89 — Biro Jasa Management System
 */

import { Request, Response } from "express";
import { messengerService } from "../services/messengerService";
import { normalizeReimbursementPayload } from "../utils/aliasNormalizer";

export async function getMessengersWithStats(req: Request, res: Response): Promise<void> {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const data = messengerService.getMessengersWithStats(dateFrom, dateTo);

  res.status(200).json({
    success: true,
    data,
    total: data.length,
    timestamp: new Date().toISOString(),
  });
}

export async function getMessengerHistory(req: Request, res: Response): Promise<void> {
  const q = req.query as Record<string, string>;
  const messenger = q.messenger || q.messengerName || q.messenger_name;
  const employeeId = q.employeeId || q.employee_id;
  const { taskType, dateFrom, dateTo, search } = q;
  const data = messengerService.getMessengerTaskHistory({
    messenger,
    employeeId,
    taskType,
    dateFrom,
    dateTo,
    search,
  });

  res.status(200).json({
    success: true,
    data,
    total: data.length,
    timestamp: new Date().toISOString(),
  });
}

export async function getTaskDetail(req: Request, res: Response): Promise<void> {
  const { orderNo } = req.params;
  const { taskType } = req.query as { taskType?: string };
  const data = messengerService.getTaskDetail(orderNo, taskType);

  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function getReimbursements(req: Request, res: Response): Promise<void> {
  const q = req.query as Record<string, string>;
  const employeeId = q.employeeId || q.employee_id;
  const orderNo = q.orderNo || q.order_no;
  const status = q.status;
  const data = messengerService.getAllReimbursements({ employeeId, orderNo, status });

  res.status(200).json({
    success: true,
    data,
    total: data.length,
    timestamp: new Date().toISOString(),
  });
}

export async function createReimbursement(req: Request, res: Response): Promise<void> {
  normalizeReimbursementPayload(req.body);
  const data = messengerService.createReimbursement(req.body, (req as any).user);

  res.status(201).json({
    success: true,
    data,
    message: "Pengajuan biaya berhasil diajukan.",
    timestamp: new Date().toISOString(),
  });
}

export async function reviewReimbursement(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { decision, reviewNotes, approvedAmount, rejectedAmount } = req.body;
  const user = (req as any).user;

  const data = messengerService.reviewReimbursement(
    id,
    decision,
    user,
    reviewNotes,
    approvedAmount,
    rejectedAmount
  );

  res.status(200).json({
    success: true,
    data,
    message: `Pengajuan biaya '${id}' berhasil ${decision.toLowerCase()}.`,
    timestamp: new Date().toISOString(),
  });
}

export async function payReimbursement(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { paymentMethod, transactionRef, channel } = req.body;
  const user = (req as any).user;

  const data = messengerService.payReimbursement(id, user, { paymentMethod, transactionRef, channel });

  res.status(200).json({
    success: true,
    data,
    message: `Pencairan reimbursement '${id}' berhasil dibukukan.`,
    timestamp: new Date().toISOString(),
  });
}
