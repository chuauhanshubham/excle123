import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  panelType: text("panel_type").notNull(), // 'Deposit' or 'Withdrawal'
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  merchants: text("merchants").array().notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  panelType: text("panel_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  merchantPercents: jsonb("merchant_percents").notNull(),
  summary: jsonb("summary").notNull(),
  downloadUrl: text("download_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Validation schemas for API endpoints
export const uploadRequestSchema = z.object({
  type: z.enum(['Deposit', 'Withdrawal']),
});

export const generateReportSchema = z.object({
  type: z.enum(['Deposit', 'Withdrawal']),
  merchantPercents: z.record(z.string(), z.number()),
  startDate: z.string(),
  endDate: z.string(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type GenerateReportRequest = z.infer<typeof generateReportSchema>;
