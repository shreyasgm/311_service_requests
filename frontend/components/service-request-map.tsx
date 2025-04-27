"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { ServiceRequest, MapFilter } from "@/types"
import { getPublicServiceRequests } from "@/lib/service-requests"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import type { LatLngExpression } from "leaflet"

// Dynamically import Leaflet components with no SSR to avoid hydration issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

export function ServiceRequestMap({ filter }: { filter?: MapFilter }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Set mapReady to true after component mounts to avoid SSR issues with Leaflet
    setMapReady(true)
  }, [])

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicServiceRequests(filter)
        setRequests(data)
      } catch (err) {
        console.error("Error loading service requests:", err)
        setError("Failed to load service requests. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [filter])

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then(L => {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "/marker-icon-2x.png",
          iconUrl: "/marker-icon.png",
          shadowUrl: "/marker-shadow.png",
        })
      })
    }
  }, [])

  // Default center coordinates (Boston)
  const center: LatLngExpression = [42.3601, -71.0589]

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[70vh] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center max-w-md px-4">
          <p className="text-red-500 font-medium mb-2">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!mapReady) {
    return (
      <div className="h-[70vh] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[70vh] rounded-lg overflow-hidden shadow-md">
      {mapReady && (
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {requests.map((request) =>
            request.latitude && request.longitude ? (
              <Marker key={request.id} position={[request.latitude, request.longitude]}>
                <Popup>
                  <Card className="border-0 shadow-none">
                    <CardContent className="p-2">
                      <h3 className="font-medium text-base">{request.request_type?.name || "Unknown Request"}</h3>
                      <p className="text-sm text-gray-600 mt-1">{request.summary}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="bg-blue-50">
                          {request.department?.name || "Unknown Department"}
                        </Badge>
                        <Badge
                          className={
                            request.status?.name === "Open"
                              ? "bg-green-100 text-green-800"
                              : request.status?.name === "In Progress"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {request.status?.name || "Unknown Status"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Reported {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                </Popup>
              </Marker>
            ) : null,
          )}
        </MapContainer>
      )}
    </div>
  )
}
