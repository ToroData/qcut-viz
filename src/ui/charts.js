/**
 * P1 / P2 / P3 panel visualizations
 *
 * Author: Ricard Santiago Raigada García
 */
import { fragState } from '../scene/fragments.js'

const COL = {
  hpc:      '#0f62fe',
  hpcLight: 'rgba(15,98,254,0.30)',
  qc:       '#009d9a',
  qcLight:  'rgba(0,157,154,0.30)',
  retry:    '#d97706',
  fail:     '#da1e28',
  done:     '#198038',
  ink:      '#161616',
  ink2:     '#525252',
  ink3:     '#8d8d8d',
  grid:     'rgba(22,22,22,0.08)',
  cursor:   '#da1e28',
}

const DPR = Math.min(window.devicePixelRatio || 1, 2)
const PANEL_FALLBACK_W = 380
function panelInnerWidth() {
  const panel = document.getElementById('label-panel')
  const w = panel ? panel.getBoundingClientRect().width : PANEL_FALLBACK_W
  return Math.max(180, Math.floor(w - 52))
}

function setupCanvas(cv, w, h) {
  cv.style.width  = w + 'px'
  cv.style.height = h + 'px'
  cv.width  = Math.max(50, Math.floor(w * DPR))
  cv.height = Math.max(50, Math.floor(h * DPR))
  const ctx = cv.getContext('2d')
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  return ctx
}

function timeToX(t, totalT, w, padL) {
  return padL + (t / totalT) * (w - padL - 8)
}

function clearCanvas(ctx, w, h) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
}

function nextFrame(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)) }
function drawCursor(ctx, T, totalT, w, h, padL) {
  const x = timeToX(T, totalT, w, padL)
  ctx.strokeStyle = COL.cursor
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x, 0); ctx.lineTo(x, h)
  ctx.stroke()
}

let p1Wrap = null, p1Gantt = null, p1Sat = null, p1Caption = null
let p1Job = null

export function initP1(host) {
  p1Wrap = document.createElement('div')
  p1Wrap.className = 'chart-wrap'
  p1Wrap.innerHTML = `
    <div class="chart-title">P1 · Gantt HPC + saturación de workers
      <span class="chart-sub">queue_wait_hpc por rank MPI</span></div>
    <canvas class="chart-cv" id="p1-gantt"></canvas>
    <div class="chart-title chart-title-sub">utilización de workers (inflight_hpc / hpc_cap)</div>
    <canvas class="chart-cv" id="p1-sat"></canvas>
    <div class="chart-caption" id="p1-caption"></div>
  `
  host.appendChild(p1Wrap)
  p1Gantt = p1Wrap.querySelector('#p1-gantt')
  p1Sat = p1Wrap.querySelector('#p1-sat')
  p1Caption = p1Wrap.querySelector('#p1-caption')
  new ResizeObserver(() => p1Job && drawP1(window.__lastT ?? 0))
    .observe(p1Wrap)
}

export function setP1Job(job) {
  p1Job = job
  drawP1(0)
}

function drawP1(T) {
  if (!p1Job || !p1Gantt) return
  const job = p1Job
  const cap = job.hpc_cap
  const totalT = job.total_duration_s
  const frags = [...job.fragments].sort((a, b) =>
      (a.dispatch_t ?? 0) - (b.dispatch_t ?? 0)
      || a.id.localeCompare(b.id))
  const N = frags.length
  const rowH = N <= 36 ? 8 : (N <= 60 ? 6 : 5)
  const padT = 40, padB = 6, padL = 56, padR = 8
  const legendY1 = 4
  const legendY2 = 16
  const timeLabelY = 30
  const ganttH = padT + N * rowH + padB
  const w = panelInnerWidth()
  const h = ganttH
  const ctx = setupCanvas(p1Gantt, w, h)
  clearCanvas(ctx, w, h)

  ctx.strokeStyle = COL.grid; ctx.lineWidth = 1
  const tickStep = totalT > 60 ? 20 : (totalT > 30 ? 10 : 5)
  ctx.fillStyle = COL.ink3
  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  for (let t = 0; t <= totalT; t += tickStep) {
    const x = timeToX(t, totalT, w, padL)
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke()
    ctx.fillText(`${t.toFixed(0)}s`, x, timeLabelY)
  }

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  const labelEvery = N <= 24 ? 1 : (N <= 60 ? 6 : 8)
  for (let i = 0; i < N; i++) {
    if (i % labelEvery !== 0 && i !== N - 1) continue
    const y = padT + i * rowH + rowH / 2
    ctx.fillText(frags[i].id, padL - 4, y)
  }

  for (let i = 0; i < N; i++) {
    const f = frags[i]
    const y = padT + i * rowH + 1
    const barH = Math.max(2, rowH - 2)
    const dur = f.done_t != null && f.dispatch_t != null
      ? Math.max(0.001, f.done_t - f.dispatch_t) : null

    if (f.start_t != null && f.dispatch_t != null && f.start_t > f.dispatch_t) {
      const x0 = timeToX(f.dispatch_t, totalT, w, padL)
      const x1 = timeToX(f.start_t, totalT, w, padL)
      ctx.fillStyle = f.backend === 'qc' ? COL.qcLight : COL.hpcLight
      ctx.fillRect(x0, y, Math.max(1, x1 - x0), barH)
    }

    const execEnd = f.fail_t != null ? f.fail_t : f.done_t
    if (f.start_t != null && execEnd != null && execEnd > f.start_t) {
      const x0 = timeToX(f.start_t, totalT, w, padL)
      const x1 = timeToX(execEnd, totalT, w, padL)
      ctx.fillStyle = f.backend === 'qc' || (f.fail_type && f.initial_label === 'QC')
        ? COL.qc : COL.hpc
      ctx.fillRect(x0, y, Math.max(1, x1 - x0), barH)
    }

    if (f.fail_t != null) {
      const fx = timeToX(f.fail_t, totalT, w, padL)
      ctx.fillStyle = f.fail_type === 'permanent' ? COL.fail : COL.retry
      ctx.beginPath()
      ctx.arc(fx, y + barH / 2, Math.max(1.5, barH * 0.55), 0, Math.PI * 2)
      ctx.fill()
    }

    if (f.retry_dispatch_t != null && f.retry_start_t != null
        && f.retry_start_t > f.retry_dispatch_t) {
      const x0 = timeToX(f.retry_dispatch_t, totalT, w, padL)
      const x1 = timeToX(f.retry_start_t, totalT, w, padL)
      ctx.fillStyle = 'rgba(217,119,6,0.30)'
      ctx.fillRect(x0, y, Math.max(1, x1 - x0), barH)
    }
    if (f.retry_start_t != null && f.retry_done_t != null) {
      const x0 = timeToX(f.retry_start_t, totalT, w, padL)
      const x1 = timeToX(f.retry_done_t, totalT, w, padL)
      ctx.fillStyle = COL.retry
      ctx.fillRect(x0, y, Math.max(1, x1 - x0), barH)
    }
  }

  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  const legendRows = [
    [
      [COL.hpcLight, 'queue HPC'],
      [COL.hpc,      'exec HPC'],
      [COL.qcLight,  'queue QC'],
    ],
    [
      [COL.qc,       'exec QC'],
      [COL.retry,    'requeue/retry'],
      [COL.fail,     'fail'],
    ],
  ]
  for (const [rowIndex, rowItems] of legendRows.entries()) {
    let lx = padL
    const legendY = rowIndex === 0 ? legendY1 + 4 : legendY2 + 4
    for (const [color, label] of rowItems) {
      ctx.fillStyle = color
      ctx.fillRect(lx, legendY - 3, 8, 6)
      ctx.fillStyle = COL.ink2
      ctx.fillText(label, lx + 11, legendY)
      lx += ctx.measureText(label).width + 22
    }
  }

  drawCursor(ctx, T, totalT, w, h, padL)
  const satH = 56
  const ctx2 = setupCanvas(p1Sat, w, satH)
  clearCanvas(ctx2, w, satH)

  ctx2.fillStyle = COL.ink3
  ctx2.font = '8px "IBM Plex Mono", monospace'
  ctx2.textAlign = 'right'; ctx2.textBaseline = 'middle'
  ctx2.fillText(`${cap}`, padL - 4, padT)
  ctx2.fillText('0',     padL - 4, satH - 6)

  const SN = Math.min(160, Math.max(40, Math.floor((w - padL - padR) / 3)))
  const samples = new Array(SN)
  for (let i = 0; i < SN; i++) {
    const t = (i / (SN - 1)) * totalT
    let inflight = 0
    for (const f of job.fragments) {
      const st = fragState(f, t)
      if (st === 'exec_hpc' || st === 'exec_retry') inflight++
    }
    samples[i] = inflight
  }
  ctx2.fillStyle = COL.hpcLight
  ctx2.beginPath()
  ctx2.moveTo(padL, satH - 4)
  for (let i = 0; i < SN; i++) {
    const x = padL + (i / (SN - 1)) * (w - padL - padR)
    const y = (satH - 4) - (samples[i] / cap) * (satH - padT - 4)
    ctx2.lineTo(x, y)
  }
  ctx2.lineTo(w - padR, satH - 4); ctx2.closePath(); ctx2.fill()
  ctx2.strokeStyle = COL.hpc; ctx2.lineWidth = 1
  ctx2.beginPath()
  for (let i = 0; i < SN; i++) {
    const x = padL + (i / (SN - 1)) * (w - padL - padR)
    const y = (satH - 4) - (samples[i] / cap) * (satH - padT - 4)
    if (i === 0) ctx2.moveTo(x, y); else ctx2.lineTo(x, y)
  }
  ctx2.stroke()
  ctx2.strokeStyle = 'rgba(22,22,22,0.25)'; ctx2.lineWidth = 0.5
  ctx2.setLineDash([2, 3])
  ctx2.beginPath(); ctx2.moveTo(padL, padT); ctx2.lineTo(w - padR, padT); ctx2.stroke()
  ctx2.setLineDash([])
  drawCursor(ctx2, T, totalT, w, satH, padL)

  let waiting = 0, running = 0, doneCount = 0
  let cumWait = 0, cumWaitCount = 0
  for (const f of job.fragments) {
    if (f.backend !== 'hpc') continue
    const st = fragState(f, T)
    if (st === 'in_queue_hpc')                        waiting++
    if (st === 'exec_hpc' || st === 'exec_retry')     running++
    if (st === 'done')                                doneCount++
    const isFailover = f.fail_type === 'transient' && f.retry_dispatch_t != null
    const d = isFailover ? f.retry_dispatch_t : f.dispatch_t
    const s = isFailover ? f.retry_start_t    : f.start_t
    if (d != null && s != null && T >= s) {
      cumWait += (s - d); cumWaitCount++
    }
  }
  const meanWait = cumWaitCount ? (cumWait / cumWaitCount) : 0
  const util = running / cap
  p1Caption.innerHTML =
    `<span class="kpi"><b>${running}</b>/${cap} workers</span>` +
    `<span class="kpi"><b>${waiting}</b> en g_hpc_q</span>` +
    `<span class="kpi"><b>${doneCount}</b> done</span>` +
    `<span class="kpi">utilización <b>${(util * 100).toFixed(0)}%</b></span>` +
    `<span class="kpi">q.wait medio <b>${meanWait.toFixed(2)}s</b></span>`
}

/* Stacked area of inflight_hpc(t) vs inflight_qc(t) */
let p2Wrap = null, p2Cv = null, p2Caption = null
let p2Job = null
let p2SeriesCache = null
let p2Legend = null

export function initP2(host) {
  p2Wrap = document.createElement('div')
  p2Wrap.className = 'chart-wrap'
  p2Wrap.innerHTML = `
    <div class="chart-title">P2 · Solape HPC vs QC en el tiempo
      <span class="chart-sub">stacked area inflight(t)</span></div>
    <div class="chart-legend" id="p2-legend">
      <span class="lg-item"><span class="lg-sw lg-sw-hpc"></span>HPC inflight <b id="p2-h">0</b></span>
      <span class="lg-item"><span class="lg-sw lg-sw-qc"></span>QC inflight <b id="p2-q">0</b></span>
    </div>
    <canvas class="chart-cv" id="p2-cv"></canvas>
    <div class="chart-caption" id="p2-caption"></div>
  `
  host.appendChild(p2Wrap)
  p2Cv = p2Wrap.querySelector('#p2-cv')
  p2Caption = p2Wrap.querySelector('#p2-caption')
  p2Legend = {
    h: p2Wrap.querySelector('#p2-h'),
    q: p2Wrap.querySelector('#p2-q'),
  }
  new ResizeObserver(() => {
    if (!p2Job) return
    p2SeriesCache = null
    drawP2(window.__lastT ?? 0)
  }).observe(p2Wrap)
}

export function setP2Job(job) {
  p2Job = job
  p2SeriesCache = null
  drawP2(0)
}

function computeP2Series(job, w) {
  const totalT = job.total_duration_s
  const N = Math.min(280, Math.max(80, Math.floor(((w || 320) - 36) / 2)))
  const hpc = new Array(N), qc = new Array(N)
  let maxY = 1
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * totalT
    let h = 0, q = 0
    for (const f of job.fragments) {
      const st = fragState(f, t)
      if (st === 'exec_hpc' || st === 'exec_retry') h++
      else if (st === 'exec_qc')                    q++
    }
    hpc[i] = h; qc[i] = q
    maxY = Math.max(maxY, h + q)
  }
  return { N, hpc, qc, maxY }
}

function drawP2(T) {
  if (!p2Job || !p2Cv) return
  const job = p2Job
  const totalT = job.total_duration_s
  const h = 180
  const w = panelInnerWidth()
  if (!p2SeriesCache) p2SeriesCache = computeP2Series(job, w)
  const { N, hpc, qc, maxY } = p2SeriesCache
  const padT = 12, padB = 18, padL = 28, padR = 8
  const ctx = setupCanvas(p2Cv, w, h)
  clearCanvas(ctx, w, h)
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  ctx.strokeStyle = COL.grid; ctx.lineWidth = 1
  ctx.fillStyle = COL.ink3
  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  const yTicks = [0, Math.round(maxY / 2), maxY]
  yTicks.forEach(v => {
    const y = padT + innerH - (v / maxY) * innerH
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke()
    ctx.fillText(String(v), padL - 4, y)
  })
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  const tickStep = totalT > 60 ? 20 : (totalT > 30 ? 10 : 5)
  for (let t = 0; t <= totalT; t += tickStep) {
    const x = padL + (t / totalT) * innerW
    ctx.fillText(`${t.toFixed(0)}s`, x, h - padB + 2)
  }
  const xAt = i => padL + (i / (N - 1)) * innerW
  const yAt = v => padT + innerH - (v / maxY) * innerH
  ctx.fillStyle = COL.hpcLight
  ctx.beginPath()
  ctx.moveTo(xAt(0), yAt(0))
  for (let i = 0; i < N; i++) ctx.lineTo(xAt(i), yAt(hpc[i]))
  ctx.lineTo(xAt(N - 1), yAt(0)); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = COL.hpc; ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const x = xAt(i), y = yAt(hpc[i])
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.fillStyle = COL.qcLight
  ctx.beginPath()
  for (let i = 0; i < N; i++) ctx.lineTo(xAt(i), yAt(hpc[i]))
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(xAt(i), yAt(hpc[i] + qc[i]))
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = COL.qc; ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const x = xAt(i), y = yAt(hpc[i] + qc[i])
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  drawCursor(ctx, T, totalT, w, h - padB + 2, padL)
  let hNow = 0, qNow = 0
  for (const f of job.fragments) {
    const st = fragState(f, T)
    if (st === 'exec_hpc' || st === 'exec_retry') hNow++
    else if (st === 'exec_qc')                    qNow++
  }
  if (p2Legend) {
    if (p2Legend.h.textContent !== String(hNow)) p2Legend.h.textContent = hNow
    if (p2Legend.q.textContent !== String(qNow)) p2Legend.q.textContent = qNow
  }

  const phiNum = job.phi
  const phiStr = phiNum != null ? phiNum.toFixed(2) : '—'
  const bound = phiNum != null && phiNum > 1 ? 'QC-bound' : 'HPC-bound'
  p2Caption.innerHTML =
    `<span class="kpi">Φ = T<sub>QC</sub>/T<sub>HPC</sub> = <b>${phiStr}</b></span>` +
    `<span class="kpi">T<sub>HPC</sub> <b>${(job.t_hpc_s ?? 0).toFixed(1)}s</b></span>` +
    `<span class="kpi">T<sub>QC</sub> <b>${(job.t_qc_s ?? 0).toFixed(1)}s</b></span>` +
    `<span class="kpi">${bound}</span>`
}

/* Real-time label resolution table */
let p3Wrap = null, p3List = null, p3Stats = null
let p3Job = null
let p3Events = []
let p3Seen = new Set()

export function initP3(host) {
  p3Wrap = document.createElement('div')
  p3Wrap.className = 'chart-wrap'
  p3Wrap.innerHTML = `
    <div class="chart-title">P3 · Resolución de labels (initial → resolved)
      <span class="chart-sub">undecided + failover QC→HPC</span></div>
    <div id="p3-stats" class="p3-stats"></div>
    <div id="p3-list" class="p3-list"></div>
  `
  host.appendChild(p3Wrap)
  p3Stats = p3Wrap.querySelector('#p3-stats')
  p3List = p3Wrap.querySelector('#p3-list')
}

export function setP3Job(job) {
  p3Job = job
  p3Events = []
  p3Seen = new Set()
  for (const f of job.fragments) {
    if (f.initial_label === 'Undecided') {
      p3Events.push({
        t: f.dispatch_t ?? 0,
        type: 'undecided',
        frag: f,
        from: 'Undecided',
        to:   f.resolved_label || (f.backend === 'qc' ? 'QC' : 'HPC'),
      })
    }
    if (f.fail_type === 'transient' && f.fail_t != null
        && f.initial_label === 'QC' && f.backend === 'hpc') {
      p3Events.push({
        t: f.fail_t,
        type: 'failover',
        frag: f,
        from: 'QC',
        to:   'HPC',
      })
    }
  }
  p3Events.sort((a, b) => a.t - b.t)
  p3List.innerHTML = ''
  drawP3(0)
}

function drawP3(T) {
  if (!p3Job) return
  const job = p3Job
  const fr = job.fragments

  let initHPC = 0, initQC = 0, initUND = 0
  let undResolvedHPC = 0, undResolvedQC = 0
  let failovers = 0, undPending = 0
  for (const f of fr) {
    if (f.initial_label === 'HPC')       initHPC++
    else if (f.initial_label === 'QC')   initQC++
    else                                  initUND++
    if (f.initial_label === 'Undecided') {
      if (T < (f.dispatch_t ?? Infinity)) undPending++
      else if (f.resolved_label === 'HPC') undResolvedHPC++
      else                                  undResolvedQC++
    }
    if (f.fail_type === 'transient' && f.initial_label === 'QC'
        && f.backend === 'hpc' && T >= (f.fail_t ?? Infinity)) {
      failovers++
    }
  }

  p3Stats.innerHTML =
    `<div class="p3-row p3-row-h">
       <span class="p3-cell">labeler</span>
       <span class="p3-cell">→ resolved</span>
       <span class="p3-cell p3-num">count</span>
     </div>` +
    `<div class="p3-row">
       <span class="p3-cell"><span class="b-hpc">HPC</span></span>
       <span class="p3-cell"><span class="b-hpc">HPC</span></span>
       <span class="p3-cell p3-num">${initHPC}</span>
     </div>` +
    `<div class="p3-row">
       <span class="p3-cell"><span class="b-qc">QC</span></span>
       <span class="p3-cell"><span class="b-qc">QC</span></span>
       <span class="p3-cell p3-num">${initQC - failovers}</span>
     </div>` +
    `<div class="p3-row">
       <span class="p3-cell"><span class="b-und">Undecided</span></span>
       <span class="p3-cell"><span class="b-hpc">HPC</span></span>
       <span class="p3-cell p3-num">${undResolvedHPC}/${initUND - undPending - undResolvedQC}</span>
     </div>` +
    `<div class="p3-row">
       <span class="p3-cell"><span class="b-und">Undecided</span></span>
       <span class="p3-cell"><span class="b-qc">QC</span></span>
       <span class="p3-cell p3-num">${undResolvedQC}/${initUND - undPending - undResolvedHPC}</span>
     </div>` +
    (failovers || job.counts?.failed_qc_to_hpc
      ? `<div class="p3-row p3-row-fail">
           <span class="p3-cell"><span class="b-qc">QC</span> <span class="p3-arrow">⚡</span></span>
           <span class="p3-cell"><span class="b-hpc">HPC*</span></span>
           <span class="p3-cell p3-num">${failovers}<span class="p3-num-sub"> / ${job.counts?.failed_qc_to_hpc ?? 0}</span></span>
         </div>` : '') +
    (undPending ? `<div class="p3-pending">+${undPending} undecided pendientes</div>` : '')

  p3Events.forEach(ev => {
    if (ev.t > T) return
    const k = `${ev.type}-${ev.frag.id}`
    if (p3Seen.has(k)) return
    p3Seen.add(k)
    const row = document.createElement('div')
    row.className = `p3-ev p3-ev-${ev.type}`
    row.dataset.t = ev.t.toFixed(4)
    row.dataset.key = k
    const arrow = ev.type === 'failover' ? '⚡→' : '→'
    row.innerHTML =
      `<span class="p3-ev-t">[${ev.t.toFixed(2)}s]</span>` +
      ` <span class="p3-ev-id">${ev.frag.id}</span>` +
      ` <span class="b-${ev.from.toLowerCase().replace('undecided','und')}">${ev.from}</span>` +
      ` <span class="p3-arrow">${arrow}</span>` +
      ` <span class="b-${ev.to.toLowerCase()}">${ev.to}</span>` +
      (ev.type === 'failover' ? ` <span class="p3-tag">TRANSIENT_FAIL · requeue</span>` : '')
    p3List.prepend(row)
  })
  Array.from(p3List.children).forEach(child => {
    const t = parseFloat(child.dataset.t)
    if (t > T) {
      p3Seen.delete(child.dataset.key)
      child.remove()
    }
  })
  while (p3List.childElementCount > 80) p3List.lastChild.remove()
}

/* Public API */
export function setActiveJob(job) {
  setP1Job(job)
  setP2Job(job)
  setP3Job(job)
}

export function updateCharts(T) {
  const active = document.querySelector('.lp-tab.active')?.dataset?.tab
  if (active === 'p1') drawP1(T)
  else if (active === 'p2') drawP2(T)
  else if (active === 'p3') drawP3(T)
}

export function showChartView(name) {
  document.querySelectorAll('.lp-tab-pane').forEach(el => {
    el.classList.add('lp-tab-hidden')
  })
  const el = document.querySelector(`.lp-tab-pane[data-pane="${name}"]`)
  if (el) el.classList.remove('lp-tab-hidden')
  if (!p1Job) return
  nextFrame(() => {
    if (name === 'p1') drawP1(window.__lastT ?? 0)
    if (name === 'p2') { p2SeriesCache = null; drawP2(window.__lastT ?? 0) }
    if (name === 'p3') drawP3(window.__lastT ?? 0)
  })
}
