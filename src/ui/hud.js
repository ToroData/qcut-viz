/**
 * Author: Ricard Santiago Raigada García
 */

import { fragState } from '../scene/fragments.js'

const elHpc  = document.getElementById('s-hpc')
const elQc   = document.getElementById('s-qc')
const elDone = document.getElementById('s-done')
const elFail = document.getElementById('s-fail')
const elTime = document.getElementById('tdsp')
const elJsub = document.getElementById('jsub')
const elFlash = document.getElementById('flash')
const logEls  = [0,1,2,3].map(i => document.getElementById(`ll${i}`))

let logBuf = ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;']
const seen  = new Set()
let flashTimer = null

export function initHUD(job) {
  const nodes = job.nodes.map(n => n.name).join(' + ')
  const polBadge = job.policy_id ? `pol-${job.policy_id} - ` : ''
  elJsub.textContent =
    `${polBadge}${nodes} - hpc_cap ${job.hpc_cap} - qc_cap ${job.qc_cap} - ` +
    `${job.qpu.name} - ${job.fragments.length} fragments`
}

export function updateStats(fragments, T) {
  let hpc = 0, qc = 0, done = 0, fail = 0
  fragments.forEach(f => {
    const s = fragState(f, T)
    if (s === 'exec_hpc' || s === 'exec_retry') hpc++
    if (s === 'exec_qc') qc++
    if (s === 'done')      done++
    if (s === 'pfail') fail++
  })
  elHpc.textContent = hpc
  elQc.textContent = qc
  elDone.textContent = done
  elFail.textContent = fail
  elTime.textContent = 'T = ' + T.toFixed(3) + ' s'
}

export function updateLog(evts, T) {
  evts.filter(e => e.t <= T).forEach(e => {
    const k = `${e.t}_${e.type}_${e.f.id}`
    if (seen.has(k)) return
    seen.add(k)

    const ts = `<span class="lt">[${e.t.toFixed(3)}s]</span>`
    const bk = e.f.backend === 'hpc' ? 'lh' : 'lq'
    let ev = ''
    if (e.type === 'DISPATCH') ev = `<span class="${bk}">DISPATCH ${e.f.backend.toUpperCase()}</span>`
    else if (e.type === 'START') ev = `<span class="${bk}">START</span>`
    else if (e.type === 'DONE') ev = `<span class="ld">DONE</span>`
    else if (e.type === 'TFAIL') ev = `<span class="lw">TRANSIENT_FAIL</span>`
    else if (e.type === 'REQUEUE') ev = `<span class="lw">REQUEUE → retry</span>`
    else ev = `<span class="lf">PERMANENT_FAIL</span>`
    let where = ''
    if ((e.type === 'START' || e.type === 'DONE') && e.f.host && e.f.rank != null) {
      where = ` <span style="opacity:.55">${e.f.host}·r${e.f.rank}</span>`
    }
    logBuf = [...logBuf.slice(1),
              `${ts} ${ev} <span style="opacity:.55">${e.f.id}</span>${where}`]
    logEls.forEach((el, i) => {
      el.innerHTML  = logBuf[i]
      el.className  = 'll' + (i === 3 ? ' hot' : '')
    })
    if (e.type === 'PFAIL' || e.type === 'TFAIL') showFlash(e)
  })
}

export function resetLog() {
  seen.clear()
  logBuf = ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;']
  logEls.forEach(el => { el.innerHTML = '&nbsp;'; el.className = 'll' })
}

/* internal */
function showFlash(e) {
  const label = e.type === 'PFAIL'
    ? `[${e.t.toFixed(2)}s] PERMANENT FAIL  ${e.f.id}`
    : `[${e.t.toFixed(2)}s] TRANSIENT FAIL  ${e.f.id}`
  elFlash.textContent = label
  elFlash.className   = `vis ${e.type === 'PFAIL' ? 'pfail' : 'tfail'}`
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { elFlash.className = '' }, 2200)
}
