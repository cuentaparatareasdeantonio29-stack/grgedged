import React from 'react';
import { ShieldCheck, Lock, Unlock, Cpu } from 'lucide-react';

interface DoorServoVisualizerProps {
  isOpen: boolean;
  angle: number; // 0 to 90 degrees
  isFailed: boolean;
}

export const DoorServoVisualizer: React.FC<DoorServoVisualizerProps> = ({
  isOpen,
  angle,
  isFailed,
}) => {
  return (
    <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-4 overflow-hidden group">
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#00E5FF_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isFailed
                ? 'bg-rose-500 animate-ping'
                : isOpen
                ? 'bg-[#00FF87] glow-green'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-orbitron tracking-wider text-slate-300">
            SERVOMOTOR SG90 ACCESO
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-tech border border-slate-700 bg-slate-900">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-300">PIN D3 (PWM)</span>
        </div>
      </div>

      {/* Main visual graphic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Door 2D/3D Graphic Representation */}
        <div className="relative h-44 bg-slate-900/90 rounded-lg border border-slate-800 p-3 flex flex-col justify-between overflow-hidden">
          {/* Top schematic labels */}
          <div className="flex justify-between items-center text-[10px] font-tech text-slate-400">
            <span>MARCO DE ACCESO (ACC-PORTAL-01)</span>
            <span
              className={`font-semibold ${
                isFailed
                  ? 'text-rose-400'
                  : isOpen
                  ? 'text-[#00FF87]'
                  : 'text-rose-400'
              }`}
            >
              {isFailed ? 'FALLO MECÁNICO' : isOpen ? 'PASO HABILITADO' : 'ACCESO BLOQUEADO'}
            </span>
          </div>

          {/* Isometric / Top-Down Door Mechanism */}
          <div className="relative w-full h-28 flex items-center justify-center">
            {/* Wall / Door Frame */}
            <div className="absolute w-52 h-20 border-2 border-dashed border-slate-700 rounded-md flex items-center justify-between px-2 bg-slate-950/40">
              {/* Left Hinge Pivot Point with SG90 gear */}
              <div className="relative z-20 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                    isOpen ? 'border-[#00FF87] bg-[#00FF87]/20' : 'border-rose-500 bg-rose-500/20'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-cyan-400 transition-transform duration-500 ease-out"
                    style={{ transform: `rotate(${angle}deg)` }}
                  />
                </div>
                <span className="text-[9px] font-tech text-slate-400 mt-1">EJE 0°</span>
              </div>

              {/* Door Leaf (Swings dynamically according to angle) */}
              <div
                className="absolute left-8 h-3.5 rounded-r origin-left transition-all duration-700 ease-out shadow-lg flex items-center justify-end px-2"
                style={{
                  width: '120px',
                  transform: `rotate(-${angle}deg)`,
                  backgroundColor: isFailed ? '#FF2E93' : isOpen ? '#00FF87' : '#e11d48',
                  boxShadow: isOpen
                    ? '0 0 15px rgba(0, 255, 135, 0.5)'
                    : '0 0 15px rgba(225, 29, 72, 0.5)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black/70 mr-1" />
                <span className="text-[9px] font-orbitron font-bold text-black select-none">
                  {isOpen ? 'PUERTA 90°' : 'CERRADURA 0°'}
                </span>
              </div>

              {/* Right Strike Plate / Magnetic lock */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-4 h-6 rounded border transition-colors ${
                    isOpen
                      ? 'border-slate-600 bg-slate-800'
                      : 'border-rose-500 bg-rose-950/80'
                  }`}
                />
                <span className="text-[9px] font-tech text-slate-400 mt-1">PESTILLO</span>
              </div>
            </div>

            {/* Sweep arc path indicator */}
            <svg className="absolute w-52 h-20 pointer-events-none" viewBox="0 0 200 80">
              <path
                d="M 32 40 A 60 60 0 0 1 80 15"
                fill="none"
                stroke={isOpen ? '#00FF87' : '#334155'}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Footer state indicator */}
          <div className="flex justify-between items-center text-[10px] font-tech border-t border-slate-800 pt-1">
            <span className="text-slate-400">POSICIÓN SERVO:</span>
            <span className="text-cyan-300 font-mono font-bold">{angle}° / 90° PWM</span>
          </div>
        </div>

        {/* Status Card & Servo Specs */}
        <div className="flex flex-col justify-between h-44 gap-2">
          {/* Main Large Status Badge */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-300 ${
              isFailed
                ? 'bg-rose-950/40 border-rose-500/60 glow-red'
                : isOpen
                ? 'bg-emerald-950/40 border-[#00FF87]/50 glow-green'
                : 'bg-rose-950/30 border-rose-600/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  isFailed
                    ? 'bg-rose-500/20 text-rose-400'
                    : isOpen
                    ? 'bg-[#00FF87]/20 text-[#00FF87]'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isFailed ? (
                  <Lock className="w-6 h-6 animate-pulse" />
                ) : isOpen ? (
                  <Unlock className="w-6 h-6" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase font-tech text-slate-400 tracking-wider">
                  ESTADO CERROJO
                </div>
                <div
                  className={`text-lg font-orbitron font-bold tracking-wide ${
                    isFailed
                      ? 'text-rose-400'
                      : isOpen
                      ? 'text-[#00FF87]'
                      : 'text-rose-400'
                  }`}
                >
                  {isFailed ? 'FALLO (ATASCADO)' : isOpen ? 'ABIERTA (90°)' : 'CERRADA (0°)'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                  isOpen
                    ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isOpen ? 'DESENCLAVADO' : 'ENCLAVADO'}
              </span>
            </div>
          </div>

          {/* Microcontroller Pin Telemetry */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-[11px] font-tech space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Señal PWM Arduino:</span>
              <span className="text-cyan-300">
                {isOpen ? '2.0ms (90°)' : '1.0ms (0°)'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Torque Servomotor:</span>
              <span className="text-slate-300">1.8 kg·cm @ 5V</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Temporizador Cierre:</span>
              <span className="text-amber-300">
                {isOpen ? 'Auto-cierre en 3.0s' : 'En reposo'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
