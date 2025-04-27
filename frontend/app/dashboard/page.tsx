import { Suspense } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { StatsCards } from "@/components/stats-cards"
import { StatsCharts } from "@/components/stats-charts"
import { requireUser } from "@/lib/auth"
import DashboardClient from "./dashboard-client"

export default async function DashboardPage() {
  // This ensures the user is logged in
  const user = await requireUser()
  
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

          <Suspense fallback={<div>Loading recent requests...</div>}>
            <DashboardClient />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
