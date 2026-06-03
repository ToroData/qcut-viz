/**
 * Author: Ricard Santiago Raigada García
 */

import { drawBox, isoLabel, sp } from './isometric.js'
const ORIGIN = { wx: -0.8, wy: 3.5 }
export function drawOrchestrator(ctx) {
  const { wx: ox, wy: oy } = ORIGIN
  drawBox(ctx, ox, oy, 0, 1.6, 1.6, 1.6,
    '#d97706', '#fbbf24', '#9a3412')

  isoLabel(ctx, ox + 0.8, oy + 0.8, 2.0, 'DQR',
    '#9a3412', 10)
  isoLabel(ctx, ox + 0.8, oy + 0.8, 2.45, 'RANK 0 - orchestrator',
    '#525252', 8)

  const top = sp(ox + 0.8, oy + 0.8, 1.6)
  return { top }
}

export function orchCableAnchor() {
  const { wx: ox, wy: oy } = ORIGIN
  return { wx: ox + 0.8, wy: oy + 0.8, wz: 1.6 }
}
