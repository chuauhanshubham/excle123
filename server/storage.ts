import { uploadedFiles, reports, type UploadedFile, type InsertUploadedFile, type Report, type InsertReport } from "@shared/schema";

export interface IStorage {
  // Uploaded Files
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFileByPanelType(panelType: string): Promise<UploadedFile | undefined>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReportsByPanelType(panelType: string): Promise<Report[]>;
  getAllReports(): Promise<Report[]>;
}

export class MemStorage implements IStorage {
  private uploadedFiles: Map<number, UploadedFile>;
  private reports: Map<number, Report>;
  private currentFileId: number;
  private currentReportId: number;

  constructor() {
    this.uploadedFiles = new Map();
    this.reports = new Map();
    this.currentFileId = 1;
    this.currentReportId = 1;
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const id = this.currentFileId++;
    const file: UploadedFile = { 
      ...insertFile, 
      id, 
      createdAt: new Date() 
    };
    this.uploadedFiles.set(id, file);
    return file;
  }

  async getUploadedFileByPanelType(panelType: string): Promise<UploadedFile | undefined> {
    return Array.from(this.uploadedFiles.values())
      .find(file => file.panelType === panelType);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.currentReportId++;
    const report: Report = { 
      ...insertReport, 
      id, 
      createdAt: new Date() 
    };
    this.reports.set(id, report);
    return report;
  }

  async getReportsByPanelType(panelType: string): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(report => report.panelType === panelType);
  }

  async getAllReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }
}

export const storage = new MemStorage();
