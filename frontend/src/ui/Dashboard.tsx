import { fmtDate } from './utils/date.utils'
import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

import { api } from './utils/api.utils'

import { crashFreeRate, errorRate, eventsPerMinute, rateTone, totalEvents, type Bucket } from './utils/dashboardStats'

type SeriesRow = Bucket & { bucket: string }
type ReleaseHealth = { 
  version: string; 
  environment: string; 
  total_sessions: number; 
  crashed_sessions: number; 
  crash_free_rate: number 
}
type Release = {
  id: number;
  version: string;
  date_created: string;
  new_issues: number;
  total_issues: number;
}
type Deployment = {
  id: number;
  environment: string;
  version: string;
  timestamp: string;
  url?: string;
}

type DashboardTemplate = 'current' | 'general'

/** "14:05" for ranges up to a day and a half, "Nov 20" beyond that (ECharts hands us the raw ISO bucket). */
export const bucketLabel = (bucket: string, spanMs: number): string => {
  const d = new Date(bucket)
  if (Number.isNaN(d.getTime())) return bucket
  return spanMs > 36 * 3600 * 1000
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function Dashboard({ projectSlug, fromTo, onOpenProjects }: { onOpenProjects?: () => void; projectSlug: string, fromTo?: { from: string; to: string } | null }) {
  const [seriesStatus, setSeriesStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [top, setTop] = useState<{ title: string; fingerprint: string; count: number }[] | null>(null)
  const [releaseHealth, setReleaseHealth] = useState<ReleaseHealth[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [range, setRange] = useState<'1h'|'24h'|'7d'|'30d'>('24h')
  const [interval, setInterval] = useState<'5m'|'1h'>('5m')
  const [template, setTemplate] = useState<DashboardTemplate>('current')

  useEffect(() => {
    const controller = new AbortController()
    const options = { signal: controller.signal }
    setSeriesStatus('loading')
    setSeries([])
    setTop(null)
    setReleaseHealth([])
    setReleases([])
    setDeployments([])
    const base = `/api/dashboard/series/?project=${projectSlug}&backend=ch&interval=${interval}`
    const url = fromTo ? `${base}&from=${encodeURIComponent(fromTo.from)}&to=${encodeURIComponent(fromTo.to)}` : `${base}&range=${range}`
    api(url, options).then(rows => {
      setSeries(rows)
      setSeriesStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setSeriesStatus('error')
    })
    
    const baseTop = `/api/dashboard/top-groups/?project=${projectSlug}&backend=ch`
    const urlTop = fromTo ? `${baseTop}&from=${encodeURIComponent(fromTo.from)}&to=${encodeURIComponent(fromTo.to)}` : `${baseTop}&range=${range}`
    api(urlTop, options).then(setTop).catch(()=>{})
    
    // Fetch release health data
    api(`/api/releases/health/?project=${projectSlug}`, options).then(setReleaseHealth).catch(()=>{})
    
    // Fetch recent releases
    api(`/api/releases/?project=${projectSlug}`, options).then(setReleases).catch(()=>{})
    
    // Fetch recent deployments 
    api(`/api/deployments/?project=${projectSlug}`, options).then(setDeployments).catch(()=>{})
    return () => controller.abort()
  }, [projectSlug, range, interval, fromTo?.from, fromTo?.to])

  const count = totalEvents(series)
  const intervalMinutes = interval === '5m' ? 5 : 60
  const rate = errorRate(series)
  const tone = { none: 'text-slate-400', good: 'text-accent-400', warn: 'text-amber-400', bad: 'text-red-400' }[rateTone(rate)]
  const crashFree = crashFreeRate(releaseHealth)
  const average = eventsPerMinute(series, intervalMinutes)
  const seriesMessage = seriesStatus === 'loading' ? 'Loading events' :
    seriesStatus === 'error' ? 'Event data unavailable' : 'No events in this period'
  const missing = (reason: string) => <span className="text-slate-400" title={reason}>-</span>
  const missingEvents = missing(seriesMessage)

  // ECharts configuration for events chart
  // Map each deployment to the nearest visible time bucket so it renders as a
  // marker line on the error chart — spikes then line up with "what shipped".
  const deployMarkLines = () => {
    const buckets = series.map(s => s.bucket)
    if (!buckets.length || !deployments.length) return []
    const times = buckets.map(b => new Date(b).getTime())
    const min = times[0]
    const max = times[times.length - 1]
    const tol = times.length > 1 ? (times[1] - times[0]) : 0
    return deployments
      .map(d => ({ t: new Date(d.timestamp).getTime(), d }))
      .filter(({ t }) => t >= min - tol && t <= max + tol)
      .map(({ t, d }) => {
        let idx = 0, best = Infinity
        times.forEach((bt, i) => { const diff = Math.abs(bt - t); if (diff < best) { best = diff; idx = i } })
        return { xAxis: buckets[idx], name: `${d.version}${d.environment ? ` · ${d.environment}` : ''}` }
      })
  }

  // Bucket timestamps arrive as ISO strings; show clock time for short ranges and the date for long ones.
  const spanMs = series.length > 1 ? new Date(series[series.length - 1].bucket).getTime() - new Date(series[0].bucket).getTime() : 0
  const axisLabel = (bucket: string) => bucketLabel(bucket, spanMs)

  const lineStyle = (color: string) => ({ lineStyle: { color, width: 1.5 }, itemStyle: { color }, showSymbol: false, symbol: 'none', smooth: false })

  const getEventsChartOption = (): any => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any[]) => {
        const rows = params.map(p => `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(2)}/min`).join('<br/>')
        return `${fmtDate(String(params[0]?.axisValue ?? ''))}<br/>${rows}`
      }
    },
    grid: { left: 8, right: 16, bottom: 8, top: 12, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: series.map(s => s.bucket),
      axisLabel: { color: '#94a3b8', fontSize: 11, hideOverlap: true, formatter: axisLabel },
      axisLine: { lineStyle: { color: '#334155' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'Errors',
        type: 'line',
        data: series.map(s => s.error / intervalMinutes),
        ...lineStyle('#ef4444'),
        markLine: {
          symbol: 'none',
          silent: false,
          lineStyle: { color: '#64748b', type: 'dashed', width: 1 },
          label: {
            formatter: (p: any) => `${p.name}`,
            color: '#94a3b8',
            fontSize: 10,
            position: 'insideEndTop',
          },
          data: deployMarkLines(),
        },
      },
      { name: 'Warnings', type: 'line', data: series.map(s => s.warning / intervalMinutes), ...lineStyle('#f59e0b') },
      { name: 'Info', type: 'line', data: series.map(s => s.info / intervalMinutes), ...lineStyle('#0ea5e9') }
    ]
  })

  // Dashboard widgets
  const renderWidgets = () => (
    <div className="space-y-6">

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Error Rate</p>
              <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{rate === null ? missingEvents : `${rate.toFixed(2)}%`}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Crash-Free Rate</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-100">
                {crashFree === null ? missing('No release health data') : `${crashFree.toFixed(2)}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Active Issues</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-100">{count ? top?.length ?? missing('No issue data') : missingEvents}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Events</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-100">{count ? count.toLocaleString() : missingEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={template === 'current' ? "grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" : "space-y-6"}>
        {/* Left Column */}
        <div className="space-y-6">
          {/* Events Chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Events per minute</h2>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-slate-300">Errors</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span className="text-slate-300">Warnings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                  <span className="text-slate-300">Info</span>
                </div>
              </div>
            </div>
            <p className="mb-2 text-sm text-slate-400">Average: {count && average !== null ? average.toFixed(1) : missingEvents}</p>
            {count > 0 && <ReactECharts
              echarts={echarts as any}
              option={getEventsChartOption()}
              style={{ height: '200px', width: '100%' }}
            />}
          </div>

          {/* Release Health */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-100">Release Health</h2>
            {!releaseHealth.length && <p className="text-sm text-slate-400">No release health data</p>}
            <div className="space-y-3">
              {releaseHealth.slice(0, 5).map((rh, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-slate-600 p-3">
                  <div>
                    <div className="font-medium text-white">{rh.version}</div>
                    <div className="text-sm text-slate-400">{rh.environment}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${rh.crash_free_rate >= 99.5 ? 'text-accent-400' : rh.crash_free_rate >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
                      {rh.crash_free_rate}%
                    </div>
                    <div className="text-sm text-slate-400">
                      {rh.total_sessions.toLocaleString()} sessions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Issues */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-100">Top Issues</h2>
            {!top?.length && <p className="text-sm text-slate-400">No issues to display</p>}
            <ul className="space-y-2">
              {top?.slice(0, 8).map((t, i) => (
                <li key={i} className="flex items-center justify-between rounded border border-slate-600 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {t.title || t.fingerprint}
                    </div>
                  </div>
                  <div className="ml-2 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300">
                    {t.count}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Deployments */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-100">Recent Deployments</h2>
            {!deployments.length && <p className="text-sm text-slate-400">No deployments to display</p>}
            <div className="space-y-2">
              {deployments.slice(0, 5).map((deployment, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-slate-600 p-2">
                  <div>
                    <div className="text-sm font-medium text-white">{deployment.version}</div>
                    <div className="text-xs text-slate-400">{deployment.environment}</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(deployment.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Recent Releases */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-100">Recent Releases</h2>
            {!releases.length && <p className="text-sm text-slate-400">No releases to display</p>}
            <div className="space-y-2">
              {releases.slice(0, 5).map((release, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-slate-600 p-2">
                  <div>
                    <div className="text-sm font-medium text-white">{release.version}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(release.date_created).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {release.new_issues > 0 && (
                      <div className="text-red-400">+{release.new_issues} issues</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with template and time range controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
            <p className="text-sm text-slate-400">Skylark shows errors and releases. Page-load and transaction performance are not collected yet.</p>
          </div>
          <select 
            className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white" 
            aria-label="Dashboard template"
            value={template} 
            onChange={e=>setTemplate(e.target.value === 'general' ? 'general' : 'current')}
          >
            <option value="current">Current Template</option>
            <option value="general">General Template</option>
          </select>
        </div>
        {!fromTo && (
          <div className="space-x-2">
            <select className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white" value={range} onChange={e=>setRange(e.target.value as any)}>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <select className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-white" value={interval} onChange={e=>setInterval(e.target.value as any)}>
              <option value="5m">5m</option>
              <option value="1h">1h</option>
            </select>
          </div>
        )}
      </div>

      {seriesStatus === 'ready' && count === 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h2 className="text-base font-semibold text-slate-100">No events in this period</h2>
          <p className="text-sm text-slate-400">Nothing has been received for this project in the selected range. Check the range, or connect an app from the Projects page.</p>
          <button type="button" className="text-accent-400 underline" onClick={onOpenProjects}>Go to Projects</button>
        </section>
      )}
      {renderWidgets()}
    </div>
  )
}
