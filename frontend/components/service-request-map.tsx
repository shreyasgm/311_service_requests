"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type { ServiceRequest, MapFilter } from "@/types"
import { getPublicServiceRequests } from "@/lib/service-requests"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import type { LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"

// Add global interfaces for TypeScript
declare global {
  interface Window {
    L: any; // Leaflet global object
  }
}

// Dynamically import Leaflet components with no SSR to avoid hydration issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const ZoomControl = dynamic(() => import("react-leaflet").then((mod) => mod.ZoomControl), { ssr: false })

// Constants
const MAX_MARKERS = 100; // Threshold for switching to heatmap
const MIN_ZOOM_FOR_MARKERS = 16; // Minimum zoom level to show individual markers (Leaflet zoom levels typically range from 0-19)

// Component to handle the map without SSR issues
const MapWithHeatmapAndMarkers = ({ requests }: { requests: ServiceRequest[] }) => {
  // Create DOM reference for the map
  const mapRef = useRef<HTMLDivElement>(null);
  // References to store Leaflet objects
  const leafletMapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [visualizationType, setVisualizationType] = useState<'markers' | 'heatmap'>('markers');

  // Function to create markers
  const createMarkers = useCallback(() => {
    if (!leafletMapRef.current || typeof window === 'undefined') return;
    
    const L = window.L;
    const map = leafletMapRef.current;
    
    console.log("Creating markers now...");
    
    try {
      // Clean up any existing markers
      if (markersLayerRef.current) {
        map.removeLayer(markersLayerRef.current);
        markersLayerRef.current = null;
      }
      
      // Create marker layer group
      const markers = L.layerGroup();
      
      // Count valid markers
      let validMarkerCount = 0;
      
      // Configure default icon
      const defaultIcon = L.icon({
        iconUrl: '/marker-icon.png',
        iconRetinaUrl: '/marker-icon-2x.png',
        shadowUrl: '/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
      });
      
      // Set default icon
      L.Marker.prototype.options.icon = defaultIcon;
      
      // Add markers for each request
      requests.forEach(request => {
        if (request.latitude && request.longitude) {
          validMarkerCount++;
          try {
            const marker = L.marker([request.latitude, request.longitude]);
            
            // Create popup content
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
              <div class="p-2">
                <h3 class="font-medium text-base">${request.request_type?.name || "Unknown Request"}</h3>
                <p class="text-sm text-gray-600 mt-1">${request.summary}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <span class="bg-blue-50 px-2 py-1 rounded text-xs">${request.department?.name || "Unknown Department"}</span>
                  <span class="${
                    request.status?.name === "Open"
                      ? "bg-green-100 text-green-800"
                      : request.status?.name === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  } px-2 py-1 rounded text-xs">${request.status?.name || "Unknown Status"}</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Reported ${formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
              </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(markers);
          } catch (err) {
            console.error("Error creating individual marker:", err);
          }
        }
      });
      
      // Add markers to map
      markers.addTo(map);
      markersLayerRef.current = markers;
      console.log(`Created ${validMarkerCount} markers out of ${requests.length} requests`);
    } catch (err) {
      console.error("Error in createMarkers:", err);
    }
  }, [requests, leafletMapRef]);

  // Function to update visualization based on zoom level and marker count
  const updateVisualization = useCallback(() => {
    if (!leafletMapRef.current || typeof window === 'undefined') return;
    
    const L = window.L;
    const map = leafletMapRef.current;
    const currentZoom = map.getZoom();
    
    // Determine visualization type based on zoom level and request count
    const shouldShowMarkers = currentZoom >= MIN_ZOOM_FOR_MARKERS || requests.length <= MAX_MARKERS;
    const newVisualizationType = shouldShowMarkers ? 'markers' : 'heatmap';
    
    console.log(`Current zoom: ${currentZoom}, Marker threshold: ${MIN_ZOOM_FOR_MARKERS}, Request count: ${requests.length}`);
    console.log(`Should show markers? ${shouldShowMarkers} (${newVisualizationType})`);
    
    // Always update on zoom changes - don't rely just on visualization type change
    // Only check visualization type for better logging
    if (newVisualizationType !== visualizationType) {
      console.log(`Switching visualization from ${visualizationType} to ${newVisualizationType}`);
    } else {
      console.log(`Updating visualization (still ${newVisualizationType})`);
    }
    
    // Update the state
    setVisualizationType(newVisualizationType);
    
    // Remove existing layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }
    
    // Add appropriate layer
    if (newVisualizationType === 'heatmap') {
      try {
        // Create heatmap data
        const heatData = requests
          .filter(req => req.latitude && req.longitude)
          .map(req => [req.latitude, req.longitude, 0.5]);
        
        console.log(`Creating heatmap with ${heatData.length} points`);
        
        // Check if heatLayer function is available
        if (L.heatLayer) {
          heatLayerRef.current = L.heatLayer(heatData, {
            radius: 20,
            blur: 15,
            maxZoom: MIN_ZOOM_FOR_MARKERS,
            minOpacity: 0.4,
            gradient: {0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
          }).addTo(map);
          console.log("Heatmap created successfully");
        } else {
          console.error("L.heatLayer is not available, falling back to markers");
          createMarkers();
        }
      } catch (error) {
        console.error("Error creating heatmap:", error);
        createMarkers();
      }
    } else {
      console.log("Should be creating markers now");
      createMarkers();
    }
  }, [requests, visualizationType, createMarkers]);
  
  // Initialize the map on component mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    
    // Default center coordinates (Boston)
    const center: [number, number] = [42.3601, -71.0589];
    
    // Check if Leaflet is available globally
    if (window.L) {
      // Initialize map if not already created
      if (!leafletMapRef.current) {
        const L = window.L;
        
        console.log("Initializing map with Leaflet version:", L.version);
        
        // Create map
        const map = L.map(mapRef.current).setView(center, 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        
        // Add zoom control
        L.control.zoom({ position: 'topright' }).addTo(map);
        
        // Save map reference
        leafletMapRef.current = map;
        
        // Handle zoom changes to switch between heatmap and markers
        map.on('zoomend', () => {
          console.log("Zoom changed to:", map.getZoom());
          updateVisualization();
        });
        
        // Add a debug control to manually toggle visualization
        const debugControl = L.Control.extend({
          options: {
            position: 'bottomleft'
          },
          onAdd: function() {
            const container = L.DomUtil.create('button', 'leaflet-bar leaflet-control bg-white p-2 rounded shadow');
            container.style.padding = '8px';
            container.style.backgroundColor = 'white';
            container.style.border = '2px solid rgba(0,0,0,0.2)';
            container.innerHTML = 'Toggle Markers/Heatmap';
            
            // Prevent click from propagating to the map
            L.DomEvent.disableClickPropagation(container);
            
            container.onclick = function() {
              console.log("Debug toggle clicked, forcing visualization update");
              // Force toggle between markers and heatmap
              setVisualizationType(prev => prev === 'markers' ? 'heatmap' : 'markers');
              setTimeout(() => updateVisualization(), 0);
            };
            
            return container;
          }
        });
        
        new debugControl().addTo(map);
        
        // Initial visualization update
        updateVisualization();
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []); // Remove updateVisualization from dependencies
  
  // Update visualization when requests change
  useEffect(() => {
    if (mapRef.current && leafletMapRef.current) {
      console.log("Requests changed, updating visualization");
      updateVisualization();
    }
  }, [requests]); // Remove updateVisualization from dependencies
  
  // This is already declared above - keeping this comment for clarity
  
  return <div ref={mapRef} className="h-full w-full" />;
};

export function ServiceRequestMap({ filter }: { filter?: MapFilter }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Set mapReady to true after component mounts to avoid SSR issues with Leaflet
    if (typeof window !== 'undefined') {
      setMapReady(true)
    }
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

  // Use our vanilla JS Leaflet implementation to avoid React-Leaflet issues with heatmap
  return (
    <div className="h-[70vh] rounded-lg overflow-hidden shadow-md">
      {mapReady && requests.length > 0 && (
        <MapWithHeatmapAndMarkers requests={requests} />
      )}
    </div>
  )
}
