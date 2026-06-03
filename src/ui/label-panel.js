/**
 * Author: Ricard Santiago Raigada García
 */

import { fragState } from '../scene/fragments.js'
import { initP1, initP2, initP3, setActiveJob, updateCharts, showChartView } from './charts.js'

const LABEL_COLORS = {
  HPC: { bg: '#d0e2ff', border: '#0f62fe', text: '#0043ce' },
  QC: { bg: '#9ef0f0', border: '#009d9a', text: '#005d5d' },
  Undecided: { bg: '#fef3c7', border: '#d97706', text: '#b45309' },
  '—': { bg: 'rgba(22,22,22,0.04)', border: 'rgba(22,22,22,0.12)', text: 'rgba(22,22,22,0.35)' },
}

const STATUS_TEXT = {
  pending: 'pending',
  in_queue_hpc: 'in g_hpc_q',
  in_queue_qc: 'qc session',
  exec_hpc: 'running',
  exec_qc: 'running',
  exec_retry: 'retry',
  done: 'done',
  tfail_wait: 'tfail',
  pfail: 'pfail',
}
const STATUS_COLORS = {
  pending: 'rgba(22,22,22,0.40)',
  in_queue_hpc: '#0043ce',
  in_queue_qc: '#005d5d',
  exec_hpc: '#0f62fe',
  exec_qc: '#009d9a',
  exec_retry: '#d97706',
  done: '#0e6027',
  tfail_wait: '#b45309',
  pfail: '#a2191f',
}

let panel = null
let body = null
let hdrPolicy = null
let hdrCounts = null
let hdrTime = null
const rowCache = new Map()

export function initLabelPanel() {
  panel = document.createElement('div')
  panel.id = 'label-panel'
  panel.innerHTML = `
    <div id="lp-top">
      <div id="lp-policy-switcher"></div>
      <div id="lp-policy-meta">
        <span id="lp-pol-title">—</span>
        <span id="lp-pol-sub">loading…</span>
      </div>
      <div id="lp-counts">
        <span class="lp-chip lc-hpc"><span id="lp-c-hpc">0</span> hpc</span>
        <span class="lp-chip lc-qc"><span id="lp-c-qc">0</span> qc</span>
        <span class="lp-chip lc-q"><span id="lp-c-q">0</span> queued</span>
        <span class="lp-chip lc-d"><span id="lp-c-done">0</span> done</span>
        <span class="lp-chip lc-time" id="lp-time">T = 0.000s</span>
      </div>
      <div id="lp-tabs">
        <button class="lp-tab active" data-tab="frags">Lista</button>
        <button class="lp-tab" data-tab="p1">P1 Gantt</button>
        <button class="lp-tab" data-tab="p2">P2 Inflight</button>
        <button class="lp-tab" data-tab="p3">P3 Labels</button>
      </div>
    </div>

    <div class="lp-tab-pane" data-pane="frags">
      <div id="lp-header">
        <span class="lp-h lp-h-id">id</span>
        <span class="lp-h lp-h-init">initial</span>
        <span class="lp-h lp-h-res">resolved</span>
        <span class="lp-h lp-h-rank">host - rank</span>
        <span class="lp-h lp-h-q">q.wait</span>
        <span class="lp-h lp-h-x">exec</span>
        <span class="lp-h lp-h-st">state</span>
      </div>
      <div id="lp-body"></div>
    </div>
    <div class="lp-tab-pane lp-tab-hidden" data-pane="p1"></div>
    <div class="lp-tab-pane lp-tab-hidden" data-pane="p2"></div>
    <div class="lp-tab-pane lp-tab-hidden" data-pane="p3"></div>
  `
  document.getElementById('app').appendChild(panel)
  body = panel.querySelector('#lp-body')
  hdrPolicy = panel.querySelector('#lp-pol-title')
  hdrCounts = panel.querySelector('#lp-pol-sub')
  hdrTime = panel.querySelector('#lp-time')
  initP1(panel.querySelector('.lp-tab-pane[data-pane="p1"]'))
  initP2(panel.querySelector('.lp-tab-pane[data-pane="p2"]'))
  initP3(panel.querySelector('.lp-tab-pane[data-pane="p3"]'))

  panel.querySelectorAll('.lp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.lp-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      showChartView(btn.dataset.tab)
    })
  })

  return panel
}

export function rebuildLabelPanelBody(job) {
  if (!body) return
  body.innerHTML = ''
  rowCache.clear()

  hdrPolicy.textContent = `policy ${job.policy_id} - job ${job.job_id}`
  const nodes = job.nodes.map(n => n.name).join(' + ')
  hdrCounts.textContent =
    `${nodes} - hpc_cap ${job.hpc_cap} - qc_cap ${job.qc_cap} - ` +
    `${job.fragments.length} frags - Φ ${job.phi ?? '—'}`

  setActiveJob(job)
  const rows = [...job.fragments]
    .sort((a, b) => (a.dispatch_t ?? 0) - (b.dispatch_t ?? 0))

  rows.forEach(frag => {
    const initial = frag.initial_label || 'Undecided'
    const row = document.createElement('div')
    row.className  = 'lp-row lp-row-pending'
    row.id         = `lpr-${frag.id}`

    const lc = LABEL_COLORS[initial] || LABEL_COLORS.Undecided
    row.innerHTML = `
      <span class="lp-c lp-c-id">${frag.id}</span>
      <span class="lp-c lp-c-init">
        <span class="lp-badge"
          style="color:${lc.text};background:${lc.bg};border:1px solid ${lc.border}">
          ${initial}
        </span>
      </span>
      <span class="lp-c lp-c-res"><span class="lp-badge lp-badge-dim">—</span></span>
      <span class="lp-c lp-c-rank">—</span>
      <span class="lp-c lp-c-q">—</span>
      <span class="lp-c lp-c-x">—</span>
      <span class="lp-c lp-c-st">—</span>
    `

    body.appendChild(row)
    rowCache.set(frag.id, {
      row,
      cells: {
        resolved: row.querySelector('.lp-c-res .lp-badge'),
        rank:     row.querySelector('.lp-c-rank'),
        qwait:    row.querySelector('.lp-c-q'),
        exec:     row.querySelector('.lp-c-x'),
        status:   row.querySelector('.lp-c-st'),
      },
      last: { status: null, resolved: null },
    })
  })
}

export function updateLabelPanel(fragments, T) {
  if (!body) return
  let cHpc = 0, cQc = 0, cQueued = 0, cDone = 0

  fragments.forEach(frag => {
    const st = fragState(frag, T) || 'pending'
    if (st === 'exec_hpc' || st === 'exec_retry') cHpc++
    else if (st === 'exec_qc')                    cQc++
    else if (st === 'in_queue_hpc' || st === 'in_queue_qc') cQueued++
    else if (st === 'done')                       cDone++

    const rc = rowCache.get(frag.id)
    if (!rc) return
    const { row, cells, last } = rc
    let resolved = '—'
    if (T >= frag.dispatch_t) {
      resolved = frag.resolved_label
        || (frag.backend === 'qc' ? 'QC' : 'HPC')
    }
    if (frag.fail_type === 'transient' && T >= (frag.fail_t ?? Infinity)
        && frag.initial_label === 'QC' && frag.backend === 'hpc') {
      resolved = 'HPC*'
    }

    if (last.resolved !== resolved) {
      last.resolved = resolved
      const key = resolved.startsWith('HPC') ? 'HPC'
                : resolved.startsWith('QC')  ? 'QC'
                : '—'
      const lc = LABEL_COLORS[key] || LABEL_COLORS['—']
      cells.resolved.textContent     = resolved
      cells.resolved.style.color     = lc.text
      cells.resolved.style.background= lc.bg
      cells.resolved.style.borderColor = lc.border
      cells.resolved.style.border    = `1px solid ${lc.border}`
      if (resolved !== '—') cells.resolved.classList.remove('lp-badge-dim')
    }

    let onTarget = '—'
    if (T >= frag.dispatch_t) {
      if (frag.host && frag.rank != null) {
        onTarget = `${frag.host}·r${frag.rank}`
      } else if (frag.backend === 'qc') {
        onTarget = 'QPU'
      } else if (frag.rank != null) {
        onTarget = `r${frag.rank}`
      } else {
        onTarget = 'hpc'
      }
    }
    if (cells.rank.textContent !== onTarget) cells.rank.textContent = onTarget
    const isFailover = frag.fail_type === 'transient' && frag.retry_dispatch_t != null
    const useRetry = isFailover && T >= (frag.retry_dispatch_t ?? Infinity)
    const dispRef  = useRetry ? frag.retry_dispatch_t : frag.dispatch_t
    const startRef = useRetry ? frag.retry_start_t    : frag.start_t
    const doneRef  = useRetry ? frag.retry_done_t     : frag.done_t

    let qwait = '—'
    if (startRef != null && T >= startRef) {
      const dt = startRef - dispRef
      qwait = dt < 0.0005 ? '<1ms'
            : dt < 1      ? (dt * 1000).toFixed(0) + 'ms'
            :               dt.toFixed(2) + 's'
    } else if (st === 'in_queue_hpc' || st === 'in_queue_qc') {
      qwait = 'waiting…'
    } else if (isFailover && T >= (frag.fail_t ?? Infinity)
               && T < (frag.retry_dispatch_t ?? Infinity)) {
      qwait = 'requeue…'
    }
    if (cells.qwait.textContent !== qwait) cells.qwait.textContent = qwait

    let exec = '—'
    if (doneRef != null && T >= doneRef) {
      const dt = doneRef - (startRef ?? dispRef)
      exec = dt < 1 ? (dt * 1000).toFixed(0) + 'ms' : dt.toFixed(2) + 's'
    } else if (st === 'exec_hpc' || st === 'exec_qc' || st === 'exec_retry') {
      const dt = T - (startRef ?? dispRef)
      exec = dt < 1 ? (dt * 1000).toFixed(0) + 'ms…' : dt.toFixed(1) + 's…'
    }
    if (cells.exec.textContent !== exec) cells.exec.textContent = exec
    if (last.status !== st) {
      cells.status.textContent = STATUS_TEXT[st] || '—'
      cells.status.style.color = STATUS_COLORS[st] || STATUS_COLORS.pending
      last.status = st
      row.classList.remove('lp-row-pending', 'lp-row-q', 'lp-row-run', 'lp-row-done', 'lp-row-fail')
      if (st === 'pending') row.classList.add('lp-row-pending')
      else if (st === 'in_queue_hpc' || st === 'in_queue_qc') row.classList.add('lp-row-q')
      else if (st === 'exec_hpc' || st === 'exec_qc' || st === 'exec_retry') row.classList.add('lp-row-run')
      else if (st === 'done') row.classList.add('lp-row-done')
      else row.classList.add('lp-row-fail')

      row.classList.remove('lp-flash')
      void row.offsetWidth
      row.classList.add('lp-flash')
    }
  })

  document.getElementById('lp-c-hpc').textContent  = cHpc
  document.getElementById('lp-c-qc').textContent   = cQc
  document.getElementById('lp-c-q').textContent    = cQueued
  document.getElementById('lp-c-done').textContent = cDone
  hdrTime.textContent = `T = ${T.toFixed(3)}s`
  window.__lastT = T
  updateCharts(T)
}
