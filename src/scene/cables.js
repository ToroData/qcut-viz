/**
 *
 * Draws infrastructure "lanes" between DQR → HPC nodes and DQR → QPU.
 * - HPC: solid double-rail lane (infiniband), with travelling pulse dot + arrow
 * - QC:  dashed single lane (cloud gRPC), with travelling pulse dot + arrow
 * 
 * Author: Ricard Santiago Raigada García
 */
import { sp, cam } from './isometric.js'
import { hpcCableAnchors } from './hpc.js'
import { qpuCableAnchor }  from './qpu.js'
import { orchCableAnchor } from './orchestrator.js'
import { fragState }       from './fragments.js'

const pulses = { hpc0: 0.0, hpc1: 0.4, qc: 0.0 }
let _lastTS  = 0

export function drawCables(ctx, fragments, T) {
  const now   = Date.now()
  const dtSec = Math.min(0.05, (now - _lastTS) / 1000)
  _lastTS     = now

  const hpcActive = fragments.filter(f => {
    const s = fragState(f, T); return s === 'disp_hpc' || s === 'exec_hpc' || s === 'exec_retry'
  }).length
  const qcActive = fragments.filter(f => {
    const s = fragState(f, T); return s === 'disp_qc' || s === 'exec_qc'
  }).length

  pulses.hpc0 = (pulses.hpc0 + dtSec * (hpcActive > 0 ? 0.45 : 0.12)) % 1
  pulses.hpc1 = (pulses.hpc1 + dtSec * (hpcActive > 0 ? 0.45 : 0.12)) % 1
  pulses.qc   = (pulses.qc   + dtSec * (qcActive  > 0 ? 0.30 : 0.08)) % 1

  const os         = sp(...objVals(orchCableAnchor()))
  const hpcAnchors = hpcCableAnchors()
  hpcAnchors.forEach((anchor, i) => {
    const dest = sp(anchor.wx, anchor.wy, anchor.wz)
    drawLane(ctx, os, dest, {
      color:  '#0f62fe',
      width:  Math.max(1.4, 2.6 * cam.z),
      dashed: false,
      label:  i === 0 ? 'c7-3 - infiniband' : 'c7-4 - infiniband',
      pulse:  i === 0 ? pulses.hpc0 : pulses.hpc1,
      active: hpcActive > 0,
    })
  })

  const qa = qpuCableAnchor()
  const qs = sp(qa.wx, qa.wy, qa.wz)
  drawLane(ctx, os, qs, {
    color:  '#009d9a',
    width:  Math.max(0.8, 1.4 * cam.z),
    dashed: true,
    label:  'IBM cloud - gRPC',
    pulse:  pulses.qc,
    active: qcActive > 0,
  })
}

function drawLane(ctx, from, to, { color, width, dashed, label, pulse, active }) {
  const cpx = (from.x + to.x) / 2
  const cpy = (from.y + to.y) / 2 - 24 * cam.z

  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(cpx, cpy, to.x, to.y)
  ctx.strokeStyle = active ? hexA(color, 0.95) : hexA(color, 0.55)
  ctx.lineWidth   = width
  ctx.setLineDash(dashed ? [5 * cam.z, 5 * cam.z] : [])
  ctx.stroke()
  ctx.setLineDash([])

  if (!dashed) {
    const off = 3.5 * cam.z
    ctx.beginPath()
    ctx.moveTo(from.x + off, from.y + off * 0.45)
    ctx.quadraticCurveTo(cpx + off, cpy + off * 0.45, to.x + off, to.y + off * 0.45)
    ctx.strokeStyle = hexA(color, active ? 0.55 : 0.30)
    ctx.lineWidth   = width * 0.45
    ctx.stroke()
  }

  const lx = bezier(from.x, cpx, to.x, 0.46)
  const ly = bezier(from.y, cpy, to.y, 0.46) - 8 * cam.z
  ctx.fillStyle = active ? hexA(color, 1.0) : hexA(color, 0.55)
  ctx.font      = `600 ${Math.max(7, 8.5 * cam.z)}px 'IBM Plex Mono', 'Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.fillText(label, lx, ly)
  ctx.textAlign = 'left'

  const px = bezier(from.x, cpx, to.x, pulse)
  const py = bezier(from.y, cpy, to.y, pulse)
  const pr = Math.max(2, (active ? 4.5 : 2.5) * cam.z)
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fillStyle = active ? color : hexA(color, 0.28)
  ctx.fill()
  const t1 = 0.87, t2 = 0.92
  const ax  = bezier(from.x, cpx, to.x, t1)
  const ay  = bezier(from.y, cpy, to.y, t1)
  const ax2 = bezier(from.x, cpx, to.x, t2)
  const ay2 = bezier(from.y, cpy, to.y, t2)
  const angle = Math.atan2(ay2 - ay, ax2 - ax)
  const sz    = Math.max(4, 8 * cam.z)

  ctx.save()
  ctx.translate(ax2, ay2)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(sz * 0.5, 0)
  ctx.lineTo(-sz * 0.6, -sz * 0.5)
  ctx.lineTo(-sz * 0.6,  sz * 0.5)
  ctx.closePath()
  ctx.fillStyle = active ? hexA(color, 1.0) : hexA(color, 0.55)
  ctx.fill()
  ctx.restore()
}

const bezier = (p0, p1, p2, t) => (1-t)**2 * p0 + 2*(1-t)*t * p1 + t**2 * p2
const objVals = o => [o.wx, o.wy, o.wz]
function hexA(hex, a) {
  if (!hex.startsWith('#')) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}
