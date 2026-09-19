import React from 'react';
import { IncidentStatus } from '@shared/types';
import { StatusBadge, StatusVariant } from '../common/StatusBadge';

interface IncidentStatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}

const statusVariantMap: Record<IncidentStatus, StatusVariant> = {
  NEW: 'info',
  SUSPECTED: 'warning',
  CORROBORATED: 'info',
  VERIFIED: 'success',
  ACTIVE_RESPONSE: 'danger',
  RESOLVED: 'neutral',
};

export const IncidentStatusBadge: React.FC<IncidentStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const variant = statusVariantMap[status] || 'neutral';
  const isPulsing = status === 'NEW' || status === 'ACTIVE_RESPONSE';

  return (
    <StatusBadge
      label={status.replace('_', ' ')}
      variant={variant}
      pulse={isPulsing}
      size={size}
    />
  );
};
