'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ServiceRequest {
  id: string;
  created_at: string;
  raw_input: string;
  summary: string;
  request_type_id: string;
  department_id: string;
  status_id: string;
  priority_id: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  is_emergency: boolean;
  is_valid: boolean;
}

interface LookupItem {
  id: string;
  name: string;
}

interface DashboardTableProps {
  initialRequests: ServiceRequest[];
}

export default function DashboardTable({ initialRequests }: DashboardTableProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof ServiceRequest>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({
    request_type_id: '',
    department_id: '',
    status_id: '',
    priority_id: '',
  });
  const [requestTypes, setRequestTypes] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [priorities, setPriorities] = useState<LookupItem[]>([]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('service_requests')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query = query.eq(key, value);
      });
      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortField, sortDirection, currentPage]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [rt, dept, stat, prio] = await Promise.all([
        supabase.from('request_types').select('id, name'),
        supabase.from('departments').select('id, name'),
        supabase.from('statuses').select('id, name'),
        supabase.from('priorities').select('id, name'),
      ]);
      if (rt.data) setRequestTypes(rt.data);
      if (dept.data) setDepartments(dept.data);
      if (stat.data) setStatuses(stat.data);
      if (prio.data) setPriorities(prio.data);
    };
    fetchLookups();
  }, []);

  const handleSort = async (field: keyof ServiceRequest) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    await fetchRequests();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
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
        <select name="request_type_id" value={filters.request_type_id} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Request Types</option>
          {requestTypes.map(rt => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
        <select name="department_id" value={filters.department_id} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <select name="status_id" value={filters.status_id} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Statuses</option>
          {statuses.map(stat => (
            <option key={stat.id} value={stat.id}>{stat.name}</option>
          ))}
        </select>
        <select name="priority_id" value={filters.priority_id} onChange={handleFilterChange} className="border rounded px-2 py-1 dark:bg-gray-600 dark:text-white dark:border-gray-500">
          <option value="">All Priorities</option>
          {priorities.map(prio => (
            <option key={prio.id} value={prio.id}>{prio.name}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Raw Input</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Request Type ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Latitude</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Longitude</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Is Emergency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Is Valid</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{request.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(request.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.raw_input}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.summary}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{
                  requestTypes.find(rt => rt.id === request.request_type_id)?.name || request.request_type_id
                }</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{
                  departments.find(dept => dept.id === request.department_id)?.name || request.department_id
                }</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{
                  statuses.find(stat => stat.id === request.status_id)?.name || request.status_id
                }</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{
                  priorities.find(prio => prio.id === request.priority_id)?.name || request.priority_id
                }</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.latitude}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.longitude}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.is_emergency ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{request.is_valid ? 'Yes' : 'No'}</td>
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
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing page <span className="font-medium">{currentPage}</span>
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