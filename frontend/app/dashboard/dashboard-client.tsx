"use client"

import { useState } from "react"
import { DashboardFilter } from "@/components/dashboard-filter"
import { RequestsTable } from "@/components/requests-table"
import type { MapFilter } from "@/types"

export default function DashboardClient() {
  const [filter, setFilter] = useState<MapFilter>({})

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
      <DashboardFilter onFilterChange={setFilter} />
      <RequestsTable filter={filter} />
    </div>
  )
}