import React from 'react';
import { AlertTriangle, Ambulance, Flame, HeartPulse, Building2, HelpCircle } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] bg-[#0f172a]/90 backdrop-blur-md border border-slate-800/80 rounded-lg p-3 text-[11px] font-sans text-slate-300 shadow-xl max-w-xs select-none">
      <div className="font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800/80 pb-1 text-[10px] flex items-center justify-between">
        <span>Map Symbology</span>
        <span className="font-mono text-slate-500 text-[9px]">India Emergency Grid</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        {/* Incidents */}
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-rose-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <AlertTriangle className="w-3 h-3" />
          </span>
          <span>Road Accident</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-amber-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <HelpCircle className="w-3 h-3" />
          </span>
          <span>Suspected / Anomaly</span>
        </div>

        {/* Resources */}
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <Ambulance className="w-3 h-3" />
          </span>
          <span>Ambulance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-orange-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <Flame className="w-3 h-3" />
          </span>
          <span>Fire Service</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 flex items-center justify-center text-indigo-400 shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Police officer"
            >
              <path d="M14 17.5C15 12.5 18.5 9.5 24 9.5C29.5 9.5 33 12.5 34 17.5H37C37.8 17.5 38.5 18.2 38.5 19C38.5 19.8 37.8 20.5 37 20.5H11C10.2 20.5 9.5 19.8 9.5 19C9.5 18.2 10.2 17.5 11 17.5H14Z" fill="currentColor"/>
              <path d="M16 14.5H32L31 17.5H17L16 14.5Z" fill="currentColor" opacity="0.75"/>
              <path d="M17 22C17 18.2 19.8 15.5 24 15.5C28.2 15.5 31 18.2 31 22V25.5C31 29.5 28.2 32 24 32C19.8 32 17 29.5 17 25.5V22Z" fill="currentColor"/>
              <path d="M20.5 23.5C21.2 22.8 22 22.5 22.8 22.5C23.6 22.5 24.4 22.8 25 23.5C25.6 22.8 26.4 22.5 27.2 22.5C28 22.5 28.8 22.8 29.5 23.5V26C29.5 29 27.3 30.5 24 30.5C20.7 30.5 18.5 29 18.5 26V23.5C19.2 22.8 20 22.5 20.8 22.5C21.6 22.5 22.4 22.8 23 23.5" fill="white" opacity="0.9"/>
              <path d="M17 31L11 34.5L8.5 45H39.5L37 34.5L31 31L24 37L17 31Z" fill="currentColor"/>
              <path d="M17 31L24 37L31 31L28.5 29.5L24 34L19.5 29.5L17 31Z" fill="white" opacity="0.9"/>
              <path d="M22.5 34L24 36L25.5 34L25 42L24 44L23 42L22.5 34Z" fill="currentColor"/>
              <circle cx="24" cy="39" r="1.15" fill="white"/>
              <circle cx="24" cy="42" r="1.15" fill="white"/>
              <path d="M12.5 35L17.5 33.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M35.5 35L30.5 33.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span>Police Unit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-amber-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <HeartPulse className="w-3 h-3" />
          </span>
          <span>Rescue Unit</span>
        </div>

        {/* Hospital & Route */}
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-emerald-600 border border-white flex items-center justify-center text-white shrink-0 shadow-xs">
            <Building2 className="w-3 h-3" />
          </span>
          <span>Hospital</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-1.5 bg-blue-600 rounded-full border border-blue-400"></span>
          <span>Road Route (OSRM)</span>
        </div>
      </div>
    </div>
  );
};
