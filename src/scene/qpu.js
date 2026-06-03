/**
 * Author: Ricard Santiago Raigada García
 */

import { drawBox, isoLabel, sp, cam } from './isometric.js'
const ORIGIN = { wx: 6, wy: -11 }
export function drawQPU(ctx, job, fragments, T, getFragState) {
  const { wx: qx, wy: qy } = ORIGIN
  drawBox(ctx, qx - 1, qy - 1, 0, 7, 7, 0.3,
    '#c6c6c6', '#e0e0e0', 'rgba(22,22,22,0.55)')
  drawBox(ctx, qx, qy, 0.3, 4, 4, 4.2,
    '#009d9a', '#3ddbd9', '#005d5d')
  const cryoTop = sp(qx + 2.0, qy + 2.0, 4.5)

  const rings = [
    { r: 26, alpha: 0.10 },
    { r: 17, alpha: 0.20 },
    { r: 10, alpha: 0.32 },
  ]
  rings.forEach(({ r, alpha }) => {
    ctx.beginPath()
    ctx.arc(cryoTop.x, cryoTop.y, r * cam.z, 0, Math.PI * 2)
    ctx.fillStyle   = `rgba(0,93,93,${alpha})`
    ctx.fill()
    ctx.strokeStyle = `rgba(0,93,93,${Math.min(1, alpha * 2.2)})`
    ctx.lineWidth = Math.max(0.4, 1 * cam.z)
    ctx.stroke()
  })

  const activeQC = fragments.filter(f => getFragState(f, T) === 'exec_qc').length
  const N_QUBITS = 8
  for (let i = 0; i < N_QUBITS; i++) {
    const a = (i / N_QUBITS) * Math.PI * 2
    const qbx = cryoTop.x + Math.cos(a) * 18 * cam.z
    const qby = cryoTop.y + Math.sin(a) * 8  * cam.z
    const lit = i < activeQC

    ctx.beginPath()
    ctx.arc(qbx, qby, Math.max(1.5, 3.2 * cam.z), 0, Math.PI * 2)
    ctx.fillStyle = lit ? '#005d5d' : 'rgba(0,93,93,0.18)'
    ctx.fill()
    ctx.strokeStyle = lit ? '#003c3c' : 'rgba(0,60,60,0.4)'
    ctx.lineWidth = Math.max(0.3, 0.8 * cam.z)
    ctx.stroke()
  }

  isoLabel(ctx, qx + 2.0, qy - 0.2, 5.0,
    `${job.qpu.name} QPU`, '#005d5d', 9.5)
  isoLabel(ctx, qx + 2.0, qy + 0.6, 4.65,
    `${job.qpu.qubits} qubits - ${job.qpu.backend}`, '#393939', 8.5)

  const queued = fragments.filter(f => {
    const st = getFragState(f, T)
    return st === 'in_queue_qc'
  }).length
  if (queued > 0) {
    isoLabel(ctx, qx + 2.0, qy + 1.2, 4.3,
      `${queued} queued`, '#b45309', 8)
  }

  const gwPos = sp(qx + 2.0, qy + 2.0, 6.2)
  ctx.beginPath()
  ctx.arc(gwPos.x, gwPos.y, Math.max(3, 8 * cam.z), 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,93,93,0.55)'
  ctx.lineWidth   = Math.max(0.5, 1 * cam.z)
  ctx.setLineDash([3 * cam.z, 4 * cam.z])
  ctx.stroke()
  ctx.setLineDash([])
  isoLabel(ctx, qx + 2.0, qy + 2.0, 6.7, 'cloud gateway', '#525252', 7.5)

  return { cryoTop }
}

export function qpuCableAnchor() {
  const { wx: qx, wy: qy } = ORIGIN
  return { wx: qx + 2.0, wy: qy + 2.0, wz: 4.5 }
}
