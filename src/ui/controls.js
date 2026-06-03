/**
 * Author: Ricard Santiago Raigada García
 */

import { cam } from '../scene/isometric.js'

const pbtn  = document.getElementById('pbtn')
const scrub = document.getElementById('scrub')
const spdSel = document.getElementById('spd')
export const playback = {
  playing:  false,
  speed:    1.0,
  currentT: 0,
  totalT:   49.2,
  prevTS:   null,
  rafId:    null,
}

export function initControls(canvas, onTick, onScrub) {
  pbtn.addEventListener('click', () => {
    playback.playing = !playback.playing
    pbtn.innerHTML   = playback.playing ? '&#9646;&#9646;' : '&#9654;'
    if (playback.playing) {
      if (playback.currentT >= playback.totalT) {
        playback.currentT = 0
        onScrub(0, true)
      }
      playback.prevTS = null
      playback.rafId  = requestAnimationFrame(tick)
    } else {
      if (playback.rafId) cancelAnimationFrame(playback.rafId)
    }
  })

  scrub.addEventListener('input', () => {
    playback.playing = false
    pbtn.innerHTML   = '&#9654;'
    if (playback.rafId) cancelAnimationFrame(playback.rafId)
    playback.currentT = (scrub.value / 1000) * playback.totalT
    onScrub(playback.currentT, false)
  })

  spdSel.addEventListener('change', () => {
    playback.speed = parseFloat(spdSel.value)
  })

  /* zoom */
  canvas.addEventListener('wheel', e => {
    e.preventDefault()
    cam.z = Math.min(3.0, Math.max(0.25, cam.z * (e.deltaY < 0 ? 1.1 : 0.91)))
    onScrub(playback.currentT, false)
  }, { passive: false })

  /* pan */
  let dragStart = null, camSnap = null
  canvas.addEventListener('mousedown', e => {
    dragStart = { x: e.clientX, y: e.clientY }
    camSnap   = { x: cam.x,    y: cam.y    }
  })
  canvas.addEventListener('mousemove', e => {
    if (!dragStart) return
    cam.x = camSnap.x + (e.clientX - dragStart.x)
    cam.y = camSnap.y + (e.clientY - dragStart.y)
    onScrub(playback.currentT, false)
  })
  canvas.addEventListener('mouseup',    () => { dragStart = null })
  canvas.addEventListener('mouseleave', () => { dragStart = null })
  let touchSnap = null
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return
    touchSnap = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, cx: cam.x, cy: cam.y }
  })
  canvas.addEventListener('touchmove', e => {
    e.preventDefault()
    if (!touchSnap || e.touches.length !== 1) return
    cam.x = touchSnap.cx + (e.touches[0].clientX - touchSnap.tx)
    cam.y = touchSnap.cy + (e.touches[0].clientY - touchSnap.ty)
    onScrub(playback.currentT, false)
  }, { passive: false })

  /* inner tick */
  function tick(ts) {
    if (!playback.playing) return
    if (playback.prevTS !== null) {
      playback.currentT = Math.min(
        playback.totalT,
        playback.currentT + (ts - playback.prevTS) / 1000 * playback.speed
      )
    }
    playback.prevTS = ts
    scrub.value     = Math.round((playback.currentT / playback.totalT) * 1000)
    onTick(playback.currentT)
    if (playback.currentT < playback.totalT) {
      playback.rafId = requestAnimationFrame(tick)
    } else {
      playback.playing = false
      pbtn.innerHTML   = '&#9654;'
    }
  }
}
