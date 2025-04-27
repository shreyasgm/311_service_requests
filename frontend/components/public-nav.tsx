"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, List, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

export function PublicNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Map View",
      href: "/public",
      icon: MapPin,
    },
    {
      name: "List View",
      href: "/public/list",
      icon: List,
    },
    {
      name: "Report an Issue",
      href: "/public/report",
      icon: Phone,
    },
  ]

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">City 311</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                    pathname === item.href ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t">
        <div className="grid grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2",
                pathname === item.href ? "text-blue-700" : "text-gray-600",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
