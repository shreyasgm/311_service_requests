'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';

interface ServiceRequest {
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

interface DashboardTableProps {
  initialRequests: ServiceRequest[];
}

export default function DashboardTable({ initialRequests }: DashboardTableProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ServiceRequest>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({
    request_type: '',
    department: '',
    status: '',
    priority: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/evaluation_requests_test.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          complete: (results: ParseResult<ServiceRequest>) => {
            setRequests(results.data);
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

  const handleSort = (field: keyof ServiceRequest) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in progress':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique values for filters
  const uniqueRequestTypes = [...new Set(requests.map(r => r.request_type))];
  const uniqueDepartments = [...new Set(requests.map(r => r.department))];
  const uniqueStatuses = [...new Set(requests.map(r => r.status))];
  const uniquePriorities = [...new Set(requests.map(r => r.priority))];

  // Filter and sort the data
  const filteredRequests = requests
    .filter(request => {
      return (
        (!filters.request_type || request.request_type === filters.request_type) &&
        (!filters.department || request.department === filters.department) &&
        (!filters.status || request.status === filters.status) &&
        (!filters.priority || request.priority === filters.priority)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const timeData = requests.reduce((acc, request) => {
    if (!request.created_at) return acc; // skip if no date
    const date = new Date(request.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Filter Controls */}
      <div className="p-4 flex flex-wrap gap-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
        <select name="request_type" value={filters.request_type} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Request Types</option>
          {uniqueRequestTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select name="department" value={filters.department} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Departments</option>
          {uniqueDepartments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Statuses</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Priorities</option>
          {uniquePriorities.map(priority => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-20rem)]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Raw Input</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Request Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Is Valid</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{request.id}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{request.raw_input}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{request.summary}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.request_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{request.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {request.is_valid ? 'Yes' : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage * itemsPerPage >= filteredRequests.length}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{paginatedRequests.length}</span> of <span className="font-medium">{filteredRequests.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * itemsPerPage >= filteredRequests.length}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
} 