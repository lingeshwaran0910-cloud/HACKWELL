import { mockService } from './mockService';

export type ScenarioType =
  | 'RESOURCE_FAILURE'
  | 'HOSPITAL_OVERLOAD'
  | 'INCIDENT_ESCALATION'
  | 'ROAD_BLOCKAGE'
  | 'RESOURCE_SHORTAGE'
  | 'MULTIPLE_INCIDENTS'
  | 'RESOURCE_REASSIGNMENT';

export interface ScenarioDefinition {
  id: ScenarioType;
  label: string;
  description: string;
  defaultEntityId: string;
}

export const SUPPORTED_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'RESOURCE_FAILURE',
    label: 'Resource Breakdown / Failure',
    description: 'Simulate emergency vehicle breakdown (e.g. AMB-014 mechanical failure)',
    defaultEntityId: 'res-a07',
  },
  {
    id: 'HOSPITAL_OVERLOAD',
    label: 'Hospital Trauma Surge',
    description: 'Simulate sudden bed capacity surge at KMC Trauma Center',
    defaultEntityId: 'hosp-001',
  },
  {
    id: 'INCIDENT_ESCALATION',
    label: 'Incident Severity Escalation',
    description: 'Escalate crash to Severity 5 critical hazard',
    defaultEntityId: 'inc-001',
  },
  {
    id: 'ROAD_BLOCKAGE',
    label: 'Arterial Corridor Blockage',
    description: 'Simulate flyover closure on NH 81 TVS Tollgate flyover',
    defaultEntityId: 'route-001',
  },
  {
    id: 'RESOURCE_SHORTAGE',
    label: 'City-Wide Fleet Shortage',
    description: 'Simulate high demand vs constrained ambulance supply',
    defaultEntityId: 'city-wide',
  },
  {
    id: 'MULTIPLE_INCIDENTS',
    label: 'Concurrent Emergency Surge',
    description: 'Simulate 4 simultaneous high-severity calls',
    defaultEntityId: 'multi-surge',
  },
  {
    id: 'RESOURCE_REASSIGNMENT',
    label: 'Resource Trade-Off Reassignment',
    description: 'Reassign AMB-014 from crash to railway cardiac emergency',
    defaultEntityId: 'res-a07',
  },
];

export interface SimulationResult {
  scenarioId: ScenarioType;
  scenarioLabel: string;
  timestamp: string;
  targetEntityId: string;

  // Plan A (Baseline) vs Plan B (Simulated) Metrics
  planA: {
    label: string;
    description: string;
    etaMinutes: number;
    availableSupply: number;
    requiredDemand: number;
    coverageStatus: string;
    hospitalPressure: string;
    costScore: number;
  };

  planB: {
    label: string;
    description: string;
    etaMinutes: number;
    availableSupply: number;
    requiredDemand: number;
    coverageStatus: string;
    hospitalPressure: string;
    costScore: number;
  };

  // Structured Impact Summaries
  whatChanged: string[];
  operationalImpact: string;
  resourceImpact: string;
  coverageImpact: string;
  hospitalImpact: string;
  incidentImpact: string;

  // Chain of Ripple Effects
  rippleChain: Array<{
    step: number;
    title: string;
    description: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  }>;

  // Trade-off summary
  tradeOffSummary: string;

  // Target entity for "View on Map" button
  mapTarget: {
    type: 'incident' | 'resource' | 'hospital' | 'zone';
    id: string;
  };
}

// In-memory simulation execution history
const simulationHistory: SimulationResult[] = [];

export const simulationEngine = {
  /** Run a deterministic simulation scenario */
  runSimulation: (scenarioId: ScenarioType, entityId?: string): SimulationResult => {
    const incidents = mockService.getIncidents();
    const resources = mockService.getResources();
    const hospitals = mockService.getHospitals();
    const routes = mockService.getRoutes();

    const timestamp = new Date().toISOString();

    let result: SimulationResult;

    switch (scenarioId) {
      case 'RESOURCE_FAILURE': {
        const targetRes = resources.find((r) => r.id === entityId) || resources[0]; // AMB-014
        const targetInc = incidents.find((i) => i.id === targetRes.assignmentIncidentId) || incidents[0];
        const targetHosp = hospitals.find((h) => h.id === targetInc.recommendedHospitalId) || hospitals[0];

        result = {
          scenarioId: 'RESOURCE_FAILURE',
          scenarioLabel: `Resource Breakdown (${targetRes.callSign})`,
          timestamp,
          targetEntityId: targetRes.id,
          planA: {
            label: 'Plan A: Baseline Primary Dispatch',
            description: `${targetRes.callSign} assigned directly to ${targetInc.title}`,
            etaMinutes: 3.2,
            availableSupply: resources.filter((r) => r.status === 'AVAILABLE').length,
            requiredDemand: 4,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 36.4,
          },
          planB: {
            label: 'Plan B: Simulated Unit Failure & Reroute',
            description: `${targetRes.callSign} marked UNAVAILABLE. Secondary unit AMB-022 dispatched`,
            etaMinutes: 5.5,
            availableSupply: Math.max(0, resources.filter((r) => r.status === 'AVAILABLE').length - 1),
            requiredDemand: 4,
            coverageStatus: 'COVERAGE_RISK',
            hospitalPressure: 'HIGH',
            costScore: 68.2,
          },
          whatChanged: [
            `Removed: ${targetRes.callSign} (${targetRes.type}) marked UNAVAILABLE due to mechanical failure`,
            `Affected: ${targetInc.title} (${targetInc.id}) primary life support unassigned`,
            `Dispatch Reroute: Reserve unit AMB-022 dispatched from Cantonment Central Station`,
            `ETA Impact: 3.2m → 5.5m (+2.3m delay)`,
            `Coverage: Cantonment Zone available ambulances dropped from 2 to 1 (Risk)`,
          ],
          operationalImpact: 'Primary life support transfer delayed by 2.3 minutes. Mutual aid coverage requested.',
          resourceImpact: `${targetRes.callSign} taken offline. Available fleet reduced from ${resources.filter((r) => r.status === 'AVAILABLE').length} to ${resources.filter((r) => r.status === 'AVAILABLE').length - 1}.`,
          coverageImpact: 'Cantonment Zone coverage drops to minimum threshold. Secondary call response time projected +4.0 min.',
          hospitalImpact: `${targetHosp.name} inbound arrival delayed by 2.3 minutes. Trauma team placed on standby.`,
          incidentImpact: `${targetInc.title} priority score elevated from ${targetInc.priority.score} to 92/100 due to dispatch delay.`,
          rippleChain: [
            { step: 1, title: 'Unit Failure Trigger', description: `${targetRes.callSign} engine warning sensor triggers emergency shutdown`, severity: 'WARNING' },
            { step: 2, title: 'Primary Dispatch Drop', description: `${targetInc.title} loses primary life support unit en route`, severity: 'CRITICAL' },
            { step: 3, title: 'Secondary Reroute', description: `Reserve unit AMB-022 dispatched from Central Station (+2.3 min ETA)`, severity: 'WARNING' },
            { step: 4, title: 'Zone Coverage Depletion', description: `Cantonment Zone falls below minimum reserve ambulance count`, severity: 'CRITICAL' },
          ],
          tradeOffSummary: `Dispatched AMB-022 preserves emergency coverage for ${targetInc.title}, but increases ETA by 2.3 min and depletes Cantonment reserve fleet.`,
          mapTarget: { type: 'resource', id: targetRes.id },
        };
        break;
      }

      case 'HOSPITAL_OVERLOAD': {
        const targetHosp = hospitals.find((h) => h.id === entityId) || hospitals[0]; // KMC Hospital
        const altHosp = hospitals.find((h) => h.id !== targetHosp.id) || hospitals[1];

        result = {
          scenarioId: 'HOSPITAL_OVERLOAD',
          scenarioLabel: `Hospital Surge (${targetHosp.name})`,
          timestamp,
          targetEntityId: targetHosp.id,
          planA: {
            label: 'Plan A: Baseline Admission Target',
            description: `All inbound Cantonment trauma patients routed to ${targetHosp.name}`,
            etaMinutes: 3.2,
            availableSupply: 42,
            requiredDemand: 4,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 32.0,
          },
          planB: {
            label: 'Plan B: Simulated Capacity Surge & Diversion',
            description: `${targetHosp.name} bed capacity exhausted (35 surge admissions). Inbound diverted to ${altHosp.name}`,
            etaMinutes: 6.2,
            availableSupply: 7,
            requiredDemand: 4,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'CRITICAL',
            costScore: 74.5,
          },
          whatChanged: [
            `Surge: ${targetHosp.name} available beds reduced from 42 to 7`,
            `Pressure Level: MODERATE → CRITICAL (97% load)`,
            `Diversion Protocol: Activated for non-critical trauma admissions`,
            `Diversion Target: Inbound ambulances re-routed to ${altHosp.name}`,
            `Transit Impact: Travel time increased by 3.0 min (+1.4 km distance)`,
          ],
          operationalImpact: 'Trauma Diversion protocol activated. Non-critical emergency arrivals diverted to secondary trauma center.',
          resourceImpact: 'Ambulances in transit require 3.0 additional minutes to reach alternate hospital destination.',
          coverageImpact: 'Ambulances remain occupied longer during transit, reducing city-wide availability turnover.',
          hospitalImpact: `${targetHosp.name} ICU saturation reached. Emergency diversion active for next 60 minutes.`,
          incidentImpact: `Multi-Vehicle Collision casualties split between ${targetHosp.name} and ${altHosp.name}.`,
          rippleChain: [
            { step: 1, title: 'Mass Admission Surge', description: `35 emergency admissions register within 15 minutes at ${targetHosp.name}`, severity: 'CRITICAL' },
            { step: 2, title: 'Capacity Saturation', description: `Available ICU beds drop from 42 to 7. Bed utilization reaches 97%`, severity: 'CRITICAL' },
            { step: 3, title: 'Diversion Protocol', description: `Automated feed triggers diversion warning to 112 Dispatch`, severity: 'WARNING' },
            { step: 4, title: 'Transit Reroute', description: `Inbound units redirected to ${altHosp.name} (+3.0 min transit)`, severity: 'INFO' },
          ],
          tradeOffSummary: `Diverting inbound ambulances to ${altHosp.name} prevents ICU saturation at ${targetHosp.name}, but increases ambulance transit time by 3.0 min.`,
          mapTarget: { type: 'hospital', id: targetHosp.id },
        };
        break;
      }

      case 'INCIDENT_ESCALATION': {
        const targetInc = incidents.find((i) => i.id === entityId) || incidents[0]; // inc-001

        result = {
          scenarioId: 'INCIDENT_ESCALATION',
          scenarioLabel: `Incident Escalation (${targetInc.id})`,
          timestamp,
          targetEntityId: targetInc.id,
          planA: {
            label: 'Plan A: Baseline Severity 4 Response',
            description: `2 units assigned (AMB-014 + POL-101) to ${targetInc.title}`,
            etaMinutes: 3.2,
            availableSupply: 8,
            requiredDemand: 2,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 38.0,
          },
          planB: {
            label: 'Plan B: Simulated Severity 5 Critical Escalation',
            description: `${targetInc.title} escalated to Severity 5 (Fuel leak & entrapment). 4 units required`,
            etaMinutes: 4.8,
            availableSupply: 4,
            requiredDemand: 4,
            coverageStatus: 'COVERAGE_RISK',
            hospitalPressure: 'HIGH',
            costScore: 82.0,
          },
          whatChanged: [
            `Severity: ${targetInc.severity}/5 → 5/5 (CRITICAL HAZARD ESCALATION)`,
            `Priority Score: ${targetInc.priority.score}/100 → 96/100 (+14 pts)`,
            `Resource Demand: 2 units → 4 units required (Hazmat + Heavy Extrication)`,
            `Additional Units: Dispatched FIRE-02 from Puthur + AMB-022 from Central`,
            `Mutual Aid: Woraiyur Zone requested for backfill patrol coverage`,
          ],
          operationalImpact: 'Critical hazard declaration. Dual-zone joint response taskforce deployed.',
          resourceImpact: '4 emergency fleet units committed simultaneously to single incident site.',
          coverageImpact: 'Cantonment & Woraiyur zones coverage status reduced to COVERAGE_RISK.',
          hospitalImpact: 'Kauvery KMC Trauma Bay notified to prepare dual critical surgical teams.',
          incidentImpact: `${targetInc.title} priority score maxed out at 96/100. Commercial road segment blocked.`,
          rippleChain: [
            { step: 1, title: 'Hazard Sensor Trigger', description: 'CCTV AI detects fuel spill + vehicle cabin collapse', severity: 'CRITICAL' },
            { step: 2, title: 'Severity Upgrade', description: 'Incident upgraded to Severity 5 Critical Emergency', severity: 'CRITICAL' },
            { step: 3, title: 'Taskforce Dispatch', description: 'Heavy extrication tender FIRE-02 and ALS unit AMB-022 dispatched', severity: 'WARNING' },
            { step: 4, title: 'Multi-Zone Fleet Depletion', description: 'Coverage risk triggered across Central and West Trichy zones', severity: 'WARNING' },
          ],
          tradeOffSummary: 'Committing 4 units guarantees rapid hazard containment, but leaves Central Trichy with 1 available ambulance for secondary calls.',
          mapTarget: { type: 'incident', id: targetInc.id },
        };
        break;
      }

      case 'ROAD_BLOCKAGE': {
        const targetRoute = routes.find((r) => r.id === entityId) || routes[0]; // route-001

        result = {
          scenarioId: 'ROAD_BLOCKAGE',
          scenarioLabel: 'NH 81 TVS Tollgate Flyover Blockage',
          timestamp,
          targetEntityId: targetRoute.id,
          planA: {
            label: 'Plan A: Direct Flyover Transit',
            description: 'Direct transit over TVS Tollgate flyover bridge',
            etaMinutes: 3.2,
            availableSupply: 8,
            requiredDemand: 2,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 35.0,
          },
          planB: {
            label: 'Plan B: Simulated Flyover Closure & Service Lane Bypass',
            description: 'Flyover approach blocked by overturned freight vehicle. Bypass via Collectorate Ring Rd',
            etaMinutes: 7.0,
            availableSupply: 8,
            requiredDemand: 2,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 64.0,
          },
          whatChanged: [
            `Corridor Status: NH 81 TVS Tollgate Flyover approach BLOCKED`,
            `Reroute Path: Collectorate Ring Road Service Lane`,
            `Transit Distance: 3.8 km → 5.2 km (+1.4 km reroute)`,
            `ETA Impact: 3.2m → 7.0m (+3.8m delay)`,
            `Traffic Ripple: Central Bus Stand feeder road congestion index 0.4 → 0.85`,
          ],
          operationalImpact: 'Primary northbound arterial blocked. Traffic Police POL-101 deployed for manual diversion.',
          resourceImpact: 'AMB-014 transit time increased by 3.8 minutes due to service lane congestion.',
          coverageImpact: 'No direct unit availability change, but response times along NH 81 corridor increase by +4 min.',
          hospitalImpact: 'KMC Hospital notified of delayed ambulance arrival window (7.0 min ETA).',
          incidentImpact: `Multi-vehicle collision victims waiting time increased by 3.8 minutes.`,
          rippleChain: [
            { step: 1, title: 'Corridor Obstruction', description: 'Overturned lorry blocks both northbound lanes on TVS Tollgate flyover', severity: 'CRITICAL' },
            { step: 2, title: 'GPS Reroute Engine', description: 'SafeCity OSRM router recalculates bypass via Collectorate Ring Rd', severity: 'WARNING' },
            { step: 3, title: 'Transit Delay Accumulation', description: 'Ambulance AMB-014 ETA increases from 3.2 to 7.0 min', severity: 'WARNING' },
            { step: 4, title: 'Secondary Congestion Spill', description: 'Traffic backlog spills onto Central Bus Stand approach road', severity: 'INFO' },
          ],
          tradeOffSummary: 'Rerouting via Collectorate Ring Road keeps ambulances moving, but adds 3.8 minutes to trauma delivery.',
          mapTarget: { type: 'incident', id: 'inc-001' },
        };
        break;
      }

      case 'RESOURCE_SHORTAGE': {
        result = {
          scenarioId: 'RESOURCE_SHORTAGE',
          scenarioLabel: 'City-Wide Emergency Fleet Shortage',
          timestamp,
          targetEntityId: 'city-wide',
          planA: {
            label: 'Plan A: Baseline Fleet Supply',
            description: '8 active fleet units available for 4 open emergency calls',
            etaMinutes: 3.5,
            availableSupply: 8,
            requiredDemand: 4,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'LOW',
            costScore: 30.0,
          },
          planB: {
            label: 'Plan B: Simulated Severe Fleet Shortage',
            description: '8 city-wide emergency calls vs 3 available fleet units (5 units missing)',
            etaMinutes: 12.4,
            availableSupply: 3,
            requiredDemand: 8,
            coverageStatus: 'BELOW_MINIMUM',
            hospitalPressure: 'HIGH',
            costScore: 110.0,
          },
          whatChanged: [
            `City-Wide Calls: 4 → 8 simultaneous emergency requests`,
            `Available Units: 8 → 3 available units (5 unit shortage)`,
            `Uncovered Incidents: inc-005 (Golden Rock leak) & inc-006 (Airport perimeter) unserved`,
            `Average Response ETA: 3.5m → 12.4m (+8.9m delay)`,
            `Response Debt: 142.5 → 285.0 (+100% accumulation rate)`,
          ],
          operationalImpact: 'State of Emergency Shortage declared. Off-duty reserve paramedics recalled.',
          resourceImpact: '100% ambulance fleet utilization. Zero reserve units available across all 5 Trichy zones.',
          coverageImpact: 'ALL 5 Trichy operational zones drop to BELOW_MINIMUM coverage status.',
          hospitalImpact: 'All 4 Trichy hospitals receive simultaneous inbound notifications.',
          incidentImpact: 'Low-observability and non-trauma calls placed in hold queue with 12+ min waiting times.',
          rippleChain: [
            { step: 1, title: 'Simultaneous Call Spike', description: 'Monsoon storm causes 4 new emergency calls in 10 minutes', severity: 'CRITICAL' },
            { step: 2, title: 'Fleet Exhaustion', description: 'All available ambulances committed to active response calls', severity: 'CRITICAL' },
            { step: 3, title: 'Coverage Deficit', description: 'All 5 Trichy operational zones drop below minimum coverage thresholds', severity: 'CRITICAL' },
            { step: 4, title: 'Queue Delay Accumulation', description: 'Secondary incidents wait in dispatch queue with 12+ min ETAs', severity: 'WARNING' },
          ],
          tradeOffSummary: 'Prioritizing life-threatening road crash and structural fire leaves chemical leak and airport perimeter alerts waiting in queue.',
          mapTarget: { type: 'incident', id: 'inc-005' },
        };
        break;
      }

      case 'MULTIPLE_INCIDENTS': {
        result = {
          scenarioId: 'MULTIPLE_INCIDENTS',
          scenarioLabel: 'Concurrent Emergency Surge (4 Calls)',
          timestamp,
          targetEntityId: 'multi-surge',
          planA: {
            label: 'Plan A: Sequential Dispatch',
            description: 'Independent single-incident dispatches',
            etaMinutes: 4.0,
            availableSupply: 8,
            requiredDemand: 4,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 35.0,
          },
          planB: {
            label: 'Plan B: Multi-Incident Joint Optimization',
            description: 'Concurrent optimization across Collision + Fire + Flood + Hazmat',
            etaMinutes: 4.8,
            availableSupply: 3,
            requiredDemand: 6,
            coverageStatus: 'MARGINAL',
            hospitalPressure: 'HIGH',
            costScore: 58.0,
          },
          whatChanged: [
            `Concurrent Emergencies: 4 active incidents across 4 distinct zones`,
            `Contested Unit: FIRE-02 requested by both TVS Tollgate crash and Woraiyur Fire`,
            `Trade-Off Resolution: FIRE-02 allocated to Woraiyur Textile Fire (Structural risk)`,
            `Secondary Unit: Extrication team RES-01 sent to TVS Tollgate collision instead`,
            `Fleet Utilization: 87.5% across city fleet`,
          ],
          operationalImpact: 'Multi-incident joint triage active. Heavy extrication units prioritized by structural hazard score.',
          resourceImpact: 'FIRE-02 allocated to high-hazard fire; RES-01 flexed to road collision extrication.',
          coverageImpact: 'Golden Rock & Woraiyur zones operating at MARGINAL coverage.',
          hospitalImpact: 'Kauvery KMC & Trichy GH receiving simultaneous patient transfers.',
          incidentImpact: 'TVS Tollgate collision extrication ETA increased by 1.3 min to allow FIRE-02 arrival at Woraiyur.',
          rippleChain: [
            { step: 1, title: 'Concurrent Call Register', description: '4 distinct high-severity incidents active simultaneously', severity: 'CRITICAL' },
            { step: 2, title: 'Unit Competition', description: 'FIRE-02 tender contested between Road Crash and Commercial Fire', severity: 'WARNING' },
            { step: 3, title: 'Joint Triage Allocation', description: 'FIRE-02 assigned to Fire; RES-01 assigned to Crash', severity: 'INFO' },
            { step: 4, title: 'Balanced Response', description: 'Both emergencies covered within 5 minutes', severity: 'INFO' },
          ],
          tradeOffSummary: 'Allocating FIRE-02 to Woraiyur Fire prevents structural collapse, while RES-01 provides extrication at TVS Tollgate.',
          mapTarget: { type: 'incident', id: 'inc-002' },
        };
        break;
      }

      case 'RESOURCE_REASSIGNMENT': {
        const resA = resources.find((r) => r.id === 'res-a07') || resources[0]; // AMB-014
        const incCrash = incidents.find((i) => i.id === 'inc-001') || incidents[0];
        const incCardiac = incidents.find((i) => i.id === 'inc-004') || incidents[3];

        result = {
          scenarioId: 'RESOURCE_REASSIGNMENT',
          scenarioLabel: 'Resource Reassignment Trade-Off',
          timestamp,
          targetEntityId: resA.id,
          planA: {
            label: 'Plan A: Keep AMB-014 on Collision',
            description: `AMB-014 stays assigned to ${incCrash.title} (3.2m ETA)`,
            etaMinutes: 3.2,
            availableSupply: 8,
            requiredDemand: 3,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 34.0,
          },
          planB: {
            label: 'Plan B: Reassign AMB-014 to Cardiac Distress',
            description: `Reassign AMB-014 to ${incCardiac.title} (Trichy Junction). AMB-022 takes crash`,
            etaMinutes: 1.8,
            availableSupply: 8,
            requiredDemand: 3,
            coverageStatus: 'ADEQUATE',
            hospitalPressure: 'MODERATE',
            costScore: 42.0,
          },
          whatChanged: [
            `Reassigned Unit: ${resA.callSign} diverted from ${incCrash.id} to ${incCardiac.id}`,
            `Cardiac Emergency ETA: 5.1m → 1.8m (-3.3m FASTER ARRIVAL)`,
            `Collision Response ETA: 3.2m → 5.5m (+2.3m DELAY for collision)`,
            `Replacement Unit: Reserve AMB-022 dispatched to ${incCrash.title}`,
            `Target Hospital: Kauvery Heart City notified for immediate cardiac cath lab setup`,
          ],
          operationalImpact: 'Time-sensitive cardiac emergency prioritized. Survival probability increased by 35%.',
          resourceImpact: `${resA.callSign} rerouted in transit to Trichy Junction Railway Station.`,
          coverageImpact: 'Cantonment zone coverage balance maintained by reserve unit AMB-022.',
          hospitalImpact: 'Kauvery Heart City Hospital receives acute cardiac patient within 1.8 minutes.',
          incidentImpact: `Collision victims ETA delayed by 2.3 min, but within safe survival window.`,
          rippleChain: [
            { step: 1, title: 'Cardiac Distress Alert', description: 'Trichy Junction paramedic reports passenger collapse with zero pulse', severity: 'CRITICAL' },
            { step: 2, title: 'Proximity Reroute Evaluation', description: 'AMB-014 identified 1.8 min from station; AMB-022 5.5 min from crash', severity: 'INFO' },
            { step: 3, title: 'Reassignment Execution', description: 'AMB-014 diverted to station; AMB-022 dispatched to TVS Tollgate', severity: 'WARNING' },
            { step: 4, title: 'Trade-Off Outcome', description: 'Cardiac survival optimized; collision arrival delayed by 2.3 min', severity: 'INFO' },
          ],
          tradeOffSummary: `Reassigning ${resA.callSign} saves 3.3 minutes for acute cardiac distress at Trichy Junction, at the cost of 2.3 minutes delay for road collision.`,
          mapTarget: { type: 'incident', id: incCardiac.id },
        };
        break;
      }

      default:
        return simulationEngine.runSimulation('RESOURCE_FAILURE', 'res-a07');
    }

    // Push to simulation history (keep max 10)
    simulationHistory.unshift(result);
    if (simulationHistory.length > 10) simulationHistory.pop();

    return result;
  },

  /** Get recent simulation history */
  getHistory: (): SimulationResult[] => simulationHistory,

  /** Clear simulation history */
  clearHistory: () => {
    simulationHistory.length = 0;
  },
};
