export function createChartOptions(latestTimestamp, timeWindow) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    elements: {
      point: { radius: 0 },
      line: { tension: 0 },
    },
    plugins: {
      // enable decimation to let Chart.js reduce drawn points
      decimation: {
        enabled: true,
        algorithm: 'lttb', // 'lttb' or 'min-max'
        samples: 500, // target samples shown per dataset (tune as needed)
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          font: { size: 12 },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        position: 'nearest',
        enabled: true,
        animation: false,
        displayColors: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 4,
        callbacks: {
          title: function (context) {
            if (context.length > 0) {
              const timestamp = context[0].parsed.x
              const date = new Date(timestamp)
              const minutes = date.getMinutes().toString().padStart(2, '0')
              const seconds = date.getSeconds().toString().padStart(2, '0')
              const millis = date.getMilliseconds().toString().padStart(3, '0')
              return `Time: ${minutes}:${seconds}.${millis}`
            }
            return ''
          },
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
          },
          labelColor: function (context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
            }
          },
        },
        external: undefined,
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Time',
          font: { size: 12 },
        },
        ticks: {
          font: { size: 11 },
          callback: function (value) {
            const date = new Date(value)
            const minutes = date.getMinutes().toString().padStart(2, '0')
            const seconds = date.getSeconds().toString().padStart(2, '0')
            const millis = date.getMilliseconds().toString().padStart(3, '0')
            return `${minutes}:${seconds}.${millis}`
          },
        },
        grid: { color: '#e2e8f0' },
        min: latestTimestamp ? latestTimestamp - timeWindow * 1000 : undefined,
        max: latestTimestamp || undefined,
      },
      y: {
        title: {
          display: true,
          text: 'Value',
          font: { size: 12 },
        },
        ticks: { font: { size: 11 } },
        grid: { color: '#e2e8f0' },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    datasets: {
      line: {
        pointHoverRadius: 0,
      },
    },
  }
}