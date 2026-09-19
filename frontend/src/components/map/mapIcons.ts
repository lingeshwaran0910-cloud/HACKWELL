import L from 'leaflet';
import { Incident, Resource, Hospital } from '@shared/types';

/**
 * Creates custom crisp SVG semantic Leaflet icons matching SafeCity command center styling.
 * Uses clean SVGs for Incident (Alert), Ambulance (Cross/Vehicle), Police (Shield), Fire (Flame), Hospital (H/Cross).
 */

export const createIncidentIcon = (incident: Incident, isSelected = false) => {
  const isCritical = incident.severity >= 4;
  const isSuspected = incident.status === 'SUSPECTED' || incident.verificationRequired || incident.silentAnomaly;

  let bgClass = 'bg-rose-600 text-white border-rose-200';
  let pulseHtml = isCritical ? `<span class="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-60"></span>` : '';
  
  // Clean SVG Icons
  let svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  if (isSuspected) {
    bgClass = 'bg-amber-600 text-white border-amber-200';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else if (incident.type === 'FIRE') {
    bgClass = 'bg-orange-600 text-white border-orange-200';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>`;
  } else if (incident.type === 'MEDICAL') {
    bgClass = 'bg-blue-600 text-white border-blue-200';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  } else if (incident.type === 'FLOOD') {
    bgClass = 'bg-cyan-600 text-white border-cyan-200';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  }

  const selectedRing = isSelected ? 'ring-2 ring-white scale-110 shadow-xl z-50' : 'shadow-md';

  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      ${pulseHtml}
      <div class="relative flex items-center justify-center w-6 h-6 rounded-full border ${bgClass} ${selectedRing} transition-transform">
        ${svgIcon}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

export const createResourceIcon = (resource: Resource, isSelected = false) => {
  let bgClass = 'bg-blue-600 border-blue-200';

  if (resource.type === 'FIRE_UNIT') {
    bgClass = 'bg-orange-600 border-orange-200';
  } else if (resource.type === 'POLICE_UNIT') {
    bgClass = 'bg-indigo-600 border-indigo-200';
  } else if (resource.type === 'RESCUE_UNIT') {
    bgClass = 'bg-amber-600 border-amber-200';
  }

  let statusDot = 'bg-emerald-400';
  if (resource.status === 'ASSIGNED' || resource.status === 'EN_ROUTE' || resource.status === 'TRANSPORTING') {
    statusDot = 'bg-amber-400 animate-pulse';
  } else if (resource.status === 'UNAVAILABLE' || resource.stale) {
    statusDot = 'bg-rose-400';
  }

  const selectedRing = isSelected ? 'ring-2 ring-white scale-110 shadow-xl z-50' : 'shadow';

  const html = `
    <div class="relative flex items-center justify-center select-none">
      <div class="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold text-white flex items-center gap-1 ${bgClass} ${selectedRing}">
        <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
        <span>${resource.callSign}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-resource-marker',
    iconSize: [38, 20],
    iconAnchor: [19, 10],
    popupAnchor: [0, -10],
  });
};

export const createHospitalIcon = (_hospital: Hospital, isSelected = false) => {
  const selectedRing = isSelected ? 'ring-2 ring-white scale-110 z-50' : 'shadow-md';

  const html = `
    <div class="relative flex items-center justify-center select-none">
      <div class="w-6 h-6 rounded bg-emerald-600 border border-emerald-200 text-white font-mono font-bold text-xs flex items-center justify-center ${selectedRing}">
        <span>H</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hospital-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};
