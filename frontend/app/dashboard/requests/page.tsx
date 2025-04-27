"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { DashboardFilter } from "@/components/dashboard-filter"
import { RequestsTable } from "@/components/requests-table"
import type { MapFilter } from "@/types"

export default function RequestsPage() {
  const [filter, setFilter] = useState<MapFilter>({})

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600 mt-2">View and manage all service requests</p>
        </div>

        <DashboardFilter onFilterChange={setFilter} />

        <RequestsTable filter={filter} />
      </main>
    </div>
  )
}
