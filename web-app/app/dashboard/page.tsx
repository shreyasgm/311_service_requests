'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import DashboardTable from './DashboardTable';
import DashboardVisualizations from './DashboardVisualizations';

export interface ServiceRequest {
  id: string;
  raw_input: string;
  summary: string;
  request_type: string;
  department: string;
  status: string;
  priority: string;
  address: string;
  is_valid: boolean;
  created_at?: string;
}

function getRandomDateInLastNDays(days: number) {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

export default function Dashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/evaluation_requests_test.csv');
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          complete: (results: ParseResult<ServiceRequest>) => {
            const withDates = results.data.map(r => ({
              ...r,
              created_at: getRandomDateInLastNDays(90).toISOString(),
            }));
            setRequests(withDates);
          },
          error: (error: Error) => {
            setError(error.message);
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-500 bg-red-50 rounded-lg">
      Error: {error}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Service Requests Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Monitor and manage all service requests in one place</p>
      </div>
      <DashboardTable initialRequests={requests} />
      <DashboardVisualizations requests={requests} />
    </div>
  );
} 