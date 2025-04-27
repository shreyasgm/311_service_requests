"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRequestStats } from "@/lib/service-requests"
import type { RequestStats } from "@/types"
import { BarChart3, Clock, AlertTriangle, Activity, AlertOctagon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function StatsCards() {
  const [stats, setStats] = useState<RequestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        setError(null)
        const data = await getRequestStats()
        setStats(data)
      } catch (err) {
        console.error("Error loading stats:", err)
        setError("Failed to load statistics. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardTitle>
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertOctagon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!stats) {
    return (
      <Alert>
        <AlertOctagon className="h-4 w-4" />
        <AlertDescription>No statistics available</AlertDescription>
      </Alert>
    )
  }

  // Calculate open requests
  const openRequests = stats.byStatus.find((s) => s.name === "Open")?.count || 0
  const inProgressRequests = stats.byStatus.find((s) => s.name === "In Progress")?.count || 0
  const totalOpenRequests = openRequests + inProgressRequests

  // Calculate closed requests
  const closedRequests = stats.byStatus.find((s) => s.name === "Closed")?.count || 0

  // Calculate critical requests
  const criticalRequests = stats.byPriority.find((p) => p.name === "Critical")?.count || 0
  const highRequests = stats.byPriority.find((p) => p.name === "High")?.count || 0
  const urgentRequests = criticalRequests + highRequests

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRequests}</div>
          <p className="text-xs text-muted-foreground">Across all departments and statuses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOpenRequests}</div>
          <p className="text-xs text-muted-foreground">
            {openRequests} open, {inProgressRequests} in progress
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Requests</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{urgentRequests}</div>
          <p className="text-xs text-muted-foreground">
            {criticalRequests} critical, {highRequests} high priority
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageResolutionTime}h</div>
          <p className="text-xs text-muted-foreground">{closedRequests} requests closed</p>
        </CardContent>
      </Card>
    </div>
  )
}
