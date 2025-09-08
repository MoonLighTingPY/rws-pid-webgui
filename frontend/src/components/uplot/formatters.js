export function formatTime(ts) {
  const d = new Date(ts)
  const m = d.getMinutes().toString().padStart(2,'0')
  const s = d.getSeconds().toString().padStart(2,'0')
  const ms = d.getMilliseconds().toString().padStart(3,'0')
  return `${m}:${s}.${ms}`
}

export function makeTooltip() {
  const el = document.createElement('div')
  el.style.cssText = `
    position:absolute;pointer-events:none;z-index:20;
    background:rgba(17,24,39,0.88);color:#fff;
    font:11px/1.2 system-ui, sans-serif;
    padding:6px 8px;border-radius:6px;
    box-shadow:0 2px 6px -1px rgba(0,0,0,.45);
    transform:translate(-50%,-110%);white-space:nowrap;
  `
  el.hidden = true
  return el
}