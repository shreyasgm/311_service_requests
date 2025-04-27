"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { ServiceRequest, MapFilter } from "@/types"
import { getAllServiceRequests } from "@/lib/service-requests"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import L from "leaflet"

// Fix Leaflet marker icon issue in Next.js
const markerIcon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export function DashboardMap({ filter }: { filter?: MapFilter }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers")

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      const data = await getAllServiceRequests(filter)
      setRequests(data)
      setLoading(false)
    }

    loadRequests()
  }, [filter])

  // Default center coordinates (Boston)
  const center: [number, number] = [42.3601, -71.0589]

  // Get color based on priority
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

  return (
    <div className="h-[70vh] rounded-lg overflow-hidden shadow-md relative">
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-md shadow-md">
        <div className="p-2 flex">
          <Button
            variant={viewMode === "markers" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("markers")}
            className="rounded-r-none"
          >
            Markers
          </Button>
          <Button
            variant={viewMode === "heatmap" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("heatmap")}
            className="rounded-l-none"
          >
            Heatmap
          </Button>
        </div>
      </div>

      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {viewMode === "markers" &&
          requests.map((request) =>
            request.latitude && request.longitude ? (
              <Marker key={request.id} position={[request.latitude, request.longitude]} icon={markerIcon}>
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

        {viewMode === "heatmap" &&
          requests.map((request) =>
            request.latitude && request.longitude ? (
              <CircleMarker
                key={request.id}
                center={[request.latitude, request.longitude]}
                radius={10}
                pathOptions={{
                  color: getPriorityColor(request.priority?.name),
                  fillColor: getPriorityColor(request.priority?.name),
                  fillOpacity: 0.5,
                }}
              >
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
              </CircleMarker>
            ) : null,
          )}
      </MapContainer>
    </div>
  )
}
