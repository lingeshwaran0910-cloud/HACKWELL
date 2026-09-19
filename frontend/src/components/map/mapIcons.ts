import L from 'leaflet';
import { Incident, Resource, Hospital } from '@shared/types';

/**
 * SafeCity AI — Primary GIS Vector Emergency Marker System
 * Renders recognizable primary vector SVG vehicle/facility pictograms with secondary ID labels underneath.
 */

export const createIncidentIcon = (incident: Incident, isSelected = false) => {
  const isSuspected = incident.status === 'SUSPECTED' || incident.verificationRequired || incident.silentAnomaly;

  let bgClass = 'bg-rose-600 text-white border-white';
  
  // Primary Vector SVG Icons for Incident Types
  let svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`; // Crash warning

  if (isSuspected) {
    bgClass = 'bg-amber-600 text-white border-white';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else if (incident.type === 'FIRE') {
    bgClass = 'bg-orange-600 text-white border-white';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>`;
  } else if (incident.type === 'MEDICAL') {
    bgClass = 'bg-blue-600 text-white border-white';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  } else if (incident.type === 'FLOOD') {
    bgClass = 'bg-cyan-600 text-white border-white';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  } else if (incident.type === 'HAZMAT') {
    bgClass = 'bg-purple-600 text-white border-white';
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 9V3"/><path d="M14.6 13.5l5.2 3"/><path d="M9.4 13.5l-5.2 3"/></svg>`;
  }

  const selectedRing = isSelected ? 'ring-4 ring-white scale-110 shadow-2xl z-50' : 'shadow-xl';

  const html = `
    <div class="flex flex-col items-center justify-center select-none pointer-events-auto">
      <!-- Primary Vector Badge Icon -->
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 ${bgClass} ${selectedRing} transition-transform shadow-xl shrink-0">
        ${svgIcon}
      </div>
      <!-- Secondary ID Tag Below -->
      <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-rose-300 border border-slate-700/80 text-[9px] font-mono font-bold shadow-md whitespace-nowrap tracking-tight">
        ${incident.id}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-marker',
    iconSize: [60, 54],
    iconAnchor: [30, 18],
    popupAnchor: [0, -18],
  });
};

export const createResourceIcon = (resource: Resource, isSelected = false) => {
  // 1. POLICE UNIT — Exact Standalone Solid Filled Police Officer SVG (No background box/circle)
  if (resource.type === 'POLICE_UNIT') {
    const selectedEffect = isSelected ? 'scale-125 z-50 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]' : 'drop-shadow-[0_2px_8px_rgba(99,102,241,0.7)]';

    const policeSvg = `
      <svg width="36" height="36" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="Police officer" class="text-indigo-400 dark:text-indigo-400 shrink-0">
        <!-- Filled police cap -->
        <path d="M14 17.5C15 12.5 18.5 9.5 24 9.5C29.5 9.5 33 12.5 34 17.5H37C37.8 17.5 38.5 18.2 38.5 19C38.5 19.8 37.8 20.5 37 20.5H11C10.2 20.5 9.5 19.8 9.5 19C9.5 18.2 10.2 17.5 11 17.5H14Z" fill="currentColor"/>
        <!-- Cap band -->
        <path d="M16 14.5H32L31 17.5H17L16 14.5Z" fill="currentColor" opacity="0.75"/>
        <!-- Officer head -->
        <path d="M17 22C17 18.2 19.8 15.5 24 15.5C28.2 15.5 31 18.2 31 22V25.5C31 29.5 28.2 32 24 32C19.8 32 17 29.5 17 25.5V22Z" fill="currentColor"/>
        <!-- Face cut-out -->
        <path d="M20.5 23.5C21.2 22.8 22 22.5 22.8 22.5C23.6 22.5 24.4 22.8 25 23.5C25.6 22.8 26.4 22.5 27.2 22.5C28 22.5 28.8 22.8 29.5 23.5V26C29.5 29 27.3 30.5 24 30.5C20.7 30.5 18.5 29 18.5 26V23.5C19.2 22.8 20 22.5 20.8 22.5C21.6 22.5 22.4 22.8 23 23.5" fill="white" opacity="0.9"/>
        <!-- Uniform -->
        <path d="M17 31L11 34.5L8.5 45H39.5L37 34.5L31 31L24 37L17 31Z" fill="currentColor"/>
        <!-- Collar -->
        <path d="M17 31L24 37L31 31L28.5 29.5L24 34L19.5 29.5L17 31Z" fill="white" opacity="0.9"/>
        <!-- Tie -->
        <path d="M22.5 34L24 36L25.5 34L25 42L24 44L23 42L22.5 34Z" fill="currentColor"/>
        <!-- Uniform buttons -->
        <circle cx="24" cy="39" r="1.15" fill="white"/>
        <circle cx="24" cy="42" r="1.15" fill="white"/>
        <!-- Shoulder details -->
        <path d="M12.5 35L17.5 33.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M35.5 35L30.5 33.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;

    const html = `
      <div class="flex flex-col items-center justify-center select-none pointer-events-auto ${selectedEffect} transition-transform">
        <!-- Standalone Solid Filled Police Officer SVG -->
        ${policeSvg}
        <!-- Secondary ID Tag Below -->
        <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-indigo-300 border border-indigo-700/80 text-[9px] font-mono font-bold shadow-md whitespace-nowrap tracking-tight">
          ${resource.callSign}
        </span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-resource-marker-police',
      iconSize: [60, 56],
      iconAnchor: [30, 20],
      popupAnchor: [0, -20],
    });
  }

  // 2. OTHER RESOURCES (Ambulance, Fire Engine, Rescue Unit)
  let bgClass = 'bg-blue-600 border-white text-white';
  // Ambulance Vehicle Contour SVG
  let svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M10 9v4M8 11h4"/></svg>`;

  if (resource.type === 'FIRE_UNIT') {
    bgClass = 'bg-orange-600 border-white text-white';
    // Fire Engine Truck SVG
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18M2 12h14v5H2v-5zm14 0h4l2 3v2h-6v-5z"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M4 8h14M7 8v4M11 8v4M15 8v4"/></svg>`;
  } else if (resource.type === 'RESCUE_UNIT') {
    bgClass = 'bg-amber-600 border-white text-white';
    // Rescue Vehicle SVG
    svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>`;
  }

  const selectedRing = isSelected ? 'ring-4 ring-white scale-110 shadow-2xl z-50' : 'shadow-xl';

  const html = `
    <div class="flex flex-col items-center justify-center select-none pointer-events-auto">
      <!-- Primary Vector Badge Icon -->
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 ${bgClass} ${selectedRing} transition-transform shadow-xl shrink-0">
        ${svgIcon}
      </div>
      <!-- Secondary ID Tag Below -->
      <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-white border border-slate-700/80 text-[9px] font-mono font-bold shadow-md whitespace-nowrap tracking-tight">
        ${resource.callSign}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-resource-marker',
    iconSize: [60, 54],
    iconAnchor: [30, 18],
    popupAnchor: [0, -18],
  });
};

export const createHospitalIcon = (hospital: Hospital, isSelected = false) => {
  const selectedRing = isSelected ? 'ring-4 ring-white scale-110 z-50 shadow-2xl' : 'shadow-xl';

  const hospitalSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h12"/><path d="M6 22h12"/><rect width="14" height="16" x="5" y="2" rx="2"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>`;

  const html = `
    <div class="flex flex-col items-center justify-center select-none pointer-events-auto">
      <!-- Primary Vector Badge Icon -->
      <div class="relative flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 border-2 border-white text-white ${selectedRing} transition-transform shadow-xl shrink-0">
        ${hospitalSvg}
      </div>
      <!-- Secondary Name Tag Below -->
      <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-emerald-300 border border-slate-700/80 text-[9px] font-sans font-bold shadow-md whitespace-nowrap tracking-tight line-clamp-1 max-w-[90px]">
        ${hospital.name.split(' ')[0]}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hospital-marker',
    iconSize: [90, 54],
    iconAnchor: [45, 18],
    popupAnchor: [0, -18],
  });
};
