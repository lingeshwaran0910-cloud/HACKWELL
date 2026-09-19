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
        minZoom: 4,
        maxZoom: 18,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        disableDoubleClickZoom: true,
        restriction: {
          latLngBounds: {
            north: 37.5,
            south: 6.0,
            east: 97.5,
            west: 68.0,
          },
          strictBounds: true,
        },
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

    // Helper for generating custom SVG Data URI icons for Google Maps
    const getMarkerSvgDataUri = (innerSvg: string, bgColor: string, isSquare = false) => {
      const rx = isSquare ? '6' : '18';
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <rect width="36" height="36" rx="${rx}" fill="${bgColor}" stroke="#ffffff" stroke-width="2"/>
        <g transform="translate(6, 6)">${innerSvg}</g>
      </svg>`;
      return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString);
    };

    // 3. Hospital Markers
    if (layers.hospitals) {
      hospitals.forEach((hosp) => {
        const isSelected = selectedItem?.type === 'hospital' && selectedItem.item.id === hosp.id;
        const hospitalSvg = `<path d="M6 18h12M6 22h12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><rect width="14" height="16" x="5" y="2" rx="2" stroke="#ffffff" stroke-width="2.2" fill="none"/><path d="M12 7v6M9 10h6" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`;
        
        const size = isSelected ? 42 : 34;
        const marker = new google.maps.Marker({
          position: { lat: hosp.location.lat, lng: hosp.location.lng },
          map: mapInstance,
          title: hosp.name,
          icon: {
            url: getMarkerSvgDataUri(hospitalSvg, '#10b981', true),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
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
        if (res.type === 'POLICE_UNIT') {
          const policeSvgString = `<svg width="36" height="36" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M14 17.5C15 12.5 18.5 9.5 24 9.5C29.5 9.5 33 12.5 34 17.5H37C37.8 17.5 38.5 18.2 38.5 19C38.5 19.8 37.8 20.5 37 20.5H11C10.2 20.5 9.5 19.8 9.5 19C9.5 18.2 10.2 17.5 11 17.5H14Z" fill="#818cf8"/><path d="M16 14.5H32L31 17.5H17L16 14.5Z" fill="#818cf8" opacity="0.75"/><path d="M17 22C17 18.2 19.8 15.5 24 15.5C28.2 15.5 31 18.2 31 22V25.5C31 29.5 28.2 32 24 32C19.8 32 17 29.5 17 25.5V22Z" fill="#818cf8"/><path d="M20.5 23.5C21.2 22.8 22 22.5 22.8 22.5C23.6 22.5 24.4 22.8 25 23.5C25.6 22.8 26.4 22.5 27.2 22.5C28 22.5 28.8 22.8 29.5 23.5V26C29.5 29 27.3 30.5 24 30.5C20.7 30.5 18.5 29 18.5 26V23.5C19.2 22.8 20 22.5 20.8 22.5C21.6 22.5 22.4 22.8 23 23.5" fill="#ffffff" opacity="0.9"/><path d="M17 31L11 34.5L8.5 45H39.5L37 34.5L31 31L24 37L17 31Z" fill="#818cf8"/><path d="M17 31L24 37L31 31L28.5 29.5L24 34L19.5 29.5L17 31Z" fill="#ffffff" opacity="0.9"/><path d="M22.5 34L24 36L25.5 34L25 42L24 44L23 42L22.5 34Z" fill="#818cf8"/><circle cx="24" cy="39" r="1.15" fill="#ffffff"/><circle cx="24" cy="42" r="1.15" fill="#ffffff"/><path d="M12.5 35L17.5 33.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/><path d="M35.5 35L30.5 33.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
          const policeDataUri = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(policeSvgString);
          const size = isSelected ? 44 : 36;
          const marker = new google.maps.Marker({
            position: { lat: res.location.lat, lng: res.location.lng },
            map: mapInstance,
            title: `${res.callSign} (${res.type})`,
            icon: {
              url: policeDataUri,
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(size / 2, size / 2),
            },
            zIndex: isSelected ? 1000 : 500,
          });

          marker.addListener('click', () => {
            if (onSelectResource) onSelectResource(res);
          });

          markersRef.current.push(marker);
          return;
        }

        let color = '#2563eb';
        // Ambulance SVG
        let resSvg = `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="7" cy="17" r="2" stroke="#ffffff" stroke-width="2" fill="none"/><circle cx="17" cy="17" r="2" stroke="#ffffff" stroke-width="2" fill="none"/><path d="M10 9v4M8 11h4" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
        
        if (res.type === 'FIRE_UNIT') {
          color = '#ea580c';
          // Fire Truck SVG
          resSvg = `<path d="M3 17h18M2 12h14v5H2v-5zm14 0h4l2 3v2h-6v-5z" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="6" cy="17" r="2" stroke="#ffffff" stroke-width="2" fill="none"/><circle cx="17" cy="17" r="2" stroke="#ffffff" stroke-width="2" fill="none"/><path d="M4 8h14M7 8v4M11 8v4M15 8v4" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
        } else if (res.type === 'RESCUE_UNIT') {
          color = '#d97706';
          // Rescue Unit SVG
          resSvg = `<circle cx="12" cy="12" r="10" stroke="#ffffff" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" stroke="#ffffff" stroke-width="2" fill="none"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
        }

        const size = isSelected ? 42 : 34;
        const marker = new google.maps.Marker({
          position: { lat: res.location.lat, lng: res.location.lng },
          map: mapInstance,
          title: `${res.callSign} (${res.type})`,
          icon: {
            url: getMarkerSvgDataUri(resSvg, color, false),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
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
        const isSuspected = inc.status === 'SUSPECTED' || inc.verificationRequired || inc.silentAnomaly;
        let color = '#e11d48';
        let incSvg = `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`;

        if (isSuspected) {
          color = '#d97706';
          incSvg = `<circle cx="12" cy="12" r="10" stroke="#ffffff" stroke-width="2.2" fill="none"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`;
        } else if (inc.type === 'FIRE') {
          color = '#ea580c';
          incSvg = `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" stroke="#ffffff" stroke-width="2" fill="none"/>`;
        }

        const size = isSelected ? 42 : 34;
        const marker = new google.maps.Marker({
          position: { lat: inc.location.lat, lng: inc.location.lng },
          map: mapInstance,
          title: inc.title,
          icon: {
            url: getMarkerSvgDataUri(incSvg, color, false),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
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
