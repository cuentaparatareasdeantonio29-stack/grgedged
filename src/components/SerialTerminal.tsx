import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Trash2, Pause, Play, Download, Copy, Check } from 'lucide-react';

export interface SerialLogEntry {
  id: string;
  timestampMs: number;
  timeStr: string;
  source: 'RC522' | 'SERVO' | 'SW420' | 'HC-SR04' | 'LDR' | 'KERAS_AI' | 'SISTEMA' | 'BIO';
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

interface SerialTerminalProps {
  logs: SerialLogEntry[];
  onClear: () => void;
}

export const SerialTerminal: React.FC<SerialTerminalProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterSource === 'ALL') return true;
    if (filterSource === 'ACCESS') return log.source === 'RC522' || log.source === 'SERVO';
    if (filterSource === 'ALERTS') return log.level === 'WARN' || log.level === 'ERROR' || log.source === 'SW420';
    if (filterSource === 'SENSORS') return log.source === 'HC-SR04' || log.source === 'LDR';
    return true;
  });

  const handleCopy = () => {
    const rawText = logs
      .map((l) => `[+${String(l.timestampMs).padStart(6, '0')}ms] [${l.source}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-[#070a0f] border border-cyan-500/30 overflow-hidden font-tech">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-orbitron font-semibold text-cyan-300 tracking-wider">
            MONITOR SERIAL VIRTUAL (COM3 @ 115200 BAUD)
          </span>
          <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse" />
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Filter Pills */}
          <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 text-[11px]">
            {['ALL', 'ACCESS', 'ALERTS', 'SENSORS'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterSource(f)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  filterSource === f
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Pausar desplazamiento' : 'Reanudar desplazamiento'}
            className={`p-1.5 rounded border text-xs cursor-pointer ${
              autoScroll
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            title="Copiar log al portapapeles"
            className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00FF87]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClear}
            title="Limpiar monitor serial"
            className="p-1.5 rounded border border-slate-700 bg-slate-800 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Screen */}
      <div
        ref={containerRef}
        className="h-44 overflow-y-auto p-3 text-[11px] leading-5 space-y-0.5 select-text bg-[#06080d] scanline-effect"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 italic py-2">
            [000000ms] Sistema listo en espera de paquetes de telemetría de sensores...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeTag = `[+${String(log.timestampMs).padStart(6, '0')}ms]`;
            const colorClass =
              log.level === 'SUCCESS'
                ? 'text-[#00FF87]'
                : log.level === 'ERROR'
                ? 'text-rose-400 font-bold'
                : log.level === 'WARN'
                ? 'text-amber-300'
                : 'text-cyan-300';

            return (
              <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/40 px-1 rounded">
                <span className="text-slate-500 shrink-0 font-mono select-none">{timeTag}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] shrink-0 font-mono font-bold ${
                    log.source === 'RC522'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : log.source === 'SW420'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : log.source === 'KERAS_AI'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : log.source === 'SERVO'
                      ? 'bg-emerald-950 text-[#00FF87] border border-emerald-800'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  {log.source}
                </span>
                <span className={`${colorClass} break-all flex-1`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Status Footer */}
      <div className="bg-slate-950 px-3 py-1 text-[10px] text-slate-500 border-t border-slate-900 flex justify-between items-center">
        <span>Transmisión UART activa: 8 bits de datos, 1 bit de parada, sin paridad (8-N-1)</span>
        <span>{filteredLogs.length} eventos registrados</span>
      </div>
    </div>
  );
};
