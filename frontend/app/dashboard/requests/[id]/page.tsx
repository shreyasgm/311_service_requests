"use client"

import { DashboardNav } from "@/components/dashboard-nav"
import { RequestDetail } from "@/components/request-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard/requests">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requests
            </Button>
          </Link>
        </div>

        <RequestDetail requestId={params.id} />
      </main>
    </div>
  )
}
