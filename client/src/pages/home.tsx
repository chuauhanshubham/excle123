import { useState } from "react";
import SummaryPanel from "@/components/summary-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface HomePageProps {
  summaries: Record<string, any[]>;
  setSummaries: (summaries: Record<string, any[]>) => void;
}

export default function HomePage({ summaries, setSummaries }: HomePageProps) {
  const handleSummaryUpdate = (panelType: string, summary: any[]) => {
    setSummaries({
      ...summaries,
      [panelType]: summary,
    });
  };

  // Combine recent results from both panels for display
  const recentResults = [
    ...(summaries['Deposit'] || []).map(item => ({ ...item, Type: 'Deposit' })),
    ...(summaries['Withdrawal'] || []).map(item => ({ ...item, Type: 'Withdrawal' }))
  ].filter(item => item.Merchant !== 'TOTAL');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Data Processing</h2>
        <p className="text-gray-600">Upload Excel files to process merchant transaction data with custom percentage calculations.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <SummaryPanel panelType="Deposit" onSummaryUpdate={handleSummaryUpdate} />
        <SummaryPanel panelType="Withdrawal" onSummaryUpdate={handleSummaryUpdate} />
      </div>

      {recentResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Summary Results</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Total Fees</TableHead>
                  <TableHead>Calculated Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentResults.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.Merchant}</TableCell>
                    <TableCell>
                      <Badge variant={row.Type === 'Deposit' ? 'default' : 'destructive'}>
                        {row.Type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${(row['Total Amount'] || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${(row['Total Fees'] || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-semibold">
                      ${(Object.values(row).find(val => 
                        typeof val === 'number' && val > 0 && 
                        !['Total Amount', 'Total Fees'].includes(Object.keys(row).find(k => row[k] === val) || '')
                      ) as number || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
