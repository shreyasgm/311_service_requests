'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { ServiceRequest } from './page';

Chart.register(...registerables);

interface DashboardVisualizationsProps {
  requests: ServiceRequest[];
}

export default function DashboardVisualizations({ requests }: DashboardVisualizationsProps) {
  const [breakdownType, setBreakdownType] = useState<'request_type' | 'department'>('request_type');
  const timeChartRef = useRef<HTMLCanvasElement>(null);
  const breakdownChartRef = useRef<HTMLCanvasElement>(null);
  const timeChartInstance = useRef<Chart | null>(null);
  const breakdownChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!timeChartRef.current || !breakdownChartRef.current) return;

    // Cleanup previous charts
    if (timeChartInstance.current) {
      timeChartInstance.current.destroy();
    }
    if (breakdownChartInstance.current) {
      breakdownChartInstance.current.destroy();
    }

    // Process data for time series chart
    const timeData = requests.reduce((acc, request) => {
      const date = new Date(request?.created_at || '').toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create time series chart
    timeChartInstance.current = new Chart(timeChartRef.current, {
      type: 'line',
      data: {
        labels: Object.keys(timeData).sort(),
        datasets: [{
          label: 'Requests per Day',
          data: Object.keys(timeData).sort().map(date => timeData[date]),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Service Requests Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Requests'
            }
          }
        }
      }
    });

    // Process data for breakdown chart
    const breakdownData = requests.reduce((acc, request) => {
      const key = breakdownType === 'request_type' ? request.request_type : request.department;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create breakdown chart
    breakdownChartInstance.current = new Chart(breakdownChartRef.current, {
      type: 'bar',
      data: {
        labels: Object.keys(breakdownData),
        datasets: [{
          label: `Requests by ${breakdownType === 'request_type' ? 'Request Type' : 'Department'}`,
          data: Object.values(breakdownData),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Requests by ${breakdownType === 'request_type' ? 'Request Type' : 'Department'}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Requests'
            }
          }
        }
      }
    });
  }, [requests, breakdownType]);

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <canvas ref={timeChartRef} />
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="mb-4">
          <label htmlFor="breakdown-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Breakdown by:
          </label>
          <select
            id="breakdown-select"
            value={breakdownType}
            onChange={(e) => setBreakdownType(e.target.value as 'request_type' | 'department')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="request_type">Request Type</option>
            <option value="department">Department</option>
          </select>
        </div>
        <canvas ref={breakdownChartRef} />
      </div>
    </div>
  );
} 