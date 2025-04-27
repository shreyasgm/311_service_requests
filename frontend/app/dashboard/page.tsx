"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { StatsCards } from "@/components/stats-cards"
import { StatsCharts } from "@/components/stats-charts"
import { DashboardFilter } from "@/components/dashboard-filter"
import { RequestsTable } from "@/components/requests-table"
import type { MapFilter } from "@/types"

export default function DashboardPage() {
  const [filter, setFilter] = useState<MapFilter>({})

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Monitor and manage service requests across the city</p>
        </div>

        <div className="space-y-6">
          <StatsCards />

          <StatsCharts />

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
            <DashboardFilter onFilterChange={setFilter} />
            <RequestsTable filter={filter} />
          </div>
        </div>
      </main>
    </div>
  )
}
