import React from 'react';

export const MapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] bg-[#0f172a]/90 backdrop-blur-md border border-slate-800/80 rounded-lg p-2.5 text-[11px] font-sans text-slate-300 shadow-xl max-w-xs select-none">
      <div className="font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800/80 pb-1 text-[10px] flex items-center justify-between">
        <span>Map Symbology</span>
        <span className="font-mono text-slate-500 text-[9px]">Hackwell Grid</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300 flex items-center justify-center text-[7px] font-bold text-white">!</span>
          <span>Incident (High Sev)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 flex items-center justify-center text-[7px] font-bold text-white">?</span>
          <span>Suspected / Silent</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-mono font-bold">A12</span>
          <span>Ambulance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1 py-0.2 rounded bg-orange-600 text-white text-[9px] font-mono font-bold">F01</span>
          <span>Fire Unit</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-1 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-mono font-bold">P01</span>
          <span>Police Unit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1 py-0.2 rounded bg-amber-600 text-white text-[9px] font-mono font-bold">R01</span>
          <span>Rescue Unit</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-300 text-white font-bold text-[8px] flex items-center justify-center">H</span>
          <span>Hospital</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-blue-400 rounded"></span>
          <span>Route</span>
        </div>
      </div>
    </div>
  );
};

