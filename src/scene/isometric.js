/**
 * Author: Ricard Santiago Raigada García
 */

const ISO_ANGLE = Math.PI / 6 // 30°
export const SCALE = 55
export const cam = { x: 0, y: 0, z: 0.6 }
let _W = 0, _H = 0
export function setViewport(w, h) { _W = w; _H = h }
export function sp(wx, wy, wz) {
  const sx = (wx - wy) * Math.cos(ISO_ANGLE) * SCALE
  const sy = (wx + wy) * Math.sin(ISO_ANGLE) * SCALE - wz * SCALE
  return {
    x: _W / 2 + cam.x + sx * cam.z,
    y: _H / 2 + cam.y + sy * cam.z,
  }
}
export function hexShade(hex, f) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
}

export function drawBox(ctx, wx, wy, wz, bw, bd, bh, faceCol, topCol, edgeCol, alpha = 1) {
  ctx.globalAlpha = alpha
  const lw = Math.max(0.3, 0.5 * cam.z)

  const pts = {
    bl:  sp(wx, wy, wz),
    br:  sp(wx + bw, wy, wz),
    bfr: sp(wx + bw, wy + bd, wz),
    bfl: sp(wx, wy + bd, wz),
    tl:  sp(wx, wy, wz + bh),
    tr:  sp(wx + bw, wy, wz + bh),
    tfr: sp(wx + bw, wy + bd, wz + bh),
    tfl: sp(wx, wy + bd, wz + bh),
  }

  ctx.beginPath()
  ctx.moveTo(pts.bl.x,  pts.bl.y)
  ctx.lineTo(pts.bfl.x, pts.bfl.y)
  ctx.lineTo(pts.tfl.x, pts.tfl.y)
  ctx.lineTo(pts.tl.x,  pts.tl.y)
  ctx.closePath()
  ctx.fillStyle = hexShade(faceCol, 0.68)
  ctx.fill()
  ctx.strokeStyle = edgeCol; ctx.lineWidth = lw; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pts.br.x,  pts.br.y)
  ctx.lineTo(pts.bfr.x, pts.bfr.y)
  ctx.lineTo(pts.tfr.x, pts.tfr.y)
  ctx.lineTo(pts.tr.x,  pts.tr.y)
  ctx.closePath()
  ctx.fillStyle = hexShade(faceCol, 0.52)
  ctx.fill()
  ctx.strokeStyle = edgeCol; ctx.lineWidth = lw; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pts.tl.x,  pts.tl.y)
  ctx.lineTo(pts.tr.x,  pts.tr.y)
  ctx.lineTo(pts.tfr.x, pts.tfr.y)
  ctx.lineTo(pts.tfl.x, pts.tfl.y)
  ctx.closePath()
  ctx.fillStyle = topCol
  ctx.fill()
  ctx.strokeStyle = edgeCol; ctx.lineWidth = lw; ctx.stroke()

  ctx.globalAlpha = 1
  return pts
}

export function isoLabel(ctx, wx, wy, wz, text, col, size = 8) {
  const p = sp(wx, wy, wz)
  ctx.fillStyle = col
  ctx.font = `${Math.max(7, size * cam.z)}px 'IBM Plex Mono', 'Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.fillText(text, p.x, p.y)
  ctx.textAlign = 'left'
}

export function drawGround(ctx) {
  const step = 5, ext = 18
  ctx.strokeStyle = 'rgba(22,22,22,0.10)'
  ctx.lineWidth = 0.5
  for (let x = -ext; x <= ext; x += step) {
    const a = sp(x, -ext, 0), b = sp(x, ext, 0)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  for (let y = -ext; y <= ext; y += step) {
    const a = sp(-ext, y, 0), b = sp(ext, y, 0)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
}
