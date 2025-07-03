import { apiRequest } from "@/lib/queryClient";

export async function uploadFile(file: File, type: 'Deposit' | 'Withdrawal') {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/upload?type=${type}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function generateReport(data: {
  type: 'Deposit' | 'Withdrawal';
  merchantPercents: Record<string, number>;
  startDate: string;
  endDate: string;
}) {
  return apiRequest('POST', `/api/generate?type=${data.type}`, {
    merchantPercents: data.merchantPercents,
    startDate: data.startDate,
    endDate: data.endDate,
  }).then(res => res.json());
}

export async function getAllReports() {
  return apiRequest('GET', '/api/reports').then(res => res.json());
}

export async function getMerchantTotals(data: {
  type: 'Deposit' | 'Withdrawal';
  startDate: string;
  endDate: string;
}) {
  return apiRequest('POST', '/api/merchant-totals', {
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
  }).then(res => res.json());
}

export async function getAllMerchants() {
  return apiRequest('GET', '/api/all-merchants').then(res => res.json());
}
