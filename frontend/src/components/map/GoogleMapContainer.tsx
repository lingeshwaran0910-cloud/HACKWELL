import React, { useEffect, useRef, useState } from 'react';
import { Zone, Incident, Resource, Hospital, Route } from '@shared/types';
import { SelectedMapItem } from './MapDetailPanel';

interface GoogleMapContainerProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom: number;
  zones: Zone[];
  incidents: Incident[];
  resources: Resource[];
  hospitals: Hospital[];
  routes: Route[];
  layers: {
    zones: boolean;
    incidents: boolean;
    resources: boolean;
    hospitals: boolean;
    routes: boolean;
  };
  selectedItem: SelectedMapItem;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: Resource) => void;
  onSelectHospital?: (hospital: Hospital) => void;
  onSelectZone?: (zone: Zone) => void;
  theme: 'light' | 'dark';
}

// Dark map styles for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#090d16' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090d16' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#111d2e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1f293d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c3e50' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1726' }],
  },
];

export const GoogleMapContainer: React.FC<GoogleMapContainerProps> = ({
  apiKey,
  center,
  zoom,
  zones,
  incidents,
  resources,
  hospitals,
  routes,
  layers,
  selectedItem,
  onSelectIncident,
  onSelectResource,
  onSelectHospital,
  onSelectZone,
  theme,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Load Google Maps script dynamically
  useEffect(() => {
    if (!apiKey) return;

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const scriptId = 'google-maps-js-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    } else {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.addEventListener('load', initMap);
      }
    }

    function initMap() {
      if (!mapRef.current || !window.google || !window.google.maps) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: theme === 'dark' ? darkMapStyle : [],
      });
      setMapInstance(map);
    }
  }, [apiKey]);

  // Update map style when theme changes
  useEffect(() => {
    if (mapInstance && window.google) {
      mapInstance.setOptions({
        styles: theme === 'dark' ? darkMapStyle : [],
      });
    }
  }, [theme, mapInstance]);

  // Handle mapTypeId toggle
  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'terrain') => {
    setMapTypeId(type);
    if (mapInstance && window.google) {
      if (type === 'satellite') mapInstance.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      else if (type === 'terrain') mapInstance.setMapTypeId(google.maps.MapTypeId.TERRAIN);
      else mapInstance.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    }
  };

  // Render Overlays on Google Map
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear existing overlays
    markersRef.current.forEach((m) => m.setMap(null));
    polygonsRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current.forEach((pl) => pl.setMap(null));
    markersRef.current = [];
    polygonsRef.current = [];
    polylinesRef.current = [];

    // 1. Zones Layer
    if (layers.zones) {
      zones.forEach((zone) => {
        const path = zone.polygon.map((pt) => ({ lat: pt.lat, lng: pt.lng }));
        const isSelected = selectedItem?.type === 'zone' && selectedItem.item.id === zone.id;
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: zone.coverageStatus === 'ADEQUATE' ? '#3b82f6' : '#f59e0b',
          strokeOpacity: 0.8,
          strokeWeight: isSelected ? 3 : 1.5,
          fillColor: zone.coverageStatus === 'ADEQUATE' ? '#3b82f6' : '#f59e0b',
          fillOpacity: isSelected ? 0.2 : 0.08,
          map: mapInstance,
        });

        polygon.addListener('click', () => {
          if (onSelectZone) onSelectZone(zone);
        });

        polygonsRef.current.push(polygon);
      });
    }

    // 2. Routes Layer
    if (layers.routes) {
      routes.forEach((route) => {
        const path = route.waypoints.map((pt) => ({ lat: pt.lat, lng: pt.lng }));
        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: route.blocked ? '#ef4444' : '#3b82f6',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map: mapInstance,
        });
        polylinesRef.current.push(polyline);
      });
    }

    // 3. Hospital Markers
    if (layers.hospitals) {
      hospitals.forEach((hosp) => {
        const isSelected = selectedItem?.type === 'hospital' && selectedItem.item.id === hosp.id;
        const marker = new google.maps.Marker({
          position: { lat: hosp.location.lat, lng: hosp.location.lng },
          map: mapInstance,
          title: hosp.name,
          label: {
            text: 'H',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 16 : 14,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        marker.addListener('click', () => {
          if (onSelectHospital) onSelectHospital(hosp);
        });

        markersRef.current.push(marker);
      });
    }

    // 4. Resource Units Markers
    if (layers.resources) {
      resources.forEach((res) => {
        if (!res.location) return;
        const isSelected = selectedItem?.type === 'resource' && selectedItem.item.id === res.id;
        let color = '#3b82f6';
        if (res.type === 'FIRE_UNIT') color = '#ea580c';
        if (res.type === 'POLICE_UNIT') color = '#4f46e5';
        if (res.type === 'RESCUE_UNIT') color = '#d97706';

        const marker = new google.maps.Marker({
          position: { lat: res.location.lat, lng: res.location.lng },
          map: mapInstance,
          title: `${res.callSign} (${res.type})`,
          label: {
            text: res.callSign,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 18 : 15,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        marker.addListener('click', () => {
          if (onSelectResource) onSelectResource(res);
        });

        markersRef.current.push(marker);
      });
    }

    // 5. Incident Markers
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const isSelected = selectedItem?.type === 'incident' && selectedItem.item.id === inc.id;
        let color = '#e11d48';
        if (inc.status === 'SUSPECTED') color = '#d97706';
        if (inc.type === 'FIRE') color = '#ea580c';

        const marker = new google.maps.Marker({
          position: { lat: inc.location.lat, lng: inc.location.lng },
          map: mapInstance,
          title: inc.title,
          label: {
            text: '!',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: isSelected ? 7 : 5.5,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        marker.addListener('click', () => {
          if (onSelectIncident) onSelectIncident(inc);
        });

        markersRef.current.push(marker);
      });
    }
  }, [mapInstance, layers, zones, incidents, resources, hospitals, routes, selectedItem]);

  return (
    <div className="w-full h-full relative">
      {/* Google Map Canvas */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Map Type Controls (Roadmap / Satellite / Terrain) */}
      <div className="absolute top-3 left-48 z-[1000] flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-md p-1 text-xs shadow-md text-slate-700 dark:text-slate-300">
        {(['roadmap', 'satellite', 'terrain'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleMapTypeChange(type)}
            className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
              mapTypeId === type
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
};
