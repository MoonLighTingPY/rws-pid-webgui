import { useRef, useEffect } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

function formatTime(ts) {
  const d = new Date(Number(ts))
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${m}:${s}.${ms}`
}

function makeTooltip() {
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

/**
 * Minimal React wrapper around uPlot.
 * props:
 *  data: uPlot 2D array
 *  series: uPlot series (first is x = timestamp)
 *  yRange: [min,max] or null for auto
 *  onReady?: (u) => void
 */
export function useUPlot({ data, series, yRange, title }) {
  const containerRef = useRef(null)
  const plotRef = useRef(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const tooltip = makeTooltip()
    tooltipRef.current = tooltip
    containerRef.current.appendChild(tooltip)

    // dynamic range function that inspects visible series data
    const dynamicYRange = (u) => {
      let ymin = Infinity
      let ymax = -Infinity
      for (let s = 1; s < u.series.length; s++) {
        if (u.series[s] && u.series[s].show === false) continue
        const arr = u.data && u.data[s]
        if (!arr) continue
        for (let i = 0; i < arr.length; i++) {
          const v = arr[i]
          if (v == null || Number.isNaN(v)) continue
          if (v < ymin) ymin = v
          if (v > ymax) ymax = v
        }
      }
      if (ymin === Infinity || ymax === -Infinity) {
        return [0, 1]
      }
      // Add padding (12% of span) and ensure small non-zero span
      const span = Math.max(1e-6, ymax - ymin)
      const pad = span * 0.12
      return [ymin - pad, ymax + pad]
    }

    const opts = {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      title,
      ms: 1,
      tzDate: ts => new Date(ts),
      cursor: { focus: { prox: 32 }, y: false },
      scales: {
        x: { time: false },
        y: Array.isArray(yRange) ? { range: () => yRange } : { range: dynamicYRange }
      },
      axes: [
        {
          stroke: '#4a5568',
          grid: { stroke: '#e2e8f0' },
          label: 'Time',
          values: (u, vals) => vals.map(v => formatTime(v)),
        },
        {
          stroke: '#4a5568',
          grid: { stroke: '#edf2f7' },
        },
      ],
      series,
      hooks: {},
      plugins: [
        {
          hooks: {
            setCursor: (u) => {
              const idx = u.cursor.idx
              if (idx == null || idx < 0) {
                tooltip.hidden = true
                return
              }
              const xVal = u.data[0][idx]
              let html = `<div style="font-weight:600;margin-bottom:4px">${formatTime(xVal)}</div>`
              for (let s = 1; s < u.series.length; s++) {
                const ser = u.series[s]
                if (ser && ser.show === false) continue
                const yv = u.data[s] && u.data[s][idx]
                if (yv == null) continue
                const label = ser && ser.label ? ser.label : `s${s}`
                const color = (ser && (ser.stroke || ser.color)) || '#999'
                html += `<div style="display:flex;align-items:center;gap:8px;margin:2px 0">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};"></span>
                  <span style="font-size:11px">${label}: ${Number(yv).toFixed(2)}</span>
                </div>`
              }
              tooltip.innerHTML = html
              const left = u.valToPos(xVal, 'x')
              tooltip.style.left = left + 'px'
              tooltip.style.top = (u.cursor.top ?? 0) + 'px'
              tooltip.hidden = false
            }
          }
        }
      ]
    }

    const u = new uPlot(opts, data, containerRef.current)
    plotRef.current = u

    // Move legend to top-center (overlay) and reserve space so it doesn't overlap the plot.
    // This keeps legend clickable and forces uPlot to recalc size after we change layout.
    try {
      // ensure container is a positioned element so absolute legend is relative to it
      if (!containerRef.current.style.position) {
        containerRef.current.style.position = 'relative'
      }

      const legendEl = containerRef.current.querySelector('.u-legend')
      if (legendEl) {
        legendEl.style.position = 'absolute'
        legendEl.style.top = '8px'
        legendEl.style.left = '50%'
        legendEl.style.transform = 'translateX(-50%)'
        legendEl.style.zIndex = '30'
        // allow pointer events so labels remain clickable
        legendEl.style.pointerEvents = 'auto'

        // Reserve space by adding top padding to the container equal to legend height + gap.
        // Then force uPlot to recalc its size so the plot sits below the legend.
        const lh = Math.ceil(legendEl.getBoundingClientRect().height || 0)
        if (lh > 0) {
          containerRef.current.style.paddingTop = `${lh + 8}px`
          u.setSize({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      }
    } catch (err) {
      // don't break plotting for any unexpected DOM issues
      /* empty */
    }
    
    // make legend labels clickable to toggle visibility (if legend exists)
    const legendLabels = containerRef.current.querySelectorAll('.u-legend .u-label')
    legendLabels.forEach((lab, i) => {
      if (i === 0) return
      lab.style.cursor = 'pointer'
      lab.addEventListener('click', () => {
        const si = i
        u.setSeries(si, { show: !u.series[si].show })
        u.setData(u.data) // force redraw so dynamic range updates when toggling
      })
    })

    const handleResize = () => {
      if (!containerRef.current) return
      u.setSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      try { u.destroy() } catch { /* empty */ }
      tooltip.remove()
    }
  }, [data, series, title, yRange]) // init only once

  // update data when prop changes
  useEffect(() => {
    if (plotRef.current && data && data[0] && data[0].length) {
      try {
        plotRef.current.setData(data)
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // ignore transient setData errors
      }
    }
  }, [data])

  return { containerRef }
}