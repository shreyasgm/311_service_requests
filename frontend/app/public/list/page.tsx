"use client"

import { useState, useEffect } from "react"
import { PublicNav } from "@/components/public-nav"
import { PublicFilter } from "@/components/public-filter"
import type { MapFilter, ServiceRequest } from "@/types"
import { getPublicServiceRequests } from "@/lib/service-requests"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { MapPin, Calendar, ArrowUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export default function PublicListView() {
  const [filter, setFilter] = useState<MapFilter>({})
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<"created_at" | "request_type">("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      const data = await getPublicServiceRequests(filter)
      setRequests(data)
      setLoading(false)
    }

    loadRequests()
  }, [filter])

  const handleSort = (field: "created_at" | "request_type") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedRequests = [...requests].sort((a, b) => {
    if (sortField === "created_at") {
      return sortDirection === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else {
      const aName = a.request_type?.name || ""
      const bName = b.request_type?.name || ""
      return sortDirection === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName)
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Request List</h1>
          <p className="text-gray-600 mt-2">Browse and filter current open service requests across the city.</p>
        </div>

        <PublicFilter onFilterChange={setFilter} />

        {loading ? (
          <div className="h-64 flex items-center justify-center bg-white rounded-lg shadow">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : (
          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <Button variant="ghost" onClick={() => handleSort("request_type")} className="flex items-center">
                        Request Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("created_at")}
                        className="flex items-center ml-auto"
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.request_type?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            {request.latitude && request.longitude && (
                              <MapPin className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                            )}
                            <span className="text-sm">{request.summary}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {request.department?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              request.status?.name === "Open"
                                ? "bg-green-100 text-green-800"
                                : request.status?.name === "In Progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {request.status?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Need to report an issue?</h2>
          <p className="text-gray-600 mb-4">
            This portal is for viewing existing service requests only. To submit a new request, please visit the
            official city 311 portal.
          </p>
          <a
            href="https://311.boston.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            Go to Official 311 Portal
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </main>

      <footer className="bg-white py-6 border-t">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600">© {new Date().getFullYear()} City 311 Service Request System</p>
        </div>
      </footer>
    </div>
  )
}
