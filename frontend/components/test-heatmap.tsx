"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// Import heat separately to ensure it's available
import "leaflet.heat";

const TestHeatmap = () => {
  const mapRef = useRef<L.Map | null>(null);
  
  useEffect(() => {
    // Create sample data for the heatmap - with many more points to make it more visible
    const heatData = [];
    
    // Generate 500 points around New York for a more visible heatmap
    const nyLat = 40.7128;
    const nyLng = -74.006;
    
    for (let i = 0; i < 500; i++) {
      const lat = nyLat + (Math.random() - 0.5) * 0.1;
      const lng = nyLng + (Math.random() - 0.5) * 0.1;
      const intensity = Math.random() * 0.7 + 0.3; // Between 0.3 and 1.0
      heatData.push([lat, lng, intensity]);
    }
    
    // Add some concentrated points in specific areas for hotspots
    for (let i = 0; i < 100; i++) {
      const lat = nyLat + 0.02 + (Math.random() - 0.5) * 0.02;
      const lng = nyLng + 0.02 + (Math.random() - 0.5) * 0.02;
      const intensity = Math.random() * 0.3 + 0.7; // Higher intensity
      heatData.push([lat, lng, intensity]);
    }
    
    // Add Boston area points
    const bostonLat = 42.3601;
    const bostonLng = -71.0589;
    
    for (let i = 0; i < 100; i++) {
      const lat = bostonLat + (Math.random() - 0.5) * 0.1;
      const lng = bostonLng + (Math.random() - 0.5) * 0.1;
      const intensity = Math.random() * 0.7 + 0.3;
      heatData.push([lat, lng, intensity]);
    }

    if (!mapRef.current) {
      // Initialize the map
      const map = L.map("map").setView([40.7128, -74.006], 11);
      
      // Add the tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add some regular markers to compare
      L.marker([40.7128, -74.006]).addTo(map)
        .bindPopup("New York City");
      
      L.marker([42.3601, -71.0589]).addTo(map)
        .bindPopup("Boston");

      // Create and add the heatmap layer
      console.log("Creating heatmap layer...");
      try {
        console.log(`Adding ${heatData.length} points to heatmap`);
        // @ts-ignore - TypeScript doesn't recognize the heat method
        const heat = L.heatLayer(heatData, {
          radius: 20,     // Smaller radius
          blur: 25,       // More blur for better visibility
          maxZoom: 13,    // Show heatmap up to this zoom level
          minOpacity: 0.5, // Minimum opacity to ensure visibility
          max: 1.0,       // Maximum point intensity
          gradient: {0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
        }).addTo(map);
        
        console.log("Heatmap layer created successfully:", heat);
      } catch (error) {
        console.error("Error creating heatmap layer:", error);
      }

      // Add a control to toggle between map view and heatmap
      // Button to toggle between heatmap and markers
      const toggleButton = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function() {
          const container = L.DomUtil.create('button', 'leaflet-bar leaflet-control bg-white p-2 rounded shadow');
          container.innerHTML = 'Toggle View';
          container.style.fontSize = '14px';
          container.onclick = function() {
            console.log("Toggle button clicked");
          };
          return container;
        }
      });
      
      new toggleButton().addTo(map);
      
      mapRef.current = map;
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div id="map" className="h-full w-full" />;
};

export default TestHeatmap;