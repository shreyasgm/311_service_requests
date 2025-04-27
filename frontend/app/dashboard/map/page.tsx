"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { DashboardFilter } from "@/components/dashboard-filter"
import { DashboardMap } from "@/components/dashboard-map"
import type { MapFilter } from "@/types"

export default function MapPage() {
  const [filter, setFilter] = useState<MapFilter>({})

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Request Map</h1>
          <p className="text-gray-600 mt-2">Visualize service requests across the city</p>
        </div>

        <DashboardFilter onFilterChange={setFilter} />

        <DashboardMap filter={filter} />
      </main>
    </div>
  )
}
