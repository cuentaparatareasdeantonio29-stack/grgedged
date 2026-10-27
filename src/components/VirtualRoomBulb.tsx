import React from 'react';
import { Lightbulb, UserCheck, UserX, Sun, Moon, Cpu, Zap, Activity } from 'lucide-react';

interface VirtualRoomBulbProps {
  presenceDetected: boolean;
  onTogglePresence: (val: boolean) => void;
  darknessPercent: number; // 0 (bright daylight) to 100 (total darkness)
  onChangeDarkness: (val: number) => void;
  distanceCm: number;
  onChangeDistance: (val: number) => void;
  autoOffSeconds: number; // 10s countdown
}

export const VirtualRoomBulb: React.FC<VirtualRoomBulbProps> = ({
  presenceDetected,
  onTogglePresence,
  darknessPercent,
  onChangeDarkness,
  distanceCm,
  onChangeDistance,
  autoOffSeconds,
}) => {
  // PWM calculation: If presence is detected, PWM = darknessPercent * 2.55 (0 to 255)
  // If no presence, PWM is 0!
  const isLightActive = presenceDetected && darknessPercent > 0;
  const pwmValue = isLightActive ? Math.round((darknessPercent / 100) * 255) : 0;
  const brightnessRatio = pwmValue / 255;
  const luxValue = Math.round(1000 * (1 - darknessPercent / 100));
  const ldrAdc = Math.round((darknessPercent / 100) * 1023);

  return (
    <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isLightActive ? 'bg-[#00FF87] glow-green' : 'bg-slate-600'
            }`}
          />
          <span className="text-xs font-orbitron tracking-wider text-slate-300">
            HABITABILIDAD & ILUMINACIÓN INTELIGENTE
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-tech border border-slate-700 bg-slate-900">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-300">HC-SR04 (D7/D8) | LDR (A0) | LED (D6)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Virtual Room Viewport (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between h-72 bg-gradient-to-b from-[#0b0f19] to-[#06080d] rounded-xl border border-slate-800 p-4 relative overflow-hidden">
          {/* Ambient light overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundColor: '#030712',
              opacity: (darknessPercent / 100) * 0.85,
            }}
          />

          {/* Lamp glow effect when active */}
          {isLightActive && (
            <div
              className="absolute left-1/2 top-14 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-300"
              style={{
                width: `${120 + brightnessRatio * 180}px`,
                height: `${120 + brightnessRatio * 180}px`,
                background: `radial-gradient(circle, rgba(255, 209, 102, ${
                  0.35 * brightnessRatio + 0.15
                }) 0%, rgba(0, 255, 135, ${0.15 * brightnessRatio}) 50%, transparent 80%)`,
                filter: 'blur(20px)',
              }}
            />
          )}

          {/* Room Header Info */}
          <div className="relative z-10 flex justify-between items-center text-[11px] font-tech">
            <span className="text-slate-400">HABITACIÓN VIRTUAL #01</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isLightActive
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 text-glow-yellow'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              PWM: {pwmValue}/255 ({Math.round(brightnessRatio * 100)}%)
            </span>
          </div>

          {/* Center Graphic: Smart Lamp Bulb in Room */}
          <div className="relative z-10 flex flex-col items-center justify-center my-2">
            {/* Cord */}
            <div className="w-0.5 h-6 bg-slate-600 mb-0.5" />
            
            {/* Fixture cap */}
            <div className="w-6 h-2 bg-slate-700 rounded-t border border-slate-500" />

            {/* Glowing Bulb Element */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border ${
                  isLightActive
                    ? 'border-amber-300 bg-amber-100 shadow-[0_0_35px_rgba(255,209,102,0.9)]'
                    : 'border-slate-700 bg-slate-900/90 text-slate-600'
                }`}
                style={{
                  boxShadow: isLightActive
                    ? `0 0 ${20 + brightnessRatio * 40}px rgba(255, 209, 102, ${
                        0.5 + brightnessRatio * 0.5
                      })`
                    : 'none',
                }}
              >
                <Lightbulb
                  className={`w-8 h-8 transition-colors duration-200 ${
                    isLightActive
                      ? 'text-amber-600 fill-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              </div>

              {/* Rays */}
              {isLightActive && brightnessRatio > 0.4 && (
                <div className="absolute inset-0 -m-3 animate-pulse pointer-events-none">
                  <div className="w-full h-full rounded-full border border-amber-400/30" />
                </div>
              )}
            </div>

            {/* Presence Silhouette Indicator */}
            <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-tech">
              {presenceDetected ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-[#00FF87]" />
                  <span className="text-[#00FF87]">Presencia Detectada ({distanceCm} cm)</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Sin Presencia Humana</span>
                </>
              )}
            </div>
          </div>

          {/* Footer Auto-Off Countdown Timer */}
          <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-tech">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              Auto-Apagado:
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold ${
                  !presenceDetected && autoOffSeconds < 10
                    ? 'text-amber-400 animate-pulse'
                    : 'text-slate-400'
                }`}
              >
                {presenceDetected ? '10.0s (Reset)' : `${autoOffSeconds.toFixed(1)}s restantes`}
              </span>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${presenceDetected ? 100 : (autoOffSeconds / 10) * 100}%`,
                    backgroundColor: autoOffSeconds <= 3 ? '#FF2E93' : '#00E5FF',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls & Sensor Inputs (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3">
          {/* Sensor 1: HC-SR04 Ultrasonic */}
          <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    presenceDetected ? 'bg-[#00FF87] animate-ping' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-orbitron font-semibold text-slate-200">
                  SENSOR ULTRASÓNICO HC-SR04
                </span>
              </div>
              <span className="text-[10px] font-tech text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                TRIG: D7 | ECHO: D8
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const nextState = !presenceDetected;
                  onTogglePresence(nextState);
                  if (nextState && distanceCm > 50) {
                    onChangeDistance(35);
                  } else if (!nextState && distanceCm <= 50) {
                    onChangeDistance(110);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-orbitron text-xs transition-all cursor-pointer ${
                  presenceDetected
                    ? 'bg-[#00FF87]/20 border border-[#00FF87] text-[#00FF87] glow-green'
                    : 'bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-slate-300'
                }`}
              >
                {presenceDetected ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    PRESENCIA ACTIVA (&lt;50cm)
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    SIMULAR DETECCIÓN DE PRESENCIA
                  </>
                )}
              </button>

              <div className="text-right text-[11px] font-tech min-w-24">
                <div className="text-slate-400">DISTANCIA</div>
                <div className="text-cyan-300 font-bold font-mono text-sm">{distanceCm} cm</div>
              </div>
            </div>

            {/* Slider for HC-SR04 exact distance */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-tech text-slate-400">
                <span>Rango calibrado: 10cm - 200cm</span>
                <span className={distanceCm <= 50 ? 'text-[#00FF87] font-bold' : 'text-slate-400'}>
                  {distanceCm <= 50 ? 'Detección Positiva (≤ 50cm)' : 'Fuera de Rango (> 50cm)'}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                value={distanceCm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeDistance(val);
                  onTogglePresence(val <= 50);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Sensor 2: LDR Photoresistor */}
          <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-orbitron font-semibold text-slate-200">
                  FOTORRESISTENCIA LDR AMBIENTAL
                </span>
              </div>
              <span className="text-[10px] font-tech text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                ENTRADA ADC: PIN A0
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-tech text-slate-300">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>0% Día / Mucha Luz ({luxValue} Lux)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span>100% Noche / Oscuridad Total</span>
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                value={darknessPercent}
                onChange={(e) => onChangeDarkness(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-gradient-to-r from-amber-400 via-slate-600 to-indigo-950 rounded-lg"
              />
              <div className="flex justify-between text-[11px] font-tech">
                <span className="text-slate-400">
                  Nivel Oscuridad: <strong className="text-amber-300">{darknessPercent}%</strong>
                </span>
                <span className="text-slate-400">
                  Lectura ADC: <strong className="text-cyan-300">{ldrAdc} / 1023</strong>
                </span>
              </div>
            </div>

            {/* Smart Logic Explanatory Box */}
            <div className="p-2 rounded bg-black/40 border border-slate-800 text-[11px] font-tech flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#00FF87]" />
                Algoritmo Domótico:
              </span>
              <span className="text-slate-300">
                {!presenceDetected
                  ? 'Sin personas -> PWM = 0 (Ahorro 100%)'
                  : `Presencia activa -> PWM = Inverso LDR (${pwmValue}/255)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
