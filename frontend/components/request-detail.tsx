"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ServiceRequest, RequestHistory, AIAnalysisResult } from "@/types"
import {
  getServiceRequestById,
  getRequestHistory,
  getAIAnalysis,
  updateServiceRequestStatus,
} from "@/lib/service-requests"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { MapPin, Calendar, Clock, User, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { getFilterOptions } from "@/lib/service-requests"

interface RequestDetailProps {
  requestId: string
}

export function RequestDetail({ requestId }: RequestDetailProps) {
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [history, setHistory] = useState<RequestHistory[]>([])
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Load request details
      const requestData = await getServiceRequestById(requestId)
      setRequest(requestData)

      if (requestData) {
        // Set initial selected status
        setSelectedStatus(requestData.status_id)

        // Load request history
        const historyData = await getRequestHistory(requestId)
        setHistory(historyData)

        // Load AI analysis
        const analysisData = await getAIAnalysis(requestId)
        setAnalysis(analysisData)
      }

      // Load status options
      const options = await getFilterOptions()
      setStatusOptions(options.statuses)

      setLoading(false)
    }

    loadData()
  }, [requestId])

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !notes) return

    setUpdating(true)

    try {
      const success = await updateServiceRequestStatus(
        requestId,
        selectedStatus,
        notes,
        "admin@example.com", // In a real app, this would be the current user's email
      )

      if (success) {
        setUpdateSuccess(true)

        // Reload data after update
        const requestData = await getServiceRequestById(requestId)
        setRequest(requestData)

        const historyData = await getRequestHistory(requestId)
        setHistory(historyData)

        // Clear notes
        setNotes("")

        // Reset success message after 3 seconds
        setTimeout(() => {
          setUpdateSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Request Not Found</h2>
        <p className="text-gray-600 mb-4">The requested service request could not be found.</p>
        <Button onClick={() => router.push("/dashboard/requests")}>Back to Requests</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Service Request #{requestId.slice(0, 8)}</h1>
          <p className="text-gray-500">{request.request_type?.name || "Unknown Request Type"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              request.status?.name === "Open"
                ? "success"
                : request.status?.name === "In Progress"
                  ? "warning"
                  : request.status?.name === "Closed"
                    ? "neutral"
                    : "info"
            }
          >
            {request.status?.name || "Unknown Status"}
          </Badge>

          <Badge
            variant={
              request.priority?.name === "Critical"
                ? "error"
                : request.priority?.name === "High"
                  ? "error"
                  : request.priority?.name === "Medium"
                    ? "warning"
                    : request.priority?.name === "Low"
                      ? "success"
                      : "info"
            }
          >
            {request.priority?.name || "Unknown Priority"}
          </Badge>

          <Badge variant="info">
            {request.department?.name || "Unknown Department"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Description</h3>
              <p className="text-gray-700">{request.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Submitted
                </h3>
                <p className="text-gray-700">{format(new Date(request.created_at), "PPP p")}</p>
              </div>

              <div>
                <h3 className="font-medium mb-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Location
                </h3>
                <p className="text-gray-700">{request.address || "No address provided"}</p>
              </div>
            </div>

            {request.raw_input && (
              <div>
                <h3 className="font-medium mb-1">Original Request</h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">{request.raw_input}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this update"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStatusUpdate} disabled={!selectedStatus || !notes || updating} className="w-full">
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </CardFooter>
          {updateSuccess && (
            <div className="px-6 pb-4">
              <div className="bg-green-100 text-green-800 p-2 rounded-md text-sm flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Status updated successfully
              </div>
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>Timeline of status changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No history available</p>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <div>
                            <p className="font-medium">
                              Status changed to{" "}
                              <Badge
                                variant={
                                  item.status?.name === "Open"
                                    ? "success"
                                    : item.status?.name === "In Progress"
                                      ? "warning"
                                      : item.status?.name === "Closed"
                                        ? "neutral"
                                        : "info"
                                }
                              >
                                {item.status?.name || "Unknown"}
                              </Badge>
                            </p>
                            {item.notes && <p className="text-gray-700 mt-1">{item.notes}</p>}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 sm:mt-0 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(item.created_at), "PPP p")}
                          </div>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <User className="h-3 w-3 mr-1" />
                          {item.updated_by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Results</CardTitle>
              <CardDescription>Automated analysis of the service request</CardDescription>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <p className="text-gray-500 text-center py-4">No AI analysis available</p>
              ) : (
                <div className="space-y-6">
                  {analysis.triage_result && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Triage</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                          <div>
                            <p className="font-medium">
                              Emergency: {analysis.triage_result.is_emergency ? "Yes" : "No"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Confidence: {Math.round(analysis.triage_result.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-2">{analysis.triage_result.reasoning}</p>
                      </div>
                    </div>
                  )}

                  {analysis.validation_result && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Validation</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle2
                            className={`h-5 w-5 ${analysis.validation_result.is_valid ? "text-green-500" : "text-red-500"} mt-0.5`}
                          />
                          <div>
                            <p className="font-medium">
                              Valid Request: {analysis.validation_result.is_valid ? "Yes" : "No"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Confidence: {Math.round(analysis.validation_result.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-2">{analysis.validation_result.reasoning}</p>
                        {analysis.validation_result.invalid_reason && (
                          <div className="mt-2 bg-red-50 p-2 rounded text-red-800 text-sm">
                            Invalid reason: {analysis.validation_result.invalid_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {analysis.classification_result && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Classification</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Type: {analysis.classification_result.request_type?.name}</p>
                            <p className="text-sm text-gray-600">
                              Department: {analysis.classification_result.department?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Confidence: {Math.round(analysis.classification_result.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-2">{analysis.classification_result.reasoning}</p>
                      </div>
                    </div>
                  )}

                  {analysis.confidence_scores && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Confidence Scores</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(analysis.confidence_scores).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm font-medium capitalize">{key}</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${Math.round(Number(value) * 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-right mt-1 text-gray-600">{Math.round(Number(value) * 100)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
