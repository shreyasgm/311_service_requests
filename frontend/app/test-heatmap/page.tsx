"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Create a test component for the heatmap
const TestHeatmap = () => {
  const [mapReady, setMapReady] = useState(false);
  
  const MapWithNoSSR = dynamic(
    () => import("../../components/test-heatmap"),
    {
      ssr: false,
      loading: () => <div>Loading map...</div>,
    }
  );

  useEffect(() => {
    setMapReady(true);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Heatmap Test</h1>
      <div className="h-[600px] w-full">
        {mapReady && <MapWithNoSSR />}
      </div>
    </div>
  );
};

export default TestHeatmap;