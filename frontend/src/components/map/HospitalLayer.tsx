import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Hospital } from '@shared/types';
import { createHospitalIcon } from './mapIcons';

interface HospitalLayerProps {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: Hospital) => void;
}

export const HospitalLayer: React.FC<HospitalLayerProps> = ({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
}) => {
  return (
    <>
      {hospitals.map((hospital) => {
        const isSelected = hospital.id === selectedHospitalId;
        const icon = createHospitalIcon(hospital, isSelected);

        return (
          <Marker
            key={hospital.id}
            position={[hospital.location.lat, hospital.location.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectHospital(hospital),
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="font-mono text-xs text-slate-100 p-1 min-w-[200px]">
                <div className="font-bold text-emerald-400 border-b border-slate-700 pb-1 mb-1">
                  {hospital.name}
                </div>
                <div className="text-[11px] text-slate-300 mb-1">
                  BEDS AVAILABLE: <span className="font-bold text-emerald-300">{hospital.bedsAvailable}</span> / {hospital.bedsTotal}
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  INCOMING LOAD: <span className="text-amber-400">{hospital.incomingLoad} patients</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  PREDICTED PRESSURE: <span className="font-bold text-rose-400">{hospital.predictedPressure.level}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  CAPABILITIES: {hospital.capabilities.join(', ')}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
