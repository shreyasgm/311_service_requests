import { PublicNav } from "@/components/public-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Globe, MessageSquare } from "lucide-react"

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report an Issue</h1>
          <p className="text-gray-600 mt-2">Learn how to report non-emergency issues to city services.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-blue-600" />
                Call 311
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Call 311 from any phone within city limits to report a non-emergency issue. Available 24/7.
              </p>
              <Button className="w-full" asChild>
                <a href="tel:311">Call 311</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5 text-blue-600" />
                Online Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Submit service requests online through the official city 311 portal. Track your request with a
                confirmation number.
              </p>
              <Button className="w-full" asChild>
                <a href="https://311.boston.gov/" target="_blank" rel="noopener noreferrer">
                  Visit Portal
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
                Mobile App
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Download the official city 311 mobile app to report issues on the go. Available for iOS and Android.
              </p>
              <Button className="w-full" asChild>
                <a
                  href="https://311.boston.gov//311-your-phone"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get the App
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What Can I Report?</CardTitle>
            <CardDescription>
              The 311 system is for non-emergency issues only. For emergencies, always call 911.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Common Reports</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Potholes and street damage</li>
                  <li>Broken streetlights</li>
                  <li>Graffiti removal</li>
                  <li>Missed trash pickup</li>
                  <li>Abandoned vehicles</li>
                  <li>Noise complaints</li>
                  <li>Sidewalk repairs</li>
                  <li>Tree maintenance</li>
                  <li>Illegal dumping</li>
                  <li>Water/sewer issues</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Not for 311 (Call 911)</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Medical emergencies</li>
                  <li>Fires</li>
                  <li>Crimes in progress</li>
                  <li>Car accidents with injuries</li>
                  <li>Gas leaks</li>
                  <li>Downed power lines</li>
                  <li>Any life-threatening situation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Happens After I Report?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Submission</h4>
                  <p className="text-sm text-gray-600">
                    Your request is submitted to the 311 system and assigned a unique tracking number.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Classification</h4>
                  <p className="text-sm text-gray-600">
                    The request is classified by type and assigned to the appropriate city department.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Processing</h4>
                  <p className="text-sm text-gray-600">
                    Department staff review the request and schedule the necessary work.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Resolution</h4>
                  <p className="text-sm text-gray-600">
                    The issue is addressed and the request is closed with notes on the action taken.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-white py-6 border-t">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600">© {new Date().getFullYear()} City 311 Service Request System</p>
        </div>
      </footer>
    </div>
  )
}
