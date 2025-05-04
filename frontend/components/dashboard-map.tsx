"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import type { ServiceRequest, MapFilter } from "@/types"
import { getAllServiceRequests } from "@/lib/service-requests"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { LatLngExpression } from "leaflet"

// Dynamically import Leaflet components with no SSR to avoid hydration issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const ZoomControl = dynamic(() => import("react-leaflet").then((mod) => mod.ZoomControl), { ssr: false })

// For simpler implementation, we'll just show markers for now
// We can improve this in a follow-up PR with proper zoom-dependent heatmap
function MapContent({ requests }: { requests: ServiceRequest[] }) {
  // Get color based on priority (for future reference)
  const getPriorityColor = (priority: string | undefined) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "#ef4444" // red
      case "high":
        return "#f97316" // orange
      case "medium":
        return "#facc15" // yellow
      case "low":
        return "#22c55e" // green
      default:
        return "#3b82f6" // blue
    }
  }
  
  return (
    <>
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
                            : request.status?.name === "Closed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-100 text-blue-800"
                      }
                    >
                      {request.status?.name || "Unknown Status"}
                    </Badge>
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
                      {request.priority?.name || "Unknown Priority"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Reported {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                  <div className="mt-3">
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Button size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ) : null,
      )}
    </>
  )
}

export function DashboardMap({ filter }: { filter?: MapFilter }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Set mapReady to true after component mounts to avoid SSR issues with Leaflet
    setMapReady(true)
  }, [])

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      const data = await getAllServiceRequests(filter)
      setRequests(data)
      setLoading(false)
    }

    loadRequests()
  }, [filter])

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then(L => {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "/public/marker-icon-2x.png",
          iconUrl: "/public/marker-icon.png",
          shadowUrl: "/public/marker-shadow.png",
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
    <div className="h-[70vh] rounded-lg overflow-hidden shadow-md relative">
      {mapReady && (
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapContent requests={requests} />
        </MapContainer>
      )}
    </div>
  )
}
