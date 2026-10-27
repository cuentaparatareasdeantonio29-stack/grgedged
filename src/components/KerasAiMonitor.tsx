import React, { useState } from 'react';
import { Cpu, Brain, Activity, ShieldCheck, AlertTriangle, Layers, Dna, Gauge } from 'lucide-react';

interface KerasAiMonitorProps {
  accessAttemptsCount: number;
  doorbellSpamCount: number;
  unauthorizedCount: number;
  darknessPercent: number;
  presenceDetected: boolean;
  systemState: 'NORMAL' | 'ALERTA' | 'CRITICO';
}

export const KerasAiMonitor: React.FC<KerasAiMonitorProps> = ({
  accessAttemptsCount,
  doorbellSpamCount,
  unauthorizedCount,
  darknessPercent,
  presenceDetected,
  systemState,
}) => {
  const [activeTab, setActiveTab] = useState<'keras' | 'bioscience'>('keras');

  // Compute simulated AI inference based on real session metrics
  const spamRisk = Math.min(doorbellSpamCount * 22, 95);
  const intrusionRisk = Math.min(unauthorizedCount * 35, 98);
  const normalScore = Math.max(
    100 - spamRisk - intrusionRisk - (systemState === 'CRITICO' ? 70 : 0),
    2
  );

  // Bioscience metrics for smart home / cleanroom air & biological safety
  const bioAerosolPpm = Math.max(12, Math.round(18 + (presenceDetected ? 14 : 0) + (darknessPercent > 70 ? 8 : 0)));
  const bioSafetyScore = systemState === 'CRITICO' ? 62 : systemState === 'ALERTA' ? 84 : 98.4;
  const pm25 = (8.4 + (presenceDetected ? 3.1 : 0)).toFixed(1);

  return (
    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 overflow-hidden">
      {/* Header with Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-orbitron tracking-wider text-slate-200">
            INTELIGENCIA ARTIFICIAL & CIENCIA DOMÓTICA
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-tech">
          <button
            type="button"
            onClick={() => setActiveTab('keras')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'keras'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>KERAS NEURAL NET</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bioscience')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bioscience'
                ? 'bg-emerald-500/20 text-[#00FF87] border border-[#00FF87]/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>BIO-AMBIENTE & SCIENCE</span>
          </button>
        </div>
      </div>

      {activeTab === 'keras' ? (
        <div className="space-y-3">
          {/* Neural Net Architecture Visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Input Vector */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 text-xs font-tech">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                VECTOR DE ENTRADA (X_input)
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Accesos RFID:</span>
                  <span className="font-mono text-cyan-300">{accessAttemptsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Intentos Denegados:</span>
                  <span className="font-mono text-rose-400">{unauthorizedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frecuencia Timbre:</span>
                  <span className="font-mono text-amber-300">{doorbellSpamCount} hits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ocupación / Lux:</span>
                  <span className="font-mono text-slate-300">{presenceDetected ? '1.0' : '0.0'} / {darknessPercent}%</span>
                </div>
              </div>
            </div>

            {/* Hidden Dense Layers */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 text-xs font-tech flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  TOPOLOGÍA KERAS (SEQUENTIAL)
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                  <div>Dense_1 (16 neuronas, ReLU)</div>
                  <div>Dropout (0.20 rate)</div>
                  <div>Dense_2 (8 neuronas, ReLU)</div>
                  <div>Dense_Output (3 clases, Softmax)</div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                <span>Optimizer: Adam (lr=0.001)</span>
                <span className="text-[#00FF87]">Loss: 0.0142</span>
              </div>
            </div>

            {/* Inference Probabilities */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 text-xs font-tech flex flex-col justify-between">
              <div className="text-[10px] text-[#00FF87] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                PREDICCIÓN DE SEGURIDAD
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Patrón Normal:</span>
                    <span className="text-[#00FF87] font-mono font-bold">{normalScore.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00FF87] h-full transition-all duration-500"
                      style={{ width: `${normalScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Riesgo Intrusión:</span>
                    <span className="text-rose-400 font-mono font-bold">{intrusionRisk.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full transition-all duration-500"
                      style={{ width: `${intrusionRisk}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Anomalía Timbre:</span>
                    <span className="text-amber-400 font-mono font-bold">{spamRisk.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${spamRisk}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bioscience Environmental & Biological Health Panel */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-tech">
            {/* Bio-metric 1 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>ÍNDICE BIO-SEGURIDAD</span>
                <Dna className="w-3.5 h-3.5 text-[#00FF87]" />
              </div>
              <div className="text-lg font-orbitron font-bold text-[#00FF87] mt-1">
                {bioSafetyScore}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Estándar ISO 14644-1</div>
            </div>

            {/* Bio-metric 2 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>PARTICULADO PM2.5</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-orbitron font-bold text-cyan-300 mt-1">
                {pm25} µg/m³
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Rango Respirable Óptimo</div>
            </div>

            {/* Bio-metric 3 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>BIO-AEROSOL / CO₂</span>
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-orbitron font-bold text-amber-300 mt-1">
                {bioAerosolPpm} ppm
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Flujo Ventilación Natural</div>
            </div>

            {/* Bio-metric 4 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>PATÓGENOS VOLÁTILES</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF87]" />
              </div>
              <div className="text-lg font-orbitron font-bold text-[#00FF87] mt-1">
                NEGATIVO
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Monitoreo continuo activo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
