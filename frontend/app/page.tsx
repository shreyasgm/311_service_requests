import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, BarChart3, ExternalLink } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">City 311</h1>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/public" className="text-gray-600 hover:text-blue-600">
                  Public Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
                  Staff Dashboard
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">AI-Powered 311 Service Request System</h2>
          <p className="text-xl text-gray-600 mb-12">
            Efficiently manage and track city service requests with the power of artificial intelligence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Public Portal</h3>
              <p className="text-gray-600 mb-6">
                View open service requests, explore the interactive map, and find information about city services.
              </p>
              <Link href="/public">
                <Button className="w-full">View Public Portal</Button>
              </Link>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Staff Dashboard</h3>
              <p className="text-gray-600 mb-6">
                Secure access for city staff to manage service requests, view analytics, and update request status.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">Access Dashboard</Button>
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Need to report an issue?</h3>
            <p className="text-gray-600 mb-4">Visit the official city 311 portal to submit a new service request.</p>
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
        </div>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} City 311 Service Request System</p>
        </div>
      </footer>
    </div>
  )
}
