import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs-extra";
import path from "path";
import { uploadRequestSchema, generateReportSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure directories exist
  const uploadDir = path.join(process.cwd(), 'uploads');
  const outputDir = path.join(process.cwd(), 'output');
  fs.ensureDirSync(uploadDir);
  fs.ensureDirSync(outputDir);

  // Serve output files
  app.use('/output', express.static(outputDir));

  // Multer setup for file uploads
  const fileStorage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const panelType = req.query.type as string;
      const panelId = panelType === 'Withdrawal' ? '2' : '1';
      cb(null, `panel-${panelId}-input.xlsx`);
    }
  });

  const fileFilter = (req: any, file: any, cb: any) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    cb(null, allowed.includes(file.mimetype));
  };

  const upload = multer({ 
    storage: fileStorage, 
    fileFilter,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit instead of Infinity for stability
      fieldSize: 10 * 1024 * 1024, // 10MB
      fieldNameSize: 1000,
      fields: 100,
      files: 10,
      parts: 1000,
      headerPairs: 2000
    }
  });

  // Date extraction helper
  function extractDateOnly(value: any): string {
    if (!value) return '';
    if (typeof value === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(excelEpoch.getTime() + (value - 1) * 86400000).toISOString().slice(0, 10);
    }
    if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}/.test(value)) {
      const [d, m, y] = value.split(' ')[0].split('-');
      return new Date(`${y}-${m}-${d}`).toISOString().slice(0, 10);
    }
    return new Date(value).toISOString().slice(0, 10);
  }

  // Upload endpoint
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      const { type } = uploadRequestSchema.parse(req.query);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet);

      if (!rawData.length) {
        return res.status(400).json({ error: 'Excel file is empty' });
      }

      const processedData = rawData.map((row: any) => {
        const dateVal = row['Date'] || row['Transaction Date'] || row['Created At'];
        return { ...row, DateOnly: extractDateOnly(dateVal) };
      });

      const merchants = Array.from(new Set(processedData.map((r: any) => r['Merchant Name']).filter(Boolean)));

      const uploadedFile = await storage.createUploadedFile({
        panelType: type,
        originalName: req.file.originalname,
        filePath: req.file.path,
        merchants,
        data: processedData
      });

      res.json({ success: true, merchants });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // Generate report endpoint
  app.post('/api/generate', async (req, res) => {
    try {
      const { type, merchantPercents, startDate, endDate } = generateReportSchema.parse({
        ...req.body,
        type: req.query.type
      });

      const uploadedFile = await storage.getUploadedFileByPanelType(type);
      if (!uploadedFile) {
        return res.status(400).json({ error: 'No data available. Please upload a file first.' });
      }

      const data = uploadedFile.data as any[];
      const normalizedStart = new Date(startDate).toISOString().slice(0, 10);
      const normalizedEnd = new Date(endDate).toISOString().slice(0, 10);

      const filteredData = [];
      const summaryData = [];
      let grandW = 0, grandF = 0, grandP = 0;

      for (const merchant in merchantPercents) {
        const percent = parseFloat(merchantPercents[merchant].toString());
        if (isNaN(percent)) continue;

        const rows = data.filter((row: any) =>
          row.DateOnly >= normalizedStart &&
          row.DateOnly <= normalizedEnd &&
          row['Merchant Name'] === merchant
        );

        if (!rows.length) continue;

        let totalW = 0, totalF = 0, totalP = 0;

        rows.forEach((row: any) => {
          const withdrawal = parseFloat(row['Withdrawal Amount'] || row['Deposit Amount'] || 0);
          const fee = parseFloat(row['Withdrawal Fees'] || row['Deposit Fees'] || 0);
          const percentAmount = withdrawal * percent / 100;

          totalW += withdrawal;
          totalF += fee;
          totalP += percentAmount;

          filteredData.push({
            Merchant: merchant,
            'Amount': withdrawal,
            'Fees': fee,
            [`${percent}% Amount`]: parseFloat(percentAmount.toFixed(2))
          });
        });

        filteredData.push({
          Merchant: `Total of ${merchant}`,
          'Amount': parseFloat(totalW.toFixed(2)),
          'Fees': parseFloat(totalF.toFixed(2)),
          [`${percent}% Amount`]: parseFloat(totalP.toFixed(2))
        });

        grandW += totalW;
        grandF += totalF;
        grandP += totalP;

        summaryData.push({
          Merchant: merchant,
          'Total Amount': parseFloat(totalW.toFixed(2)),
          'Total Fees': parseFloat(totalF.toFixed(2)),
          [`${percent}% Amount`]: parseFloat(totalP.toFixed(2))
        });
      }

      filteredData.push({
        Merchant: 'GRAND TOTAL',
        'Amount': parseFloat(grandW.toFixed(2)),
        'Fees': parseFloat(grandF.toFixed(2)),
        [`TOTAL % Amount`]: parseFloat(grandP.toFixed(2))
      });

      summaryData.push({
        Merchant: 'TOTAL',
        'Total Amount': parseFloat(grandW.toFixed(2)),
        'Total Fees': parseFloat(grandF.toFixed(2)),
        [`TOTAL % Amount`]: parseFloat(grandP.toFixed(2))
      });

      // Create Excel file
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredData), 'Detailed Data');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

      const filename = `report-${type.toLowerCase()}-${Date.now()}.xlsx`;
      const filepath = path.join(outputDir, filename);
      XLSX.writeFile(wb, filepath);

      const downloadUrl = `/output/${filename}`;

      await storage.createReport({
        panelType: type,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        merchantPercents,
        summary: summaryData,
        downloadUrl
      });

      res.json({
        success: true,
        summary: summaryData,
        downloadUrl
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate report' });
    }
  });

  // Get all merchants with their data from uploaded files
  app.get('/api/all-merchants', async (req, res) => {
    try {
      const depositFile = await storage.getUploadedFileByPanelType('Deposit');
      const withdrawalFile = await storage.getUploadedFileByPanelType('Withdrawal');
      
      const allMerchants: any[] = [];
      
      // Process deposit file
      if (depositFile && depositFile.data) {
        const data = depositFile.data as any[];
        const merchantTotals: Record<string, { amount: number; fees: number; count: number }> = {};
        
        data.forEach((row: any) => {
          const merchant = row['Merchant Name'];
          const amount = parseFloat(row['Deposit Amount'] || 0);
          const fees = parseFloat(row['Deposit Fees'] || 0);
          
          if (!merchantTotals[merchant]) {
            merchantTotals[merchant] = { amount: 0, fees: 0, count: 0 };
          }
          merchantTotals[merchant].amount += amount;
          merchantTotals[merchant].fees += fees;
          merchantTotals[merchant].count++;
        });
        
        Object.entries(merchantTotals).forEach(([merchant, totals]) => {
          allMerchants.push({
            Merchant: merchant,
            Type: 'Deposit',
            TotalAmount: totals.amount,
            TotalFees: totals.fees,
            TransactionCount: totals.count,
            LastUpdated: depositFile.createdAt
          });
        });
      }
      
      // Process withdrawal file
      if (withdrawalFile && withdrawalFile.data) {
        const data = withdrawalFile.data as any[];
        const merchantTotals: Record<string, { amount: number; fees: number; count: number }> = {};
        
        data.forEach((row: any) => {
          const merchant = row['Merchant Name'];
          const amount = parseFloat(row['Withdrawal Amount'] || 0);
          const fees = parseFloat(row['Withdrawal Fees'] || 0);
          
          if (!merchantTotals[merchant]) {
            merchantTotals[merchant] = { amount: 0, fees: 0, count: 0 };
          }
          merchantTotals[merchant].amount += amount;
          merchantTotals[merchant].fees += fees;
          merchantTotals[merchant].count++;
        });
        
        Object.entries(merchantTotals).forEach(([merchant, totals]) => {
          allMerchants.push({
            Merchant: merchant,
            Type: 'Withdrawal',
            TotalAmount: totals.amount,
            TotalFees: totals.fees,
            TransactionCount: totals.count,
            LastUpdated: withdrawalFile.createdAt
          });
        });
      }
      
      res.json({ merchants: allMerchants });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get merchant totals for preview calculation
  app.post('/api/merchant-totals', async (req, res) => {
    try {
      const { type, startDate, endDate } = req.body;
      
      const uploadedFile = await storage.getUploadedFileByPanelType(type);
      if (!uploadedFile) {
        return res.status(400).json({ error: 'No data available. Please upload a file first.' });
      }

      const data = uploadedFile.data as any[];
      const normalizedStart = new Date(startDate).toISOString().slice(0, 10);
      const normalizedEnd = new Date(endDate).toISOString().slice(0, 10);

      const merchantTotals: Record<string, { amount: number; fees: number }> = {};

      data.forEach((row: any) => {
        if (row.DateOnly >= normalizedStart && row.DateOnly <= normalizedEnd) {
          const merchant = row['Merchant Name'];
          const amount = parseFloat(row['Withdrawal Amount'] || row['Deposit Amount'] || 0);
          const fees = parseFloat(row['Withdrawal Fees'] || row['Deposit Fees'] || 0);

          if (!merchantTotals[merchant]) {
            merchantTotals[merchant] = { amount: 0, fees: 0 };
          }
          merchantTotals[merchant].amount += amount;
          merchantTotals[merchant].fees += fees;
        }
      });

      res.json({ merchantTotals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all reports for combined view
  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json({ reports });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch reports' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
