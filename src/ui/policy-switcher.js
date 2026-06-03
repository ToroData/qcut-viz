/**
 * Author: Ricard Santiago Raigada García
 */
export function initPolicySwitcher(policyIds, onSelect) {
  const host = document.getElementById('lp-policy-switcher')
  if (!host) return
  host.innerHTML = ''

  policyIds.forEach((id, idx) => {
    const btn = document.createElement('button')
    btn.className = 'lp-pol-btn' + (idx === 0 ? ' active' : '')
    btn.dataset.pol = id
    btn.textContent = `pol-${id}`
    btn.addEventListener('click', () => {
      host.querySelectorAll('.lp-pol-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      onSelect(id)
    })
    host.appendChild(btn)
  })
}
