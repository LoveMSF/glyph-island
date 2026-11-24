import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BatteryCharging, Check, ChevronDown, Clipboard, CloudRain, Copy, Cpu, Moon, Music2, Pause, Play, SkipBack, SkipForward, Sun, Timer, Volume2, Waves, X } from 'lucide-react'

type Telemetry = { cpu: number; ramUsed: number; ramTotal: number; ramPercent: number; battery: number | null; charging: boolean; down: number; up: number }
type Sound = 'Rain' | 'White noise' | 'Deep synth'
const initialTelemetry: Telemetry = { cpu: 0, ramUsed: 0, ramTotal: 1, ramPercent: 0, battery: null, charging: false, down: 0, up: 0 }
const sounds: Sound[] = ['Rain', 'White noise', 'Deep synth']

function formatBytes(value: number) { const gb = value / 1024 ** 3; return `${gb.toFixed(1)} GB` }
function rate(value: number) { return value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB/s` : `${(value / 1024).toFixed(0)} KB/s` }

export default function App() {
  const [time, setTime] = useState(new Date())
  const [telemetry, setTelemetry] = useState(initialTelemetry)
  const [clips, setClips] = useState<string[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [sound, setSound] = useState<Sound>('Rain')
  const [volume, setVolume] = useState(35)
  const [copied, setCopied] = useState(-1)
  const [timerRunning, setTimerRunning] = useState(false)
  const [seconds, setSeconds] = useState(25 * 60)
  const [focusLength, setFocusLength] = useState(25)
  const audioRef = useRef<{ context: AudioContext; gain: GainNode; nodes: AudioNode[] } | null>(null)
  const island = useRef<HTMLDivElement>(null)
  const collapseTimer = useRef<number | undefined>(undefined)
  const cancelCollapse = () => window.clearTimeout(collapseTimer.current)
  const scheduleCollapse = () => { cancelCollapse(); collapseTimer.current = window.setTimeout(() => setExpanded(false), 260) }

  useEffect(() => {
    const clock = window.setInterval(() => setTime(new Date()), 1000)
    const offTelemetry = window.glyph.telemetry(data => setTelemetry(data as Telemetry))
    const offClipboard = window.glyph.clipboard(setClips)
    const offTheme = window.glyph.theme(setTheme)
    return () => { clearInterval(clock); offTelemetry(); offClipboard(); offTheme() }
  }, [])

  useEffect(() => {
    window.glyph.telemetryActive(expanded)
    return () => window.glyph.telemetryActive(false)
  }, [expanded])

  useEffect(() => {
    if (!timerRunning) return
    const tick = window.setInterval(() => setSeconds(s => { if (s <= 1) { setTimerRunning(false); return 0 } return s - 1 }), 1000)
    return () => clearInterval(tick)
  }, [timerRunning])

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.nodes.forEach(node => { try { node.disconnect() } catch { /* already stopped */ } })
    void audioRef.current.context.close()
    audioRef.current = null
  }, [])

  const startAudio = useCallback(async () => {
    stopAudio()
    const context = new AudioContext()
    const gain = context.createGain()
    gain.gain.value = volume / 100 * 0.15
    gain.connect(context.destination)
    const nodes: AudioNode[] = []
    if (sound === 'Deep synth') {
      const osc = context.createOscillator(); const filter = context.createBiquadFilter()
      osc.type = 'sine'; osc.frequency.value = 55; filter.type = 'lowpass'; filter.frequency.value = 220
      osc.connect(filter); filter.connect(gain); osc.start(); nodes.push(osc, filter)
    } else {
      const size = context.sampleRate * 2
      const buffer = context.createBuffer(1, size, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (sound === 'Rain' ? 0.36 + Math.random() * 0.64 : 0.55)
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = true
      if (sound === 'Rain') {
        const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1100
        source.connect(filter); filter.connect(gain); nodes.push(source, filter)
      } else { source.connect(gain); nodes.push(source) }
      source.start()
    }
    audioRef.current = { context, gain, nodes }; setPlaying(true)
  }, [sound, stopAudio, volume])

  useEffect(() => { if (playing && audioRef.current) audioRef.current.gain.gain.value = volume / 100 * 0.15 }, [playing, volume])
  useEffect(() => { if (playing) void startAudio() }, [sound])
  useEffect(() => () => stopAudio(), [stopAudio])

  const toggleAudio = () => { if (playing) { stopAudio(); setPlaying(false) } else void startAudio() }
  const toggleTimer = () => {
    if (seconds === 0) setSeconds(focusLength * 60)
    setTimerRunning(v => !v)
  }
  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const timerProgress = seconds > 0 ? 1 - seconds / (focusLength * 60) : 0

  const handleMove = (event: React.MouseEvent) => {
    const over = Boolean((event.target as HTMLElement).closest('[data-interactive]'))
    window.glyph.pointer(over)
  }

  return <main className={`stage ${theme} relative h-screen w-screen`} onMouseMove={handleMove} onMouseLeave={() => window.glyph.pointer(false)}>
    <div className="widget" ref={island}>
      <motion.section className="capsule" data-interactive onMouseEnter={() => { cancelCollapse(); setExpanded(true); window.glyph.pointer(true) }} onMouseLeave={scheduleCollapse} onClick={() => setExpanded(true)} layout transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
        <div className="capsule-mark"><span className="mark-dot" /><span>GLYPH</span></div>
        <span className="clock">{time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <div className="capsule-stats"><span><Cpu size={12} />{telemetry.cpu}%</span><span><BatteryCharging size={12} />{telemetry.battery === null ? '—' : `${telemetry.battery}%`}</span></div>
        <div className={`equalizer ${playing && expanded ? 'active' : ''}`} aria-label={playing && expanded ? 'Audio playing' : 'Audio stopped'}>{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--bar': `${6 + ((i * 7 + 3) % 11)}px`, '--delay': `${i * 35}ms` } as React.CSSProperties} />)}</div>
        <motion.span className="expand-cue" animate={{ rotate: expanded ? 180 : 0 }}><ChevronDown size={13} /></motion.span>
        {timerRunning && <div className="timer-progress" style={{ transform: `scaleX(${timerProgress})` }} />}
      </motion.section>

      <AnimatePresence initial={false}>
        {expanded && <motion.div className="bento" data-interactive initial={{ opacity: 0, y: -9, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -7, scale: .985 }} transition={{ duration: .2, ease: 'easeOut' }} onMouseEnter={() => { cancelCollapse(); window.glyph.pointer(true) }} onMouseLeave={scheduleCollapse}>
          <header className="bento-head"><div><span className="eyebrow">GLYPHISLAND <b className="red-dot" /></span><span className="head-sub">SYSTEM CONTROL / 01</span></div><button className="icon-button close" onClick={event => { event.stopPropagation(); setExpanded(false) }} aria-label="Close expanded widget"><X size={14} /></button></header>
          <div className="grid">
            <section className="module telemetry">
              <div className="module-title"><span>TELEMETRY</span><span className="live">● LIVE</span></div>
              <div className="telemetry-top"><div className="metric-main"><span className="label">CPU LOAD</span><span className="metric-number">{telemetry.cpu}<small>%</small></span><div className="meter"><i style={{ width: `${telemetry.cpu}%` }} /></div></div><div className="metric-main"><span className="label">MEMORY</span><span className="metric-number">{telemetry.ramPercent}<small>%</small></span><div className="meter"><i style={{ width: `${telemetry.ramPercent}%` }} /></div><span className="micro">{formatBytes(telemetry.ramUsed)} / {formatBytes(telemetry.ramTotal)}</span></div></div>
              <div className="telemetry-bottom"><div><span className="label">NETWORK ↓</span><strong>{rate(telemetry.down)}</strong></div><div><span className="label">NETWORK ↑</span><strong>{rate(telemetry.up)}</strong></div><div><span className="label">BATTERY</span><strong>{telemetry.battery === null ? 'DESKTOP' : `${telemetry.battery}%${telemetry.charging ? ' +' : ''}`}</strong></div></div>
            </section>

            <section className="module audio-module">
              <div className="module-title"><span>AUDIO / FOCUS</span><Music2 size={13} /></div>
              <div className="sound-picker">{sounds.map((item, i) => <button key={item} className={sound === item ? 'selected' : ''} onClick={() => setSound(item)}>{i === 0 ? <CloudRain size={12} /> : i === 1 ? <Waves size={12} /> : <Moon size={12} />}<span>{item}</span></button>)}</div>
              <div className="audio-controls"><button className="icon-button" aria-label="Previous sound" onClick={() => setSound(sounds[(sounds.indexOf(sound) + sounds.length - 1) % sounds.length])}><SkipBack size={14} /></button><button className="play-button" onClick={toggleAudio} aria-label={playing ? 'Pause sound' : 'Play sound'}>{playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</button><button className="icon-button" aria-label="Next sound" onClick={() => setSound(sounds[(sounds.indexOf(sound) + 1) % sounds.length])}><SkipForward size={14} /></button><div className={`spectrum ${playing ? 'active' : ''}`}>{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--bar': `${4 + (i * 5 % 19)}px`, '--delay': `${i * 28}ms` } as React.CSSProperties} />)}</div></div>
              <div className="volume-row"><Volume2 size={13} /><input aria-label="Sound volume" type="range" min="0" max="100" value={volume} onChange={event => setVolume(+event.target.value)} /><span>{volume}%</span></div>
            </section>

            <section className="module clipboard-module">
              <div className="module-title"><span>CLIPBOARD VAULT</span><Clipboard size={13} /></div>
              <div className="clip-list">{clips.length === 0 ? <div className="empty-state"><span className="empty-mark">···</span><span>Copy text to vault a snippet</span></div> : clips.map((clip, i) => <button className="clip-row" key={`${clip.slice(0, 12)}-${i}`} onClick={() => { void window.glyph.copy(clip); setCopied(i); window.setTimeout(() => setCopied(-1), 1000) }}><span className="clip-index">{String(i + 1).padStart(2, '0')}</span><span className="clip-text">{clip.replace(/\s+/g, ' ').slice(0, 58)}</span>{copied === i ? <Check size={13} /> : <Copy size={12} />}</button>)}</div>
            </section>

            <section className="module timer-module">
              <div className="module-title"><span>FOCUS TIMER</span><Timer size={13} /></div>
              <div className="timer-readout">{timerLabel}</div>
              <div className="timer-track"><i style={{ width: `${timerProgress * 100}%` }} /></div>
              <div className="timer-bottom"><button className="timer-adjust" onClick={() => { const next = focusLength === 25 ? 50 : 25; setFocusLength(next); setSeconds(next * 60); setTimerRunning(false) }}>{focusLength}<small> MIN</small><ChevronDown size={11} /></button><button className="timer-toggle" onClick={toggleTimer}>{timerRunning ? 'PAUSE' : seconds === 0 ? 'RESTART' : 'START'} <span>{timerRunning ? <Pause size={10} /> : <Play size={10} />}</span></button></div>
            </section>
          </div>
          <footer className="bento-footer"><span><span className="footer-dot" /> ALL SYSTEMS NOMINAL</span><span>NOTHING OS / 03</span></footer>
        </motion.div>}
      </AnimatePresence>
    </div>
    <div className="theme-control" data-interactive onMouseEnter={() => window.glyph.pointer(true)}><button className="icon-button" aria-label="Toggle theme" onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); window.glyph.setTheme(next) }}>{theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}</button></div>
  </main>
}
