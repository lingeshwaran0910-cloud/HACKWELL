import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Polygon, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Layers, RotateCcw, Globe } from 'lucide-react';
import { Zone, Incident, Resource, Hospital, Route } from '@shared/types';
import { mockService } from '../../services/mockService';
import { routingService } from '../../services/routingService';
import { createIncidentIcon, createResourceIcon, createHospitalIcon } from './mapIcons';
import { MapLegend } from './MapLegend';
import { MapDetailPanel, SelectedMapItem } from './MapDetailPanel';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { GoogleMapContainer } from './GoogleMapContainer';

// India-Wide Geographical Center & Strict Bounds
const INDIA_CENTER: L.LatLngTuple = [20.5937, 78.9629];
const INDIA_SW: L.LatLngTuple = [6.0, 68.0];
const INDIA_NE: L.LatLngTuple = [37.5, 97.5];
const INDIA_BOUNDS = L.latLngBounds(INDIA_SW, INDIA_NE);

const TRICHY_CENTER: L.LatLngTuple = [10.7905, 78.7047];

// Controller component for Fit India / Fit Trichy / Reset View
const MapControlButtons: React.FC<{ zones: Zone[] }> = ({ zones: _zones }) => {
  const map = useMap();
  
  const fitIndia = () => {
    map.setView(INDIA_CENTER, 5, { animate: true });
  };

  const fitTrichy = () => {
    map.setView(TRICHY_CENTER, 13, { animate: true });
  };

  const resetView = () => {
    map.setView(INDIA_CENTER, 5, { animate: true });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={fitIndia}
        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-sans font-medium shadow-md transition-colors"
        title="Zoom map view to India-wide emergency network overview"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>Fit India</span>
      </button>

      <button
        onClick={fitTrichy}
        className="flex items-center gap-1 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 rounded-md text-xs font-sans font-medium shadow-md transition-colors"
        title="Focus map view on Tiruchirappalli operational zone"
      >
        <span>Fit Trichy</span>
      </button>

      <button
        onClick={resetView}
        className="flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 rounded-md text-xs font-sans font-medium shadow-md transition-colors"
        title="Reset map view to default India overview"
      >
        <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      </button>
    </div>
  );
};

// Controller component to smoothly center map on selected incident or entity
const MapCenterController: React.FC<{ selectedItem: SelectedMapItem }> = ({ selectedItem }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedItem) return;

    if (selectedItem.type === 'incident') {
      map.panTo([selectedItem.item.location.lat, selectedItem.item.location.lng], { animate: true });
    } else if (selectedItem.type === 'resource' && selectedItem.item.location) {
      map.panTo([selectedItem.item.location.lat, selectedItem.item.location.lng], { animate: true });
    } else if (selectedItem.type === 'hospital') {
      map.panTo([selectedItem.item.location.lat, selectedItem.item.location.lng], { animate: true });
    } else if (selectedItem.type === 'zone' && selectedItem.item.center) {
      map.panTo([selectedItem.item.center.lat, selectedItem.item.center.lng], { animate: true });
    }
  }, [selectedItem, map]);

  return null;
};

// Custom Map Tap & Double-Tap Zoom Controller:
// Single tap background -> Zoom OUT 1 level (around tap point)
// Double tap background -> Zoom IN 1 level (around tap point)
const MapTapZoomController: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Explicitly disable Leaflet native doubleClickZoom
    if (map.doubleClickZoom) {
      map.doubleClickZoom.disable();
    }

    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let tapCount = 0;
    let pendingLatLng: L.LatLng | null = null;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const originalEvent = e.originalEvent;
      const target = originalEvent?.target as HTMLElement | null;
      if (!target) return;

      // Check if click target is an interactive marker, polygon, control, popup, button, drawer, etc.
      const isInteractive =
        target.closest('.leaflet-interactive') ||
        target.closest('.leaflet-control-container') ||
        target.closest('.leaflet-popup') ||
        target.closest('.map-control-overlay') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('a') ||
        target.closest('.custom-map-drawer') ||
        target.closest('.leaflet-bar');

      if (isInteractive) {
        if (tapTimer) {
          clearTimeout(tapTimer);
          tapTimer = null;
        }
        tapCount = 0;
        pendingLatLng = null;
        return;
      }

      tapCount++;
      pendingLatLng = e.latlng;

      if (tapCount === 1) {
        // Wait 280ms to determine if a 2nd tap follows (double tap)
        tapTimer = setTimeout(() => {
          if (tapCount === 1 && pendingLatLng) {
            const currentZoom = map.getZoom();
            const minZoom = map.getMinZoom() || 11;
            if (currentZoom > minZoom) {
              map.setZoomAround(pendingLatLng, currentZoom - 1, { animate: true });
            }
          }
          tapCount = 0;
          tapTimer = null;
          pendingLatLng = null;
        }, 280);
      } else if (tapCount === 2) {
        // Double tap detected! Cancel single-tap timer and perform ONLY ONE Zoom IN action
        if (tapTimer) {
          clearTimeout(tapTimer);
          tapTimer = null;
        }

        if (pendingLatLng) {
          const currentZoom = map.getZoom();
          const maxZoom = map.getMaxZoom() || 18;
          if (currentZoom < maxZoom) {
            map.setZoomAround(pendingLatLng, currentZoom + 1, { animate: true });
          }
        }

        tapCount = 0;
        pendingLatLng = null;
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
      if (tapTimer) clearTimeout(tapTimer);
    };
  }, [map]);

  return null;
};

interface CityOperationsMapProps {
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: Resource) => void;
  onSelectHospital?: (hospital: Hospital) => void;
}

export const CityOperationsMap: React.FC<CityOperationsMapProps> = ({
  selectedIncidentId = null,
  onSelectIncident,
  onSelectResource,
  onSelectHospital,
}) => {
  const { theme } = useTheme();
  const { incidents, resources, hospitals, routes, summaryStats: stats } = useApp();
  const zones = mockService.getZones();

  // Environment API key check for Google Maps JS API
  const googleApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Provider State: 'google' or 'leaflet'
  const [provider, setProvider] = useState<'google' | 'leaflet'>(googleApiKey ? 'google' : 'leaflet');

  // Layer toggle states
  const [layers, setLayers] = useState({
    zones: true,
    incidents: true,
    resources: true,
    hospitals: true,
    routes: true,
  });

  // Selected map item state
  const [selectedItem, setSelectedItem] = useState<SelectedMapItem>(null);
  const [roadRoutes, setRoadRoutes] = useState<Route[]>([]);

  // Calculate real road routes for active resource assignments
  useEffect(() => {
    let isMounted = true;

    const fetchActiveRoadRoutes = async () => {
      const activePromises: Promise<Route>[] = [];

      resources.forEach((res) => {
        if (!res.location) return;

        if (res.assignmentIncidentId) {
          const inc = incidents.find((i) => i.id === res.assignmentIncidentId);
          if (inc && inc.location) {
            activePromises.push(
              routingService.getRoute({
                origin: res.location,
                destination: inc.location,
                resourceId: res.id,
                incidentId: inc.id,
                callSign: res.callSign,
                targetTitle: inc.title,
              })
            );
          }
        } else if (res.destinationHospitalId) {
          const hosp = hospitals.find((h) => h.id === res.destinationHospitalId);
          if (hosp && hosp.location) {
            activePromises.push(
              routingService.getRoute({
                origin: res.location,
                destination: hosp.location,
                resourceId: res.id,
                hospitalId: hosp.id,
                callSign: res.callSign,
                targetTitle: hosp.name,
              })
            );
          }
        }
      });

      // Fallback to initial seed routes if no active assignments exist
      if (activePromises.length === 0 && routes.length > 0) {
        routes.forEach((r) => {
          activePromises.push(
            routingService.getRoute({
              origin: r.origin,
              destination: r.destination,
              resourceId: r.resourceId,
              incidentId: r.incidentId,
              hospitalId: r.hospitalId,
            })
          );
        });
      }

      const results = await Promise.all(activePromises);
      if (isMounted) {
        setRoadRoutes(results);
      }
    };

    fetchActiveRoadRoutes();

    return () => {
      isMounted = false;
    };
  }, [resources, incidents, hospitals, routes]);

  // Synchronize external selectedIncidentId into map selection
  useEffect(() => {
    if (selectedIncidentId) {
      const inc = mockService.getIncidentById(selectedIncidentId);
      if (inc) {
        setSelectedItem({ type: 'incident', item: inc });
      }
    } else if (selectedItem?.type === 'incident') {
      setSelectedItem(null);
    }
  }, [selectedIncidentId]);

  const toggleLayer = (layerName: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const handleSelectIncident = (incident: Incident) => {
    setSelectedItem({ type: 'incident', item: incident });
    if (onSelectIncident) onSelectIncident(incident);
  };

  const handleSelectResource = (resource: Resource) => {
    setSelectedItem({ type: 'resource', item: resource });
    if (onSelectResource) onSelectResource(resource);
  };

  const handleSelectHospital = (hospital: Hospital) => {
    setSelectedItem({ type: 'hospital', item: hospital });
    if (onSelectHospital) onSelectHospital(hospital);
  };

  // Carto tile URL based on current active theme
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="w-full h-full relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#070b14] overflow-hidden flex flex-col transition-colors">
      
      {/* India-Wide Geography Header & Provider Switcher */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 select-none">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-md shadow-md text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-900 dark:text-white">India Emergency Network</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {provider === 'google' ? 'Google Maps' : 'India GIS Feed'}
          </span>
        </div>

        {/* Map Provider Switcher Button */}
        {googleApiKey && (
          <button
            onClick={() => {
              if (provider === 'leaflet') setProvider('google');
              else setProvider('leaflet');
            }}
            className="px-2.5 py-1 rounded-md text-xs font-medium border shadow-md transition-colors flex items-center gap-1.5 bg-blue-600 text-white border-blue-500"
            title="Switch map provider"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{provider === 'google' ? 'Google Maps' : 'OSM Leaflet'}</span>
          </button>
        )}
      </div>

      {/* RENDER GOOGLE MAP PROVIDER IF ENABLED AND API KEY CONFIGURED */}
      {provider === 'google' && googleApiKey ? (
        <GoogleMapContainer
          apiKey={googleApiKey}
          center={{ lat: stats.center.lat, lng: stats.center.lng }}
          zoom={5}
          zones={zones}
          incidents={incidents}
          resources={resources}
          hospitals={hospitals}
          routes={routes}
          layers={layers}
          selectedItem={selectedItem}
          onSelectIncident={handleSelectIncident}
          onSelectResource={handleSelectResource}
          onSelectHospital={handleSelectHospital}
          onSelectZone={(zone: Zone) => setSelectedItem({ type: 'zone', item: zone })}
          theme={theme}
        />
      ) : (
        /* RENDER INDIA LEAFLET MAP PROVIDER */
        <div className="w-full h-full relative">
          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            minZoom={4}
            maxZoom={18}
            maxBounds={INDIA_BOUNDS}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            style={{ width: '100%', height: '100%', backgroundColor: theme === 'dark' ? '#070b14' : '#f8fafc' }}
            zoomControl={true}
            className="z-0 relative"
          >
            {/* Top Map Toolbar */}
            <div 
              className="absolute top-3 right-3 z-[1000] flex items-center gap-2 select-none"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {/* Map View Navigation Controls */}
              <MapControlButtons zones={zones} />

              {/* Layer Controls Dropdown/Strip */}
              <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700/80 rounded-md px-2.5 py-1 font-sans text-xs shadow-md text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.zones}
                    onChange={() => toggleLayer('zones')}
                    className="rounded text-blue-600 focus:ring-0 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <span>Zones ({zones.length})</span>
                </label>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.incidents}
                    onChange={() => toggleLayer('incidents')}
                    className="rounded text-rose-600 focus:ring-0 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <span>Incidents ({incidents.length})</span>
                </label>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.resources}
                    onChange={() => toggleLayer('resources')}
                    className="rounded text-amber-600 focus:ring-0 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <span>Fleet ({resources.length})</span>
                </label>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.hospitals}
                    onChange={() => toggleLayer('hospitals')}
                    className="rounded text-emerald-600 focus:ring-0 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <span>Hospitals ({hospitals.length})</span>
                </label>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={layers.routes}
                    onChange={() => toggleLayer('routes')}
                    className="rounded text-blue-600 focus:ring-0 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                  />
                  <span>Routes ({routes.length})</span>
                </label>
              </div>
            </div>

            <MapCenterController selectedItem={selectedItem} />
            <MapTapZoomController />

            {/* Theme-Aware Real Map Tiles */}
            <TileLayer
              key={theme}
              url={tileUrl}
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              maxZoom={19}
            />

            {/* 1. Zone Layer (Subtle Low-Opacity Fills & Boundaries) */}
            {layers.zones && (
              <>
                {zones.map((zone) => {
                  const positions = zone.polygon.map((pt) => [pt.lat, pt.lng] as [number, number]);
                  const isSelected = selectedItem?.type === 'zone' && selectedItem.item.id === zone.id;
                  const color = zone.coverageStatus === 'ADEQUATE' ? '#3b82f6' : '#f59e0b';

                  return (
                    <Polygon
                      key={zone.id}
                      positions={positions}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: isSelected ? 0.15 : 0.06,
                        weight: isSelected ? 2.5 : 1.5,
                      }}
                      eventHandlers={{
                        click: () => setSelectedItem({ type: 'zone', item: zone }),
                      }}
                    />
                  );
                })}
              </>
            )}

            {/* 2. Route Layer (Real Road OSRM Routes with Fallback Handling) */}
            {layers.routes && (
              <>
                {roadRoutes.map((route) => {
                  let positions = route.waypoints.map((pt) => [pt.lat, pt.lng] as [number, number]);
                  const isFallback = route.routingStatus === 'FALLBACK' || route.isSimulated;

                  // Trim start coordinate so route line connects at the outer border of the resource icon (not inside its center)
                  if (positions.length >= 2) {
                    const [lat0, lng0] = positions[0];
                    const [lat1, lng1] = positions[1];
                    const dLat = lat1 - lat0;
                    const dLng = lng1 - lng0;
                    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                    if (dist > 0) {
                      const offsetDeg = 0.00025; // ~20px offset at operational zoom
                      const actualOffset = Math.min(offsetDeg, dist * 0.4);
                      positions = [
                        [lat0 + (dLat / dist) * actualOffset, lng0 + (dLng / dist) * actualOffset],
                        ...positions.slice(1),
                      ];
                    }
                  }

                  return (
                    <React.Fragment key={route.id}>
                      {/* Outer halo stroke for emergency route visibility */}
                      {!isFallback && (
                        <Polyline
                          positions={positions}
                          pathOptions={{
                            color: '#0284c7',
                            weight: 6.5,
                            opacity: 0.35,
                            lineCap: 'round',
                            lineJoin: 'round',
                          }}
                        />
                      )}

                      {/* Inner crisp emergency route polyline */}
                      <Polyline
                        positions={positions}
                        pathOptions={{
                          color: route.blocked ? '#ef4444' : '#2563eb',
                          weight: 3.5,
                          opacity: 0.95,
                          lineCap: 'round',
                          lineJoin: 'round',
                          dashArray: isFallback ? '6, 8' : undefined,
                        }}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="font-sans text-xs p-1 min-w-[180px]">
                            <div className="font-bold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1">
                              <span>{route.callSign || route.resourceId} → {route.targetTitle || 'Incident'}</span>
                            </div>

                            {route.routingStatus === 'SUCCESS' && route.distanceKm !== null && route.etaMinutes !== null ? (
                              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Distance:</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">{route.distanceKm} km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ETA:</span>
                                  <span className="font-mono font-bold text-amber-500">{route.etaMinutes} min</span>
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5 border-t border-slate-200 dark:border-slate-800">
                                  ✓ Real Road Route (OSRM)
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  Simulated Route (Road routing unavailable)
                                </div>
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Polyline>
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* 3. Hospital Layer */}
            {layers.hospitals && (
              <>
                {hospitals.map((hospital) => {
                  const isSelected = selectedItem?.type === 'hospital' && selectedItem.item.id === hospital.id;
                  const icon = createHospitalIcon(hospital, isSelected);

                  return (
                    <Marker
                      key={hospital.id}
                      position={[hospital.location.lat, hospital.location.lng]}
                      icon={icon}
                      zIndexOffset={isSelected ? 1000 : 400}
                      eventHandlers={{
                        click: () => handleSelectHospital(hospital),
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="font-sans text-xs p-1">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 border-b pb-1 mb-1">
                            {hospital.name}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Beds Available: <span className="font-bold">{hospital.bedsAvailable} / {hospital.bedsTotal}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            )}

            {/* 4. Resource Units Layer */}
            {layers.resources && (
              <>
                {resources.map((resource) => {
                  if (!resource.location) return null;
                  const isSelected = selectedItem?.type === 'resource' && selectedItem.item.id === resource.id;
                  const icon = createResourceIcon(resource, isSelected);

                  return (
                    <Marker
                      key={resource.id}
                      position={[resource.location.lat, resource.location.lng]}
                      icon={icon}
                      zIndexOffset={isSelected ? 1000 : 500}
                      eventHandlers={{
                        click: () => handleSelectResource(resource),
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="font-mono text-xs p-1">
                          <div className="font-bold text-blue-600 dark:text-blue-400 border-b pb-1 mb-1">
                            {resource.callSign} ({resource.type})
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Status: <span className="font-bold">{resource.status}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            )}

            {/* 5. Incident Layer */}
            {layers.incidents && (
              <>
                {incidents.map((incident) => {
                  const isSelected = selectedItem?.type === 'incident' && selectedItem.item.id === incident.id;
                  const icon = createIncidentIcon(incident, isSelected);

                  return (
                    <Marker
                      key={incident.id}
                      position={[incident.location.lat, incident.location.lng]}
                      icon={icon}
                      eventHandlers={{
                        click: () => handleSelectIncident(incident),
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="font-sans text-xs p-1">
                          <div className="font-bold text-rose-600 dark:text-rose-400 border-b pb-1 mb-1">
                            {incident.title}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Severity: <span className="font-bold">{incident.severity}/5</span> | Status: {incident.status}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            )}
          </MapContainer>
        </div>
      )}

      {/* Map Symbology Legend */}
      <MapLegend />

      {/* Right-Side Compact Detail Drawer */}
      <MapDetailPanel
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
