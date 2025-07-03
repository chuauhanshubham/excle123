import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, generateReport, getMerchantTotals } from "@/lib/api";
import { CloudUpload, Calculator, RefreshCw, Download, Plus, Eye } from "lucide-react";

interface SummaryPanelProps {
  panelType: 'Deposit' | 'Withdrawal';
  onSummaryUpdate: (panelType: string, summary: any) => void;
}

export default function SummaryPanel({ panelType, onSummaryUpdate }: SummaryPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [merchantPercents, setMerchantPercents] = useState<Record<string, number>>({});
  const [defaultPercent, setDefaultPercent] = useState(3.6);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<any[] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch merchant totals for real-time calculation preview
  const { data: merchantTotalsData } = useQuery({
    queryKey: ['/api/merchant-totals', panelType, startDate, endDate],
    queryFn: () => getMerchantTotals({ type: panelType, startDate, endDate }),
    enabled: !!(startDate && endDate && merchants.length > 0),
    refetchOnWindowFocus: false,
  });

  const merchantTotals = merchantTotalsData?.merchantTotals || {};

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, panelType),
    onSuccess: (data) => {
      setMerchants(data.merchants || []);
      setSelectedMerchants([]);
      setMerchantPercents({});
      setSummary(null);
      setDownloadUrl(null);
      toast({
        title: "Success",
        description: `${panelType} file uploaded successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: (data) => {
      setSummary(data.summary);
      setDownloadUrl(data.downloadUrl);
      onSummaryUpdate(panelType, data.summary);
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleGenerate = () => {
    if (selectedMerchants.length === 0 || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedPercents: Record<string, number> = {};
    selectedMerchants.forEach((merchant) => {
      selectedPercents[merchant] = merchantPercents[merchant] || defaultPercent;
    });

    generateMutation.mutate({
      type: panelType,
      merchantPercents: selectedPercents,
      startDate,
      endDate,
    });
  };

  const handleSelectAll = () => {
    const allMerchants = [...merchants];
    const defaultPercents: Record<string, number> = {};
    allMerchants.forEach((merchant) => {
      defaultPercents[merchant] = merchantPercents[merchant] || defaultPercent;
    });
    setSelectedMerchants(allMerchants);
    setMerchantPercents(defaultPercents);
  };

  const handleMerchantToggle = (merchant: string, checked: boolean) => {
    if (checked) {
      setSelectedMerchants(prev => [...prev, merchant]);
      setMerchantPercents(prev => ({
        ...prev,
        [merchant]: prev[merchant] || defaultPercent
      }));
    } else {
      setSelectedMerchants(prev => prev.filter(m => m !== merchant));
      setMerchantPercents(prev => {
        const newPercents = { ...prev };
        delete newPercents[merchant];
        return newPercents;
      });
    }
  };

  const handlePercentChange = (merchant: string, value: number) => {
    setMerchantPercents(prev => ({
      ...prev,
      [merchant]: value
    }));
  };

  const isDeposit = panelType === 'Deposit';
  const colorClasses = isDeposit ? {
    gradient: 'from-green-600 to-green-700',
    button: 'bg-green-600 hover:bg-green-700',
    border: 'border-green-400',
    ring: 'focus:ring-green-500 focus:border-green-500',
    accent: 'text-green-600 hover:text-green-700',
    bg: 'bg-green-50',
    checkbox: 'text-green-600 focus:ring-green-500'
  } : {
    gradient: 'from-red-600 to-red-700',
    button: 'bg-red-600 hover:bg-red-700',
    border: 'border-red-400',
    ring: 'focus:ring-red-500 focus:border-red-500',
    accent: 'text-red-600 hover:text-red-700',
    bg: 'bg-red-50',
    checkbox: 'text-red-600 focus:ring-red-500'
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`bg-gradient-to-r ${colorClasses.gradient} text-white`}>
        <h3 className="text-xl font-semibold flex items-center">
          {isDeposit ? (
            <svg className="w-5 h-5 mr-3 text-green-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mr-3 text-red-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" transform="rotate(180 10 10)" />
            </svg>
          )}
          {panelType} Panel
        </h3>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* File Upload Section */}
        <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:${colorClasses.border} transition-colors`}>
          <CloudUpload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Upload {panelType} Data</h4>
          <p className="text-sm text-gray-600 mb-4">Choose Excel file (.xlsx, .xls)</p>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id={`${panelType}-file`}
          />
          <Label htmlFor={`${panelType}-file`} className={`inline-flex items-center px-4 py-2 ${colorClasses.button} text-white rounded-lg cursor-pointer transition-colors`}>
            <Plus className="w-4 h-4 mr-2" />
            Select File
          </Label>
          <div className="mt-3 text-sm text-gray-500">
            {file ? file.name : 'No file selected'}
          </div>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploadMutation.isPending}
          className={`w-full ${colorClasses.button}`}
        >
          {uploadMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4 mr-2" />
              Upload File
            </>
          )}
        </Button>

        {/* Merchant Selection */}
        {merchants.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">Select Merchants</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSelectAll}
                className={colorClasses.accent}
              >
                Select All
              </Button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
              {merchants.map((merchant) => (
                <div key={merchant} className="flex items-center">
                  <Checkbox
                    id={`${panelType}-${merchant}`}
                    checked={selectedMerchants.includes(merchant)}
                    onCheckedChange={(checked) => handleMerchantToggle(merchant, checked as boolean)}
                    className={colorClasses.checkbox}
                  />
                  <Label htmlFor={`${panelType}-${merchant}`} className="ml-3 text-sm text-gray-700">
                    {merchant}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date Range */}
        {selectedMerchants.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={colorClasses.ring}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={colorClasses.ring}
              />
            </div>
          </div>
        )}

        {/* Percentage Settings */}
        {selectedMerchants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Percentage Configuration</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newPercents: Record<string, number> = {};
                  selectedMerchants.forEach((merchant) => {
                    newPercents[merchant] = defaultPercent;
                  });
                  setMerchantPercents(newPercents);
                }}
                className="text-xs"
              >
                Apply Default to All
              </Button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Default Percentage (for new merchants)</Label>
              <div className="relative w-32">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={defaultPercent}
                  onChange={(e) => setDefaultPercent(parseFloat(e.target.value) || 0)}
                  className={`pr-8 ${colorClasses.ring}`}
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">This percentage will be used for newly selected merchants</p>
            </div>
            
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Individual Merchant Percentages:</h5>
              {selectedMerchants.map((merchant) => {
                const currentPercent = merchantPercents[merchant] || defaultPercent;
                const merchantData = merchantTotals[merchant];
                const totalAmount = merchantData?.amount || 0;
                const calculatedAmount = totalAmount * currentPercent / 100;
                
                return (
                  <div key={merchant} className={`flex items-center justify-between p-4 ${colorClasses.bg} rounded-lg border`}>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">{merchant}</span>
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        {merchantData ? (
                          <>
                            <div>Total Amount: ₹{totalAmount.toLocaleString()}</div>
                            <div className="font-medium text-green-600">
                              <Eye className="w-3 h-3 inline mr-1" />
                              {currentPercent}% = ₹{calculatedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                          </>
                        ) : (
                          <div>Select date range to see calculation preview</div>
                        )}
                      </div>
                    </div>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={currentPercent}
                        onChange={(e) => handlePercentChange(merchant, parseFloat(e.target.value) || 0)}
                        className="px-2 py-1 pr-6 text-sm font-medium"
                      />
                      <span className="absolute right-1 top-1 text-xs text-gray-500">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary of all calculations */}
            {startDate && endDate && selectedMerchants.length > 0 && (
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mt-4">
                <h6 className="text-sm font-medium text-gray-700 mb-2">Live Calculation Summary</h6>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const totalOriginalAmount = selectedMerchants.reduce((sum, merchant) => {
                      const merchantData = merchantTotals[merchant];
                      return sum + (merchantData?.amount || 0);
                    }, 0);
                    
                    const totalCalculatedAmount = selectedMerchants.reduce((sum, merchant) => {
                      const currentPercent = merchantPercents[merchant] || defaultPercent;
                      const merchantData = merchantTotals[merchant];
                      const totalAmount = merchantData?.amount || 0;
                      return sum + (totalAmount * currentPercent / 100);
                    }, 0);

                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Original Amount:</span>
                          <span className="font-medium">₹{totalOriginalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Calculated Amount:</span>
                          <span className="font-bold text-blue-600">₹{totalCalculatedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-slate-300">
                          <span className="text-gray-500">Selected Merchants:</span>
                          <span className="text-gray-500">{selectedMerchants.length}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedMerchants.length > 0 && startDate && endDate && (
          <div className="flex space-x-3">
            <Button 
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className={`flex-1 ${colorClasses.button}`}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedMerchants([]);
                setMerchantPercents({});
                setStartDate('');
                setEndDate('');
                setSummary(null);
                setDownloadUrl(null);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        )}

        {/* Success Message with Download */}
        {summary && downloadUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-medium text-green-800">Report Generated Successfully</h5>
                <p className="text-sm text-green-700 mt-1">
                  Processed {selectedMerchants.length} merchant{selectedMerchants.length !== 1 ? 's' : ''} with custom percentages
                </p>
                <a 
                  href={downloadUrl}
                  download
                  className="mt-2 inline-flex items-center text-sm text-green-600 hover:text-green-700 font-medium underline"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Excel Report
                </a>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
