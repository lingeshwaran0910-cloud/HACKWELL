import React, { useState } from 'react';
import { Sliders, Play, Activity } from 'lucide-react';
import { mockService } from '../services/mockService';
import { Simulation } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SectionHeader } from '../components/common/SectionHeader';

export const SimulationPage: React.FC = () => {
  const simulations = mockService.getSimulations();
  const [selectedSimIndex, setSelectedSimIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const activeSim: Simulation | undefined = simulations[selectedSimIndex] || simulations[0];

  const handleRunSim = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 800);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none">
      {/* Banner */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 rounded-lg text-purple-600 dark:text-purple-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Scenario Simulation</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Predictive response plan modeling</p>
          </div>
        </div>

        <StatusBadge label="SIMULATOR" variant="warning" size="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Scenario List */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-col space-y-3 shadow-xs">
          <SectionHeader
            title="Scenarios"
            count={simulations.length || 2}
            icon={<Activity className="w-4 h-4 text-purple-500" />}
          />

          <div className="space-y-2 text-xs">
            {simulations.map((sim, idx) => (
              <div
                key={sim.id}
                onClick={() => setSelectedSimIndex(idx)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedSimIndex === idx
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-600 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-300 text-xs">{sim.id}</span>
                  <span className="text-[10px] text-slate-400">Scenario</span>
                </div>
                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">{sim.label}</h4>
              </div>
            ))}
          </div>

          <button
            onClick={handleRunSim}
            disabled={isRunning}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Simulation...' : 'Run Simulation'}</span>
          </button>
        </div>

        {/* Plan A vs Plan B Scannable Comparison */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col space-y-3 shadow-xs">
          <SectionHeader
            title={`Compare: ${activeSim?.label || 'TVS Tollgate Blockage'}`}
            icon={<Sliders className="w-4 h-4 text-amber-500" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* PLAN A */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5 font-bold">
                <span className="text-slate-900 dark:text-slate-100">PLAN A</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">Service Lane</span>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">ETA</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">4.2 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Coverage</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Safe</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Hospital</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">KMC Stable</span>
                </div>
              </div>
            </div>

            {/* PLAN B */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5 font-bold">
                <span className="text-slate-900 dark:text-slate-100">PLAN B</span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">Collectorate Bypass</span>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">ETA</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">5.1 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Coverage</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Better</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Hospital</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">GH Stable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
