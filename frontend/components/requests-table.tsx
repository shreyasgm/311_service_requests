"use client"

import { useState, useEffect } from "react"
import type { ServiceRequest, MapFilter } from "@/types"
import { getAllServiceRequests } from "@/lib/service-requests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { MapPin, Calendar, ArrowUpDown, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"

interface RequestsTableProps {
  filter?: MapFilter
}

export function RequestsTable({ filter }: RequestsTableProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<"created_at" | "request_type">("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 10

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      const data = await getAllServiceRequests(filter)
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

  // Filter requests by search query
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      (request.summary && request.summary.toLowerCase().includes(query)) ||
      (request.request_type?.name && request.request_type.name.toLowerCase().includes(query)) ||
      (request.department?.name && request.department.name.toLowerCase().includes(query)) ||
      (request.address && request.address.toLowerCase().includes(query))
    )
  })

  // Sort filtered requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
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

  // Paginate sorted requests
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const paginatedRequests = sortedRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search requests..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">{filteredRequests.length} requests found</div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button variant="ghost" onClick={() => handleSort("request_type")} className="flex items-center">
                      Request Type
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
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
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequests.map((request) => (
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
                                : request.status?.name === "Closed"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-blue-100 text-blue-800"
                          }
                        >
                          {request.status?.name || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            request.priority?.name === "Critical"
                              ? "bg-red-100 text-red-800"
                              : request.priority?.name === "High"
                                ? "bg-orange-100 text-orange-800"
                                : request.priority?.name === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : request.priority?.name === "Low"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                          }
                        >
                          {request.priority?.name || "Unknown"}
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
                      <TableCell>
                        <Link href={`/dashboard/requests/${request.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page > 1) setPage(page - 1)
                      }}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show first page, last page, current page, and pages around current
                    let pageNum = i + 1
                    if (totalPages > 5) {
                      if (page <= 3) {
                        // Near start, show first 5 pages
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        // Near end, show last 5 pages
                        pageNum = totalPages - 4 + i
                      } else {
                        // In middle, show current and surrounding pages
                        pageNum = page - 2 + i
                      }
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setPage(pageNum)
                          }}
                          isActive={page === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  {totalPages > 5 && page < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {totalPages > 5 && page < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setPage(totalPages)
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page < totalPages) setPage(page + 1)
                      }}
                      className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}
