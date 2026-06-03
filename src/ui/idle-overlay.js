/**
 * idle-overlay.js
 *
 * Author: Ricard Santiago Raigada García
 */

import { sp }         from '../scene/isometric.js'
import { fragState }  from '../scene/fragments.js'

const HPC_LABEL_POS = { wx: -5.5, wy: -3, wz: 4.5 }

export function drawIdleOverlay(ctx, fragments, T, hpcCap) {
  const cap = hpcCap || 12
  let hpcExec = 0, hpcPending = 0, hpcInQueue = 0
  let qcExec  = 0, qcPending  = 0

  fragments.forEach(f => {
    const st = fragState(f, T)
    if (!st) { if (f.backend === 'hpc') hpcPending++; else qcPending++; return }
    if (st === 'exec_hpc' || st === 'exec_retry') hpcExec++
    if (st === 'in_queue_hpc') hpcInQueue++
    if (st === 'exec_qc') qcExec++
  })

  const hpcSaturated = hpcExec >= cap && hpcInQueue > 0
  if (!hpcSaturated) return
  const pos   = sp(HPC_LABEL_POS.wx, HPC_LABEL_POS.wy, HPC_LABEL_POS.wz)
  const pulse = 0.55 + 0.35 * Math.sin(Date.now() / 900)
  ctx.globalAlpha = pulse
  const line1 = `ALL ${cap} WORKERS BUSY`
  const line2 = `${hpcInQueue} frag${hpcInQueue !== 1 ? 's' : ''} waiting in g_hpc_q`
  const line3 = `QC running ${qcExec} frags independently`
  const fs1 = 10, fs2 = 8
  ctx.font = `${fs1}px 'Courier New', monospace`
  const tw1 = ctx.measureText(line1).width
  ctx.font = `${fs2}px 'Courier New', monospace`
  const tw2 = Math.max(ctx.measureText(line2).width, ctx.measureText(line3).width)
  const boxW = Math.max(tw1, tw2) + 24
  const boxH = fs1 + fs2 * 2 + 20
  const bx = pos.x - boxW / 2
  const by = pos.y - boxH / 2

  ctx.fillStyle  = '#ffffff'
  roundRect(ctx, bx, by, boxW, boxH, 3)
  ctx.fill()
  ctx.strokeStyle = '#0f62fe'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#0043ce'
  ctx.font = `700 ${fs1}px 'IBM Plex Mono','Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.fillText(line1, pos.x, by + fs1 + 4)

  ctx.fillStyle = '#161616'
  ctx.font = `${fs2}px 'IBM Plex Mono','Courier New', monospace`
  ctx.fillText(line2, pos.x, by + fs1 + fs2 + 10)

  ctx.fillStyle = '#007d79'
  ctx.fillText(line3, pos.x, by + fs1 + fs2 * 2 + 16)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath()
}
