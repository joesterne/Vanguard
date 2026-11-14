export type MagazineSlotStatus = 'full' | 'partial' | 'depleted';

export interface MagazineSlotState {
  index: number;
  status: MagazineSlotStatus;
  rounds: number;
  capacity: number;
  fillRatio: number;
}

export interface MagazineTelemetryResult {
  /** Rounds currently in the active inserted magazine */
  currentMag: number;
  /** Maximum capacity of a single magazine */
  magazineSize: number;
  /** Fill ratio [0..1] of the active magazine */
  activeMagFillRatio: number;
  /** Status tier of the active magazine */
  activeMagStatus: 'full' | 'nominal' | 'low' | 'critical' | 'empty';
  /** Total reserve rounds carried outside the active magazine */
  reserveAmmo: number;
  /** Number of completely full reserve magazines */
  fullReserveMags: number;
  /** Rounds in the partially full reserve magazine (0 if none) */
  partialReserveRounds: number;
  /** Total usable reserve magazines (full + partial) */
  totalReserveMags: number;
  /** Total magazine slots in the operator's chest rig (default 6) */
  maxReserveSlots: number;
  /** Per-slot state for rendering visual magazine pouch icons */
  reserveMagSlots: MagazineSlotState[];
}

/**
 * Computes real-time visual telemetry for the active magazine and reserve magazine pouches
 * whenever the player fires, reloads, or switches weapons.
 */
export function computeMagazineTelemetry(
  currentMag: number,
  magazineSize: number,
  reserveAmmo: number,
  maxReserveAmmo: number = magazineSize * 6
): MagazineTelemetryResult {
  const safeMagSize = Math.max(1, magazineSize);
  const clampedCurrent = Math.max(0, Math.min(safeMagSize, currentMag));
  const clampedReserve = Math.max(0, reserveAmmo);

  const activeMagFillRatio = Number((clampedCurrent / safeMagSize).toFixed(4));

  let activeMagStatus: MagazineTelemetryResult['activeMagStatus'] = 'nominal';
  if (clampedCurrent === 0) {
    activeMagStatus = 'empty';
  } else if (clampedCurrent === safeMagSize) {
    activeMagStatus = 'full';
  } else if (activeMagFillRatio <= 0.2) {
    activeMagStatus = 'critical';
  } else if (activeMagFillRatio <= 0.35) {
    activeMagStatus = 'low';
  }

  const fullReserveMags = Math.floor(clampedReserve / safeMagSize);
  const partialReserveRounds = clampedReserve % safeMagSize;
  const totalReserveMags = fullReserveMags + (partialReserveRounds > 0 ? 1 : 0);

  const defaultSlots = Math.max(1, Math.ceil(maxReserveAmmo / safeMagSize));
  const maxReserveSlots = Math.max(defaultSlots, totalReserveMags);

  const reserveMagSlots: MagazineSlotState[] = [];
  let remainingToDistribute = clampedReserve;

  for (let i = 0; i < maxReserveSlots; i++) {
    const roundsInSlot = Math.max(0, Math.min(safeMagSize, remainingToDistribute));
    remainingToDistribute -= roundsInSlot;

    let status: MagazineSlotStatus = 'depleted';
    if (roundsInSlot === safeMagSize) {
      status = 'full';
    } else if (roundsInSlot > 0) {
      status = 'partial';
    }

    reserveMagSlots.push({
      index: i,
      status,
      rounds: roundsInSlot,
      capacity: safeMagSize,
      fillRatio: Number((roundsInSlot / safeMagSize).toFixed(4)),
    });
  }

  return {
    currentMag: clampedCurrent,
    magazineSize: safeMagSize,
    activeMagFillRatio,
    activeMagStatus,
    reserveAmmo: clampedReserve,
    fullReserveMags,
    partialReserveRounds,
    totalReserveMags,
    maxReserveSlots,
    reserveMagSlots,
  };
}
