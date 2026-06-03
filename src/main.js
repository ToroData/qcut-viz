/**
 * Author: Ricard Santiago Raigada García
 * Date: 16/05/26
 */
import './label-panel.css'
import { cam, setViewport, drawGround } from './scene/isometric.js'
import { drawHPC } from './scene/hpc.js'
import { drawQPU } from './scene/qpu.js'
import { drawOrchestrator } from './scene/orchestrator.js'
import { drawCables } from './scene/cables.js'
import {
  drawFragments, seedFragmentPhases,
  buildEventList, fragState,
} from './scene/fragments.js'
import { drawIdleOverlay } from './ui/idle-overlay.js'
import { initHUD, updateStats, updateLog, resetLog } from './ui/hud.js'
import { initControls, playback } from './ui/controls.js'
import { initLabelPanel, updateLabelPanel,
         rebuildLabelPanelBody } from './ui/label-panel.js'
import { initPolicySwitcher } from './ui/policy-switcher.js'

const POLICY_LOADERS = import.meta.glob('./data/pol-*.json')
const POLICY_IDS = Object.keys(POLICY_LOADERS)
  .map(p => p.match(/pol-([A-Z][A-Z0-9]*)\.json$/i))
  .filter(Boolean)
  .map(m => m[1].toUpperCase())
  .sort()

const state = {
  policyId: null,
  job:      null,
  evts:     [],
  rackMap:  new Map(),
}

const cv  = document.getElementById('cv')
const ctx = cv.getContext('2d')
const DPR = Math.min(window.devicePixelRatio || 1, 2)

function drawFrame(T) {
  if (!state.job) return
  const W = cv.width / DPR, H = cv.height / DPR
  ctx.fillStyle = '#e8e6e1'
  ctx.fillRect(0, 0, W, H)

  const vg = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.95)
  vg.addColorStop(0, 'rgba(255,255,255,0.35)')
  vg.addColorStop(1, 'rgba(170,168,162,0.35)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  drawGround(ctx)
  drawCables(ctx, state.job.fragments, T)
  state.rackMap = drawHPC(ctx, state.job, state.job.fragments, T, fragState)
  drawQPU(ctx, state.job, state.job.fragments, T, fragState)
  drawOrchestrator(ctx)
  drawFragments(ctx, state.job.fragments, T, state.rackMap)
  drawIdleOverlay(ctx, state.job.fragments, T, state.job.hpc_cap)
}

function fullUpdate(T) {
  if (!state.job) return
  drawFrame(T)
  updateStats(state.job.fragments, T)
  updateLog(state.evts, T)
  updateLabelPanel(state.job.fragments, T)
}

function resize() {
  const W = Math.max(320, window.innerWidth - 360)
  const H = window.innerHeight
  cv.width = W * DPR; cv.height = H * DPR
  cv.style.width = W + 'px'; cv.style.height = H + 'px'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(DPR, DPR)
  setViewport(W, H)
  cam.y = -H * 0.02
  fullUpdate(playback.currentT)
}

async function loadPolicy(id) {
  const key = `./data/pol-${id}.json`
  const loader = POLICY_LOADERS[key]
  if (!loader) throw new Error(`unknown policy ${id}`)
  const mod = await loader()
  const job = mod.default || mod

  seedFragmentPhases(job.fragments)

  state.policyId = id
  state.job      = job
  state.evts     = buildEventList(job.fragments)

  playback.playing  = false
  playback.currentT = 0
  playback.totalT   = job.total_duration_s
  const pbtn = document.getElementById('pbtn')
  if (pbtn) pbtn.innerHTML = '&#9654;'
  const scrub = document.getElementById('scrub')
  if (scrub) scrub.value = 0

  resetLog()
  initHUD(job)
  rebuildLabelPanelBody(job)
  fullUpdate(0)
}

initLabelPanel()
initPolicySwitcher(POLICY_IDS, id => { loadPolicy(id) })
initControls(
  cv,
  T => fullUpdate(T),
  (T, reset) => { if (reset) resetLog(); fullUpdate(T) }
)

window.addEventListener('resize', resize)
const hashPol = (location.hash.match(/pol=([A-Z0-9]+)/i) || [])[1]?.toUpperCase()
const bootId = (hashPol && POLICY_IDS.includes(hashPol))
  ? hashPol
  : (POLICY_IDS.includes('A') ? 'A' : POLICY_IDS[0])
loadPolicy(bootId).then(() => resize())
