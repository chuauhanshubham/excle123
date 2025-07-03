import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllReports, getAllMerchants } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, TrendingDown, TrendingUp, Percent, Search, Filter } from "lucide-react";
import * as XLSX from "xlsx";

export default function CombinedSummaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/reports'],
    queryFn: () => getAllReports(),
  });

  // Get all merchants from uploaded files (not just from reports)
  const { data: allMerchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: ['/api/all-merchants'],
    queryFn: () => getAllMerchants(),
  });

  if (isLoading || merchantsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading merchant data...</span>
      </div>
    );
  }

  const reports = data?.reports || [];
  const allMerchants = allMerchantsData?.merchants || [];
  
  if (allMerchants.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Combined Merchant Summary</h2>
          <p className="text-gray-600">Consolidated view of all processed merchant data from both deposit and withdrawal panels.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Merchant Data Available</h3>
          <p className="text-gray-600 mb-6">Please upload Excel files in the deposit and withdrawal panels first.</p>
        </div>
      </div>
    );
  }

  // Calculate totals from reports and use all merchants from uploaded files
  const totals = { totalDeposits: 0, totalWithdrawals: 0, totalCalculated: 0 };

  // Get totals from reports for calculated amounts
  reports.forEach((report: any) => {
    const summary = report.summary as any[];
    const totalRow = summary.find((row: any) => row.Merchant === 'TOTAL');
    
    if (totalRow) {
      if (report.panelType === 'Deposit') {
        totals.totalDeposits += totalRow['Total Amount'] || 0;
      } else {
        totals.totalWithdrawals += totalRow['Total Amount'] || 0;
      }
      
      // Find the calculated percentage amount
      Object.keys(totalRow).forEach(key => {
        if (key.includes('%') && typeof totalRow[key] === 'number') {
          totals.totalCalculated += totalRow[key];
        }
      });
    }
  });

  // Use ALL merchants from uploaded files (not just from reports)
  const allMerchantData = allMerchants.map((merchant: any) => ({
    Merchant: merchant.Merchant,
    Type: merchant.Type,
    DateRange: `From ${merchant.Type} Excel File`,
    TotalAmount: merchant.TotalAmount,
    TotalFees: merchant.TotalFees,
    TransactionCount: merchant.TransactionCount,
    CalculatedAmount: 0, // Will be 0 unless merchant was in a generated report
    Percentage: 0,
    LastUpdated: new Date(merchant.LastUpdated).toLocaleDateString()
  }));

  // Add calculated amounts from reports if available
  reports.forEach((report: any) => {
    const summary = report.summary as any[];
    summary.forEach((row: any) => {
      if (row.Merchant !== 'TOTAL') {
        const merchantIndex = allMerchantData.findIndex(
          (m: any) => m.Merchant === row.Merchant && m.Type === report.panelType
        );
        if (merchantIndex >= 0) {
          Object.keys(row).forEach(key => {
            if (key.includes('%') && typeof row[key] === 'number') {
              allMerchantData[merchantIndex].CalculatedAmount = row[key];
              const percentMatch = key.match(/(\d+(?:\.\d+)?)%/);
              if (percentMatch) {
                allMerchantData[merchantIndex].Percentage = parseFloat(percentMatch[1]);
              }
            }
          });
        }
      }
    });
  });

  // Function to export data to Excel  
  const exportToExcel = () => {
    // Filter merchant data for export
    const filteredData = allMerchantData.filter((merchant: any) => {
      const matchesSearch = merchant.Merchant.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || merchant.Type === typeFilter;
      return matchesSearch && matchesType;
    });
    try {
      // Prepare data for export
      const exportData = filteredData.map((row: any) => ({
        'Merchant Name': row.Merchant,
        'Type': row.Type,
        'Transaction Count': row.TransactionCount,
        'Total Amount (₹)': row.TotalAmount,
        'Total Fees (₹)': row.TotalFees,
        'Percentage (%)': row.Percentage || 0,
        'Calculated Amount (₹)': row.CalculatedAmount || 0,
        'Status': row.CalculatedAmount > 0 ? 'Processed' : 'Available',
        'Last Updated': row.LastUpdated
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Merchant Name
        { wch: 12 }, // Type
        { wch: 15 }, // Transaction Count
        { wch: 18 }, // Total Amount
        { wch: 15 }, // Total Fees
        { wch: 12 }, // Percentage
        { wch: 20 }, // Calculated Amount
        { wch: 12 }, // Status
        { wch: 15 }  // Last Updated
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Recent Summary Results');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const filename = `Recent_Summary_Results_${dateStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Filter and search merchant data
  const filteredMerchantData = allMerchantData.filter((merchant: any) => {
    const matchesSearch = merchant.Merchant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || merchant.Type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Combined Merchant Summary</h2>
        <p className="text-gray-600">Consolidated view of all processed merchant data from both deposit and withdrawal panels.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-purple-600">Total Merchants</p>
              <p className="text-xl font-bold text-purple-900">{allMerchantData.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-orange-600">Reports Generated</p>
              <p className="text-xl font-bold text-orange-900">{reports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-teal-600">Deposit Merchants</p>
              <p className="text-xl font-bold text-teal-900">{allMerchantData.filter((m: any) => m.Type === 'Deposit').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-pink-200 bg-pink-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-pink-600">Withdrawal Merchants</p>
              <p className="text-xl font-bold text-pink-900">{allMerchantData.filter((m: any) => m.Type === 'Withdrawal').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-green-600">Total Deposits</p>
                <p className="text-2xl font-bold text-green-900">₹{totals.totalDeposits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-red-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-red-600">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-900">₹{totals.totalWithdrawals.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Percent className="w-8 h-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-blue-600">Total Calculated</p>
                <p className="text-2xl font-bold text-blue-900">₹{totals.totalCalculated.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Data Table */}
      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <CardTitle>All Merchant Data ({filteredMerchantData.length} merchants)</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-1" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input
                placeholder="Search merchants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Deposit">Deposit Only</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Total Fees</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Calculated Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchantData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm || typeFilter !== 'all' ? 'No merchants found matching your filters' : 'No merchant data available'}
                    </TableCell>
                  </TableRow>
                ) : filteredMerchantData.map((row: any, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.Merchant}</TableCell>
                    <TableCell>
                      <Badge variant={row.Type === 'Deposit' ? 'default' : 'destructive'}>
                        {row.Type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{row.TransactionCount}</TableCell>
                    <TableCell className="font-mono">₹{row.TotalAmount.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">₹{row.TotalFees.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-blue-600">
                      {row.Percentage > 0 ? `${row.Percentage}%` : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-green-600">
                      {row.CalculatedAmount > 0 ? `₹${row.CalculatedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.CalculatedAmount > 0 ? 'default' : 'secondary'}>
                        {row.CalculatedAmount > 0 ? 'Processed' : 'Available'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
