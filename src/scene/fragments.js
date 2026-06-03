/**
 * Author: Ricard Santiago Raigada García
 */

import { sp, cam } from './isometric.js'
import { orchCableAnchor } from './orchestrator.js'
import { qpuCableAnchor } from './qpu.js'

const easeOut = t => { t=clamp01(t); return 1-(1-t)**2 }
const easeInOut = t => { t=clamp01(t); return t<0.5?2*t*t:1-(-2*t+2)**2/2 }
const clamp01 = t => Math.min(1,Math.max(0,t))

const COLS = {
  in_queue_hpc: 'rgba(15,98,254,0.55)',
  exec_hpc: '#0f62fe',
  in_queue_qc: 'rgba(0,157,154,0.55)',
  exec_qc: '#009d9a',
  done: '#198038',
  tfail_wait: '#d97706',
  exec_retry: '#d97706',
  pfail: '#da1e28',
}

export function fragState(frag, T) {
  if (T < frag.dispatch_t) return null
  if (frag.fail_type==='permanent' && frag.fail_t && T>=frag.fail_t) return 'pfail'
  if (frag.fail_type==='transient' && frag.fail_t && T>=frag.fail_t) {
    if (frag.retry_start_t && T>=frag.retry_start_t)
      return T>=(frag.retry_done_t||Infinity) ? 'done' : 'exec_retry'
    return 'tfail_wait'
  }

  if (frag.done_t && T>=frag.done_t) return 'done'
  if (frag.start_t && T>=frag.start_t)
    return frag.backend==='hpc' ? 'exec_hpc' : 'exec_qc'

  return frag.backend==='hpc' ? 'in_queue_hpc' : 'in_queue_qc'
}

export function fragScreenPos(frag, T, rackMap) {
  const st = fragState(frag, T)
  if (!st) return null

  const orchA = orchCableAnchor()
  const os    = sp(orchA.wx, orchA.wy, orchA.wz)
  const qpuA  = qpuCableAnchor()
  const qs    = sp(qpuA.wx, qpuA.wy, qpuA.wz)
  const rk    = frag.rank!=null ? rackMap.get(frag.rank) : null

  switch (st) {
    case 'in_queue_hpc': {
      const dest  = rk || os
      const total = Math.max(0.001, (frag.start_t||frag.dispatch_t+1) - frag.dispatch_t)
      const p = Math.min(0.82, easeOut((T-frag.dispatch_t)/total) * 0.7 + 0.15)
      return { x: os.x+(dest.x-os.x)*p, y: os.y+(dest.y-os.y)*p,
               col: COLS.in_queue_hpc, r: 3 }
    }
    case 'exec_hpc': {
      if (!rk) return null
      const vx = Math.sin(T*9+frag._phase)*2.5*cam.z
      const vy = Math.cos(T*7+frag._phase)*1.2*cam.z
      return { x: rk.x+vx, y: rk.y+vy, col: COLS.exec_hpc, r: 4*cam.z }
    }
    case 'in_queue_qc': {
      const total = Math.max(0.001, (frag.start_t||frag.dispatch_t+0.05) - frag.dispatch_t)
      const p = easeOut(Math.min(1,(T-frag.dispatch_t)/total))
      return { x: os.x+(qs.x-os.x)*p, y: os.y+(qs.y-os.y)*p,
               col: COLS.in_queue_qc, r: 2.5 }
    }
    case 'exec_qc': {
      const a = frag._phase + T*0.45
      return { x: qs.x+Math.cos(a)*18*cam.z, y: qs.y+Math.sin(a)*8*cam.z,
               col: COLS.exec_qc, r: 3*cam.z }
    }
    case 'exec_retry': {
      return rk ? { x: rk.x, y: rk.y, col: COLS.exec_retry, r: 4*cam.z } : null
    }
    case 'done': {
      const src = frag.backend==='qc' ? qs : (rk||os)
      const doneAt = frag.retry_done_t || frag.done_t
      const p = easeInOut(Math.min(1,(T-doneAt)/0.9))
      return { x: src.x+(os.x-src.x)*p, y: src.y+(os.y-src.y)*p, col: COLS.done, r: 3 }
    }
    case 'tfail_wait': {
      const base = rk||os
      const shake = Math.sin(T*20)*4*cam.z
      return { x: base.x+shake, y: base.y+shake*0.4, col: COLS.tfail_wait, r: 4*cam.z }
    }
    case 'pfail': {
      const base = rk||os
      const p = clamp01((T-frag.fail_t)/0.5)
      return { x: base.x+(Math.random()-0.5)*p*20*cam.z,
               y: base.y-p*18*cam.z, col: COLS.pfail, r:(3+p*6)*cam.z, alpha:1-p }
    }
  }
  return null
}

export function drawFragments(ctx, fragments, T, rackMap) {
  fragments.forEach(frag => {
    const pos = fragScreenPos(frag, T, rackMap)
    if (!pos) return
    const st = fragState(frag, T)
    ctx.globalAlpha = pos.alpha ?? 1
    ctx.beginPath(); ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI*2)
    ctx.fillStyle = pos.col; ctx.fill()
    if (st==='exec_hpc'||st==='exec_qc'||st==='exec_retry') {
      ctx.globalAlpha=0.28; ctx.strokeStyle=pos.col; ctx.lineWidth=1
      ctx.beginPath(); ctx.arc(pos.x, pos.y, pos.r+3.5*cam.z, 0, Math.PI*2); ctx.stroke()
    }
    if (st==='tfail_wait') {
      ctx.globalAlpha=0.5+0.4*Math.sin(Date.now()/60)
      ctx.strokeStyle='#d97706'; ctx.lineWidth=1.2
      ctx.beginPath(); ctx.arc(pos.x, pos.y, pos.r+5*cam.z, 0, Math.PI*2); ctx.stroke()
    }
    ctx.globalAlpha=1
  })
}

export function seedFragmentPhases(fragments) {
  let s=271828
  const rand=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967295 }
  fragments.forEach(f=>{ f._phase=rand()*Math.PI*2 })
}

export function buildEventList(fragments) {
  const evts=[]
  fragments.forEach(f=>{
    evts.push({t:f.dispatch_t, type:'DISPATCH', f})
    if (f.start_t) evts.push({t:f.start_t, type:'START', f})
    if (f.fail_t) evts.push({t:f.fail_t, type:f.fail_type==='permanent'?'PFAIL':'TFAIL', f})
    if (f.retry_start_t) evts.push({t:f.retry_start_t, type:'REQUEUE', f})
    if (f.done_t) evts.push({t:f.done_t, type:'DONE', f})
  })
  return evts.sort((a,b)=>a.t-b.t)
}
