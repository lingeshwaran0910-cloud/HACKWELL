import React from 'react';
import { Building2, Activity, Users, CheckCircle2 } from 'lucide-react';
import { mockService } from '../services/mockService';
import { Hospital } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';

export const HospitalsPage: React.FC = () => {
  const hospitals = mockService.getHospitals();

  const totalBeds = hospitals.reduce((acc, h) => acc + h.bedsTotal, 0);
  const availableBeds = hospitals.reduce((acc, h) => acc + (typeof h.bedsAvailable === 'number' ? h.bedsAvailable : 0), 0);
  const totalIncoming = hospitals.reduce((acc, h) => acc + h.incomingLoad, 0);
  const highPressureCount = hospitals.filter((h) => h.predictedPressure.level === 'HIGH' || h.predictedPressure.level === 'MODERATE').length;

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none">
      {/* Overview Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Trauma Centers</span>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{hospitals.length}</div>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Beds Available</span>
            <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{availableBeds} / {totalBeds}</div>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Incoming</span>
            <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{totalIncoming} Units</div>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Hospital Pressure</span>
            <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{highPressureCount} Alerting</div>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Hospitals Capacity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hospitals.map((h: Hospital) => {
          const avail = typeof h.bedsAvailable === 'number' ? h.bedsAvailable : 0;
          const occupied = h.bedsTotal - avail;
          const pctOccupied = Math.round((occupied / h.bedsTotal) * 100);

          return (
            <div
              key={h.id}
              className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-xs space-y-3"
            >
              {/* Title & Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{h.name}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Zone {h.zoneId}</span>
                  </div>
                  <StatusBadge
                    label={`PRESSURE: ${h.predictedPressure.level}`}
                    variant={h.predictedPressure.level === 'HIGH' ? 'danger' : 'info'}
                    size="sm"
                  />
                </div>
              </div>

              {/* Bed Capacity Meter */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>Bed Utilization ({pctOccupied}%)</span>
                  <span className="font-mono">{avail} Available / {h.bedsTotal} Total</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctOccupied > 80 ? 'bg-rose-500' : pctOccupied > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pctOccupied}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Occupied: {occupied}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">Incoming: {h.incomingLoad} units</span>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {h.capabilities.map((cap, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-[10px]">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
