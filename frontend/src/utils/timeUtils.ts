/**
 * Time utility helper for SafeCity AI emergency operations UI.
 * Provides clear, natural English wording for incident report times.
 */

export function formatReportedTime(firstReportedAt: string | Date, waitingSeconds?: number): string {
  let diffSec = 0;

  if (typeof waitingSeconds === 'number' && waitingSeconds > 0) {
    diffSec = waitingSeconds;
  } else {
    const reportedTime = new Date(firstReportedAt).getTime();
    const now = Date.now();
    diffSec = Math.max(0, Math.floor((now - reportedTime) / 1000));
  }

  const mins = Math.floor(diffSec / 60);

  if (mins < 1) {
    return 'Reported just now';
  } else if (mins < 60) {
    return `Reported ${mins} min ago`;
  } else {
    const hours = Math.floor(mins / 60);
    return `Reported ${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  }
}
