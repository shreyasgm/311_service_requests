import { supabase } from '@/lib/supabase';
import DashboardTable from './DashboardTable';

interface ServiceRequest {
  id: number;
  created_at: string;
  status: string;
  type: string;
  description: string;
  priority: string;
  location: string;
}

export default async function Dashboard() {
  console.log('Fetching initial requests from Supabase...');
  const { data: requests, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Supabase response:', { requests, error });

  if (error) {
    console.error('Error fetching requests:', error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Service Requests Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Monitor and manage all service requests in one place</p>
      </div>

      <DashboardTable initialRequests={requests} />
    </div>
  );
} 