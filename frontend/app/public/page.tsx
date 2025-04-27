"use client"

import { useState } from "react"
import { PublicNav } from "@/components/public-nav"
import { ServiceRequestMap } from "@/components/service-request-map"
import { PublicFilter } from "@/components/public-filter"
import type { MapFilter } from "@/types"
import { ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function PublicPortal() {
  const [filter, setFilter] = useState<MapFilter>({})
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Request Map</h1>
          <p className="text-gray-600 mt-2">
            View current open service requests across the city. Filter by type, department, or status.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PublicFilter onFilterChange={setFilter} />

        <ServiceRequestMap filter={filter} />

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
