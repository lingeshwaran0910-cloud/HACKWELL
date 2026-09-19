import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Play,
  RotateCcw,
  MapPin,
  Clock,
  ShieldAlert,
  Truck,
  Building2,
  Zap,
  ArrowRight,
  Scale,
  History,
  Activity,
  X,
  UserCheck,
} from 'lucide-react';
import { mockService } from '../services/mockService';
import {
  simulationEngine,
  SUPPORTED_SCENARIOS,
  ScenarioType,
  SimulationResult,
} from '../services/simulationEngine';
import { realtimeEngine } from '../services/realtimeEngine';
import { StatusBadge } from '../components/common/StatusBadge';

type SimStage = 'setup' | 'result' | 'impact';

export const SimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState<SimStage>('setup');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('RESOURCE_FAILURE');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('res-a07');
  const [activeResult, setActiveResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Dynamic entity options based on scenario
  const getEntityOptions = (scenario: ScenarioType) => {
    switch (scenario) {
      case 'RESOURCE_FAILURE':
      case 'RESOURCE_REASSIGNMENT':
        return mockService.getResources().map((r) => ({
          id: r.id,
          label: `${r.callSign} (${r.type} - ${r.status})`,
        }));
      case 'HOSPITAL_OVERLOAD':
        return mockService.getHospitals().map((h) => ({
          id: h.id,
          label: `${h.name} (${h.bedsAvailable}/${h.bedsTotal} Beds Available)`,
        }));
      case 'INCIDENT_ESCALATION':
        return mockService.getIncidents().map((i) => ({
          id: i.id,
          label: `${i.title} (${i.id} - Severity ${i.severity})`,
        }));
      case 'ROAD_BLOCKAGE':
        return mockService.getRoutes().map((rt) => ({
          id: rt.id,
          label: `Route ${rt.id} (${rt.routingMode} - ${rt.distanceKm} km)`,
        }));
      case 'RESOURCE_SHORTAGE':
        return [{ id: 'city-wide', label: 'City-Wide Fleet (Trichy All Zones)' }];
      case 'MULTIPLE_INCIDENTS':
        return [{ id: 'multi-surge', label: 'Concurrent Emergency Surge (4 Calls)' }];
      default:
        return [];
    }
  };

  const currentScenarioDef = SUPPORTED_SCENARIOS.find((s) => s.id === selectedScenario);

  const handleScenarioChange = (scenario: ScenarioType) => {
    setSelectedScenario(scenario);
    const scenDef = SUPPORTED_SCENARIOS.find((s) => s.id === scenario);
    const defaultId = scenDef ? scenDef.defaultEntityId : '';
    setSelectedEntityId(defaultId);
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = simulationEngine.runSimulation(selectedScenario, selectedEntityId);
      setActiveResult(res);
      realtimeEngine.applySimulationEffect(selectedScenario, selectedEntityId);
      setIsRunning(false);
      // AUTOMATIC TRANSITION TO STAGE 2: RESULT
      setActiveStage('result');
    }, 150);
  };

  const handleResetSimulation = () => {
    setSelectedScenario('RESOURCE_FAILURE');
    setSelectedEntityId('res-a07');
    setActiveResult(null);
    realtimeEngine.resetSimulationEffects();
    setActiveStage('setup');
  };

  const handleViewOnMap = () => {
    if (activeResult?.mapTarget?.id) {
      navigate('/map', {
        state: { selectedIncidentId: activeResult.mapTarget.id },
      });
    }
  };

  const entityOptions = getEntityOptions(selectedScenario);
  const historyList = simulationEngine.getHistory();

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4 font-sans select-none pb-8">
      {/* 1. HEADER */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 rounded-xl text-purple-600 dark:text-purple-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-900 dark:text-slate-100">
                What-If Simulation
              </h1>
              <StatusBadge
                label={
                  isRunning
                    ? 'RUNNING SIMULATION...'
                    : activeResult
                    ? 'SIMULATION COMPLETE'
                    : 'READY TO SIMULATE'
                }
                variant={isRunning ? 'warning' : activeResult ? 'success' : 'info'}
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test how emergency decisions affect response capacity, coverage and hospital pressure.
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span>Simulation History ({historyList.length})</span>
        </button>
      </div>

      {/* 2. STAGE SEGMENTED NAVIGATION */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-2 shadow-xs flex items-center justify-between gap-2 text-xs font-sans">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Stage 1: Setup */}
          <button
            onClick={() => setActiveStage('setup')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
              activeStage === 'setup'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-[10px] flex items-center justify-center font-mono">
              1
            </span>
            <span>Setup</span>
            {activeResult ? (
              <span className="text-emerald-400 font-bold ml-1">✓</span>
            ) : (
              <span className="text-purple-300 ml-1">●</span>
            )}
          </button>

          {/* Stage 2: Result */}
          <button
            onClick={() => {
              if (activeResult) setActiveStage('result');
            }}
            disabled={!activeResult}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center justify-center sm:justify-start gap-2 transition-all ${
              activeStage === 'result'
                ? 'bg-purple-600 text-white shadow-xs cursor-pointer'
                : activeResult
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-[10px] flex items-center justify-center font-mono">
              2
            </span>
            <span>Result</span>
            {activeResult ? (
              <span className="text-emerald-400 font-bold ml-1">✓</span>
            ) : (
              <span className="text-slate-400 ml-1">○</span>
            )}
          </button>

          {/* Stage 3: Impact & Decision */}
          <button
            onClick={() => {
              if (activeResult) setActiveStage('impact');
            }}
            disabled={!activeResult}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center justify-center sm:justify-start gap-2 transition-all ${
              activeStage === 'impact'
                ? 'bg-purple-600 text-white shadow-xs cursor-pointer'
                : activeResult
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-[10px] flex items-center justify-center font-mono">
              3
            </span>
            <span>Impact & Decision</span>
            {activeResult ? (
              <span className="text-purple-400 font-bold ml-1">→</span>
            ) : (
              <span className="text-slate-400 ml-1">○</span>
            )}
          </button>
        </div>

        {activeResult && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleViewOnMap}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>View on Map</span>
            </button>
            <button
              onClick={handleResetSimulation}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. STAGE CONTENT AREA */}

      {/* STAGE 1 — SETUP */}
      {activeStage === 'setup' && (
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Simulation Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a What-If scenario rule and target entity to model consequences.
              </p>
            </div>
            <StatusBadge label="STEP 1 OF 3" variant="info" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Scenario Rule Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-500" /> Scenario Rule
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => handleScenarioChange(e.target.value as ScenarioType)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_SCENARIOS.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    {scen.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Target Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-purple-500" /> Affected Entity / Asset
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
              >
                {entityOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scenario Explanation Card */}
          {currentScenarioDef && (
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg text-xs space-y-1">
              <span className="font-bold text-purple-900 dark:text-purple-200 block">
                Scenario Definition:
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-xs">
                {currentScenarioDef.description}
              </p>
            </div>
          )}

          {/* Quick Scenario Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Select Scenarios:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_SCENARIOS.map((scen) => {
                const isSelected = selectedScenario === scen.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => handleScenarioChange(scen.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {scen.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={handleResetSimulation}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Simulation...' : 'RUN SIMULATION'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2 — RESULT */}
      {activeStage === 'result' && activeResult && (
        <div className="space-y-4">
          {/* Result Header */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Simulation Result: {activeResult.scenarioLabel}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How the simulated event changes the current response plan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveStage('impact')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>View Impact & Decision</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5 KPI Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* KPI 1: Response ETA */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between kpi-card-interactive">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Response ETA</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </span>
              <div className="my-1 font-mono">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {activeResult.planA.etaMinutes}m → {activeResult.planB.etaMinutes}m
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  +{(activeResult.planB.etaMinutes - activeResult.planA.etaMinutes).toFixed(1)} min delay
                </div>
              </div>
            </div>

            {/* KPI 2: Resource Balance */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between kpi-card-interactive">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Resource Balance</span>
                <Truck className="w-3.5 h-3.5 text-blue-500" />
              </span>
              <div className="my-1 font-mono">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {activeResult.planB.availableSupply} / {activeResult.planB.requiredDemand}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  Available vs Needed
                </div>
              </div>
            </div>

            {/* KPI 3: Coverage Risk */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between kpi-card-interactive">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Coverage Risk</span>
                <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
              </span>
              <div className="my-1 font-mono">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase truncate">
                  {activeResult.planB.coverageStatus.replace('_', ' ')}
                </div>
                <div className="text-[10px] text-slate-400">
                  Base: {activeResult.planA.coverageStatus}
                </div>
              </div>
            </div>

            {/* KPI 4: Hospital Load */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between kpi-card-interactive">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Hospital Load</span>
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
              </span>
              <div className="my-1 font-mono">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
                  {activeResult.planB.hospitalPressure}
                </div>
                <div className="text-[10px] text-slate-400">
                  Base: {activeResult.planA.hospitalPressure}
                </div>
              </div>
            </div>

            {/* KPI 5: Risk Cost */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Risk Cost</span>
                <Scale className="w-3.5 h-3.5 text-emerald-500" />
              </span>
              <div className="my-1 font-mono">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {activeResult.planB.costScore} pts
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  +{(activeResult.planB.costScore - activeResult.planA.costScore).toFixed(1)} penalty
                </div>
              </div>
            </div>
          </div>

          {/* Response Plan Comparison Table */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-500" />
                Response Plan Comparison
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Plan A (Baseline) vs Plan B (Simulated)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Current Response (Plan A)</th>
                    <th className="py-2 px-3">Simulated Response (Plan B)</th>
                    <th className="py-2 px-3 text-right">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Response ETA</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{activeResult.planA.etaMinutes} min</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-bold">{activeResult.planB.etaMinutes} min</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-bold text-right">+{(activeResult.planB.etaMinutes - activeResult.planA.etaMinutes).toFixed(1)} min</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Available Resources</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{activeResult.planA.availableSupply} units</td>
                    <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400 font-bold">{activeResult.planB.availableSupply} units</td>
                    <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400 font-bold text-right">{activeResult.planB.availableSupply - activeResult.planA.availableSupply} units</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Resource Demand</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{activeResult.planA.requiredDemand} units</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{activeResult.planB.requiredDemand} units</td>
                    <td className="py-2.5 px-3 text-slate-400 text-right">Matched</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Zone Coverage Status</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{activeResult.planA.coverageStatus}</td>
                    <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400 font-bold">{activeResult.planB.coverageStatus}</td>
                    <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400 font-bold text-right">Risk Elev.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Hospital Load</td>
                    <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-bold">{activeResult.planA.hospitalPressure}</td>
                    <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold">{activeResult.planB.hospitalPressure}</td>
                    <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold text-right">Surge Alert</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">Risk Cost Score</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{activeResult.planA.costScore} pts</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{activeResult.planB.costScore} pts</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-bold text-right">+{(activeResult.planB.costScore - activeResult.planA.costScore).toFixed(1)} pts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* What Changed Vertical Event Flow */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-purple-500" />
                What Changed
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Sequential Event Flow</span>
            </div>

            <div className="space-y-2 text-xs">
              {activeResult.whatChanged.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                  {idx < activeResult.whatChanged.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3 — IMPACT & DECISION */}
      {activeStage === 'impact' && activeResult && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Impact & Decision Analysis
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deep consequence analysis, ripple effects, trade-offs and decision support context.
              </p>
            </div>
            <StatusBadge label="HUMAN APPROVAL REQUIRED" variant="warning" size="sm" />
          </div>

          {/* 1. City-Wide Impact (2-Column Concise Grid) */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              City-Wide Impact Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  Response Network Impact
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  {activeResult.operationalImpact}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  Zone Coverage Exposure
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  {activeResult.coverageImpact}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  Hospital Capacity Impact
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  {activeResult.hospitalImpact}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  Traffic & Fleet Transit Reroute
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  {activeResult.resourceImpact}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Ripple Effect Visual Flow Chain */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Ripple Effect Sequence
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {activeResult.rippleChain.map((step) => (
                <div
                  key={step.step}
                  className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        STEP {step.step}
                      </span>
                      <StatusBadge
                        label={step.severity}
                        variant={
                          step.severity === 'CRITICAL'
                            ? 'danger'
                            : step.severity === 'WARNING'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      />
                    </div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {step.title}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Response Trade-Off (Compact 3-Column Layout) */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Scale className="w-4 h-4 text-purple-500" />
              Response Trade-Off Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block text-xs uppercase tracking-wider">
                  BENEFIT
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-xs">
                  Faster life support arrival to high-priority emergency site.
                </p>
              </div>

              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-300 block text-xs uppercase tracking-wider">
                  COST
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-xs">
                  Reduced reserve vehicle availability in Cantonment zone.
                </p>
              </div>

              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg space-y-1">
                <span className="font-bold text-rose-700 dark:text-rose-300 block text-xs uppercase tracking-wider">
                  RISK
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-xs">
                  Higher exposure if secondary concurrent call occurs in Central Trichy.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
              <strong>Summary:</strong> {activeResult.tradeOffSummary}
            </div>
          </div>

          {/* 4. Decision Context */}
          <div className="bg-slate-900 text-white dark:bg-[#0b1329] border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-xs text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Decision Support Context</span>
              </h3>
              <StatusBadge label="HUMAN APPROVAL REQUIRED" variant="warning" size="sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recommended Action</span>
                <span className="font-bold text-emerald-400 text-xs">
                  Deploy AMB-022 to {activeResult.scenarioLabel.split(' ')[0]}
                </span>
              </div>

              <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reasoning</span>
                <span className="font-medium text-slate-200 text-xs">
                  Nearest suitable reserve ambulance available within 5.5 min ETA.
                </span>
              </div>

              <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Expected Impact</span>
                <span className="font-medium text-purple-300 text-xs">
                  Restores coverage with a +{(activeResult.planB.etaMinutes - activeResult.planA.etaMinutes).toFixed(1)}m response window.
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-sans italic text-center pt-1">
              SafeCity decision support protocol: EOC shift lead maintains final responsibility for dispatch execution.
            </div>
          </div>
        </div>
      )}

      {/* 4. SIMULATION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans text-xs p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setShowHistoryModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-10 max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-500" />
                <span>Simulation History ({historyList.length})</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {historyList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No simulation runs recorded yet.
                </div>
              ) : (
                historyList.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setActiveResult(item);
                      setShowHistoryModal(false);
                      setActiveStage('result');
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-purple-500 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {item.scenarioLabel}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
                      ETA: {item.planB.etaMinutes}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
