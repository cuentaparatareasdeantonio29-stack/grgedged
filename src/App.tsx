/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CONTROL TECH SOLUTIONS v2.0 - Dashboard de Control y Simulador Virtual en Tiempo Real
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  LogOut,
  User,
  Mail,
  Key,
  CreditCard,
  Bell,
  Sliders,
  Volume2,
  VolumeX,
  RefreshCw,
  Cpu,
  Radio,
  FileCode,
  Download,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { sound } from './utils/audio';
import { SevenSegmentDisplay } from './components/SevenSegmentDisplay';
import { DoorServoVisualizer } from './components/DoorServoVisualizer';
import { VirtualRoomBulb } from './components/VirtualRoomBulb';
import { KerasAiMonitor } from './components/KerasAiMonitor';
import { SerialTerminal, SerialLogEntry } from './components/SerialTerminal';
import { BluetoothBulbController } from './components/BluetoothBulbController';

// Registered Authorized Users with Corporate Emails
interface UserAccount {
  name: string;
  email: string;
  pass: string;
  role: string;
  avatar: string;
}

const VALID_USERS: UserAccount[] = [
  { name: 'ANTONIO', email: 'antonio@controltech.com', pass: '123', role: 'Ingeniero Jefe en Domótica & IoT', avatar: '👨‍💻' },
  { name: 'DANAIRIS', email: 'danairis@controltech.com', pass: '123', role: 'Supervisora de Ciberseguridad', avatar: '👩‍💻' },
  { name: 'FRANCIELYS', email: 'francielys@controltech.com', pass: '123', role: 'Especialista en Habitabilidad & Confort', avatar: '👩‍🔬' },
  { name: 'ORALIS', email: 'oralis@controltech.com', pass: '123', role: 'Operaciones de Hardware & Microcontroladores', avatar: '👩‍🔧' },
  { name: 'DELYANN', email: 'delyann@controltech.com', pass: '123', role: 'Analista de Telemetría & Keras IA', avatar: '👩‍💻' },
  { name: 'DILAN', email: 'dilan@controltech.com', pass: '123', role: 'Técnico de Campo & Redes Inalámbricas', avatar: '👨‍🔧' },
];

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // --- AUDIO MUTED STATE ---
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // --- GLOBAL SYSTEM STATE ---
  const [systemState, setSystemState] = useState<'NORMAL' | 'ALERTA' | 'CRITICO'>('NORMAL');
  const [isServoFault, setIsServoFault] = useState<boolean>(false);
  const [isSensorBusFault, setIsSensorBusFault] = useState<boolean>(false);

  // --- ACCESS CONTROL (RC522 + SERVO) ---
  const [doorOpen, setDoorOpen] = useState<boolean>(false);
  const [servoAngle, setServoAngle] = useState<number>(0);
  const [rfidLedStatus, setRfidLedStatus] = useState<'IDLE' | 'GRANTED' | 'DENIED'>('IDLE');
  const [customUid, setCustomUid] = useState<string>('6A 4F C9 80');
  const [accessLogs, setAccessLogs] = useState<
    Array<{ id: string; uid: string; status: 'AUTORIZADO' | 'DENEGADO'; time: string; user?: string }>
  >([
    {
      id: 'log-init-1',
      uid: '6A 4F C9 80',
      status: 'AUTORIZADO',
      time: '08:14:02',
      user: 'Tarjeta Maestra',
    },
  ]);

  // --- DOORBELL & ANTI-SPAM (SW-420 + 7-SEGMENT DISPLAY) ---
  const [antiSpamCountdown, setAntiSpamCountdown] = useState<number>(0);
  const [isDoorbellBlocked, setIsDoorbellBlocked] = useState<boolean>(false);
  const [vibrationIntensity, setVibrationIntensity] = useState<number>(0);
  const [doorbellHitsCount, setDoorbellHitsCount] = useState<number>(0);
  const [unauthorizedScanCount, setUnauthorizedScanCount] = useState<number>(0);

  // --- HABITABILITY & LIGHTING (HC-SR04 + LDR + LED) ---
  const [presenceDetected, setPresenceDetected] = useState<boolean>(false);
  const [distanceCm, setDistanceCm] = useState<number>(120);
  const [darknessPercent, setDarknessPercent] = useState<number>(65);
  const [autoOffSeconds, setAutoOffSeconds] = useState<number>(10);

  // --- SERIAL MONITOR TELEMETRY ---
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  // Helper to add serial log
  const addSerialLog = useCallback(
    (
      source: SerialLogEntry['source'],
      level: SerialLogEntry['level'],
      message: string
    ) => {
      const now = Date.now();
      const timestampMs = now - startTimeRef.current;
      const date = new Date(now);
      const timeStr = date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');

      setSerialLogs((prev) => [
        ...prev.slice(-120), // keep last 120 logs
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestampMs,
          timeStr,
          source,
          level,
          message,
        },
      ]);
    },
    []
  );

  // Initial boot log
  useEffect(() => {
    addSerialLog('SISTEMA', 'INFO', 'Iniciando CONTROL TECH SOLUTIONS Domotic OS v2.0...');
    addSerialLog('SISTEMA', 'INFO', 'Cargando módulos: RC522 (SPI), SG90 (Pin D3), SW-420 (Pin D2), HC-SR04, LDR (A0)...');
    addSerialLog('SISTEMA', 'SUCCESS', 'Hardware inicializado. Monitor UART listo a 115200 baudios.');
  }, [addSerialLog]);

  // Toggle Sound mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.isMuted = next;
    sound.playClick();
  };

  // --- LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setIsLoggingIn(true);
    setLoginError(null);

    const cleanInput = loginUsername.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    setTimeout(() => {
      const matchedUser = VALID_USERS.find(
        (u) =>
          (u.email.toLowerCase() === cleanInput || u.name.toLowerCase() === cleanInput) &&
          u.pass === cleanPass
      );

      if (matchedUser) {
        sound.playAccessGranted();
        setCurrentUser(matchedUser.name);
        setCurrentUserEmail(matchedUser.email);
        setUserRole(matchedUser.role);
        setLoginError(null);
        addSerialLog(
          'SISTEMA',
          'SUCCESS',
          `Sesión iniciada con éxito: [${matchedUser.name} <${matchedUser.email}>] - Rol: ${matchedUser.role}`
        );
      } else {
        sound.playAccessDenied();
        setLoginError('ACCESO DENEGADO: Correo corporativo o contraseña incorrectos.');
        addSerialLog(
          'SISTEMA',
          'ERROR',
          `Fallo de autenticación para credencial ingresada: "${loginUsername}"`
        );
      }
      setIsLoggingIn(false);
    }, 350);
  };

  const handleLogout = () => {
    sound.playClick();
    addSerialLog('SISTEMA', 'INFO', `Usuario [${currentUser}] ha cerrado la sesión.`);
    setCurrentUser(null);
    setCurrentUserEmail('');
    setUserRole('');
    setLoginPassword('');
  };

  // --- ACCESS CONTROL ACTIONS ---
  const triggerMasterRfidScan = () => {
    if (isServoFault) {
      sound.playAccessDenied();
      setSystemState('CRITICO');
      addSerialLog(
        'SERVO',
        'ERROR',
        'BLOQUEO: Intento de apertura con servomotor en estado de FALLO CRÍTICO.'
      );
      return;
    }

    sound.playAccessGranted();
    sound.playServoMotor(1200);
    setRfidLedStatus('GRANTED');
    setDoorOpen(true);
    setServoAngle(90);

    const timeStr = new Date().toTimeString().split(' ')[0];
    setAccessLogs((prev) => [
      {
        id: `acc-${Date.now()}`,
        uid: '6A 4F C9 80',
        status: 'AUTORIZADO',
        time: timeStr,
        user: 'Tarjeta Maestra Oficial',
      },
      ...prev.slice(0, 15),
    ]);

    addSerialLog(
      'RC522',
      'SUCCESS',
      'RFID: UID detectado [6A 4F C9 80] -> AUTORIZADO. Activando Pin D3 (PWM 90°).'
    );

    // Auto-close door after 3 seconds
    setTimeout(() => {
      sound.playServoMotor(800);
      setDoorOpen(false);
      setServoAngle(0);
      setRfidLedStatus('IDLE');
      addSerialLog(
        'SERVO',
        'INFO',
        'Temporizador de 3s expirado. Servomotor retornando a 0° (Puerta Cerrada).'
      );
    }, 3000);
  };

  const triggerDeniedRfidScan = () => {
    sound.playAccessDenied();
    setRfidLedStatus('DENIED');
    setSystemState('ALERTA');
    setUnauthorizedScanCount((c) => c + 1);

    const timeStr = new Date().toTimeString().split(' ')[0];
    const fakeUid = 'F3 9B 11 4A';
    setAccessLogs((prev) => [
      {
        id: `acc-${Date.now()}`,
        uid: fakeUid,
        status: 'DENEGADO',
        time: timeStr,
        user: 'Tarjeta No Registrada',
      },
      ...prev.slice(0, 15),
    ]);

    addSerialLog(
      'RC522',
      'ERROR',
      `RFID: UID rechazado [${fakeUid}] -> NO AUTORIZADO. Estado cambiado a ALERTA.`
    );

    setTimeout(() => {
      setRfidLedStatus('IDLE');
    }, 2500);
  };

  const triggerCustomRfidScan = (uidInput: string) => {
    const formatted = uidInput.trim().toUpperCase();
    if (formatted === '6A 4F C9 80') {
      triggerMasterRfidScan();
    } else {
      sound.playAccessDenied();
      setRfidLedStatus('DENIED');
      setSystemState('ALERTA');
      setUnauthorizedScanCount((c) => c + 1);

      const timeStr = new Date().toTimeString().split(' ')[0];
      setAccessLogs((prev) => [
        {
          id: `acc-${Date.now()}`,
          uid: formatted || 'DESCONOCIDO',
          status: 'DENEGADO',
          time: timeStr,
          user: 'Tarjeta Manual Inválida',
        },
        ...prev.slice(0, 15),
      ]);

      addSerialLog(
        'RC522',
        'WARN',
        `UID manual [${formatted}] no coincide con base de datos autorizada.`
      );

      setTimeout(() => {
        setRfidLedStatus('IDLE');
      }, 2500);
    }
  };

  // --- DOORBELL & SW-420 VIBRATION ---
  const handleVibrationDoorbell = () => {
    if (isDoorbellBlocked || antiSpamCountdown > 0) {
      sound.playSpamBlocked();
      addSerialLog('SW420', 'WARN', 'Pulsación rechazada: Enfriamiento Antispam activo en Display 7-Seg.');
      return;
    }

    sound.playDoorbell();
    setDoorbellHitsCount((c) => c + 1);
    setVibrationIntensity(100);

    // Trigger visual spike and decay
    setTimeout(() => setVibrationIntensity(0), 400);

    addSerialLog(
      'SW420',
      'INFO',
      'Sensor SW-420: Interrupción INT0 detectada (Vibración en puerta). Timbre sonando.'
    );

    // If hits are too frequent, set system to ALERTA
    if (systemState === 'NORMAL') {
      setSystemState('ALERTA');
      addSerialLog('SISTEMA', 'WARN', 'Alerta activada por vibración externa en puerta principal.');
    }

    // Start 5-second anti-spam countdown
    setIsDoorbellBlocked(true);
    setAntiSpamCountdown(5);
  };

  // Countdown timer for 7-segment display (5 -> 0)
  useEffect(() => {
    if (antiSpamCountdown <= 0) {
      setIsDoorbellBlocked(false);
      return;
    }

    const timer = setInterval(() => {
      setAntiSpamCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDoorbellBlocked(false);
          addSerialLog(
            'SW420',
            'SUCCESS',
            'Display 7-Segmentos: Conteo finalizado (0s). Bloqueo Antispam liberado.'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [antiSpamCountdown, addSerialLog]);

  // --- HABITABILITY AUTO-OFF COUNTDOWN (10s) ---
  useEffect(() => {
    // If presence is currently detected, reset countdown
    if (presenceDetected) {
      setAutoOffSeconds(10);
      return;
    }

    // If presence is lost and countdown is > 0, tick down
    if (!presenceDetected && autoOffSeconds > 0) {
      const interval = setInterval(() => {
        setAutoOffSeconds((prev) => {
          if (prev <= 0.2) {
            clearInterval(interval);
            addSerialLog(
              'HC-SR04',
              'INFO',
              'Temporizador 10s cumplido sin presencia. Foco LED apagado automáticamente.'
            );
            return 0;
          }
          return Number((prev - 0.2).toFixed(1));
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [presenceDetected, autoOffSeconds, addSerialLog]);

  // Handle presence toggle with log
  const handleTogglePresence = (detected: boolean) => {
    sound.playClick();
    setPresenceDetected(detected);
    if (detected) {
      addSerialLog(
        'HC-SR04',
        'SUCCESS',
        `Presencia humana confirmada (<50cm). Calculando brillo LED según LDR (${darknessPercent}% osc).`
      );
    } else {
      addSerialLog(
        'HC-SR04',
        'WARN',
        'Presencia humana no detectada. Iniciando temporizador de auto-apagado de 10s.'
      );
    }
  };

  // --- SIMULATION OF SYSTEM CRITICAL FAILURES ---
  const toggleServoFault = () => {
    sound.playClick();
    const next = !isServoFault;
    setIsServoFault(next);
    if (next) {
      setSystemState('CRITICO');
      sound.playAlarm(true);
      addSerialLog('SERVO', 'ERROR', 'SIMULACIÓN: Servomotor atascado / sobrecalentamiento en Pin D3.');
    } else {
      addSerialLog('SERVO', 'SUCCESS', 'Fallo de servomotor resuelto.');
      if (!isSensorBusFault) setSystemState('NORMAL');
    }
  };

  const toggleSensorBusFault = () => {
    sound.playClick();
    const next = !isSensorBusFault;
    setIsSensorBusFault(next);
    if (next) {
      setSystemState('CRITICO');
      sound.playAlarm(true);
      addSerialLog(
        'SISTEMA',
        'ERROR',
        'SIMULACIÓN: Desconexión de bus I2C/SPI de sensores periféricos.'
      );
    } else {
      addSerialLog('SISTEMA', 'SUCCESS', 'Conexión de bus de sensores restaurada.');
      if (!isServoFault) setSystemState('NORMAL');
    }
  };

  const resetSystemStateToNormal = () => {
    sound.playClick();
    setSystemState('NORMAL');
    setIsServoFault(false);
    setIsSensorBusFault(false);
    addSerialLog('SISTEMA', 'SUCCESS', 'Restablecimiento manual ejecutado: Sistema en ESTADO NORMAL.');
  };

  // Standalone single HTML generator (as requested in prompt for one-file bundle)
  const downloadStandaloneHtml = () => {
    sound.playClick();
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CONTROL TECH SOLUTIONS v2.0 - Dashboard Domótico</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
body { background: #07090e; color: #e2e8f0; font-family: 'Share Tech Mono', monospace; margin: 0; padding: 20px; }
.card { background: #0d1117; border: 1px solid #00E5FF; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 0 15px rgba(0,229,255,0.2); }
h1, h2 { font-family: 'Orbitron', sans-serif; color: #00FF87; }
button { background: #00E5FF22; color: #00E5FF; border: 1px solid #00E5FF; padding: 8px 16px; font-family: 'Orbitron', sans-serif; cursor: pointer; border-radius: 4px; }
button:hover { background: #00E5FF; color: black; }
.status-pill { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
.normal { background: #00FF8722; color: #00FF87; border: 1px solid #00FF87; }
</style>
</head>
<body>
<h1>CONTROL TECH SOLUTIONS v2.0</h1>
<p>Simulador y Dashboard Domótico Standalone. Usuarios autorizados: ANTONIO, DANAIRIS, FRANCIELYS, ORALIS, DELYANN, DILAN.</p>
<div class="card">
  <h2>ESTADO DEL SISTEMA: <span class="status-pill normal">🟢 OPERATIVO</span></h2>
  <p>Tarjeta Maestra UID: 6A 4F C9 80 | Servomotor Pin D3 | Sensor SW-420 Pin D2</p>
  <button onclick="alert('Sistema en línea y operando normalmente')">Verificar Hardware</button>
</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'control_tech_solutions_v2_dashboard.html';
    a.click();
    URL.revokeObjectURL(url);
    addSerialLog('SISTEMA', 'INFO', 'Archivo HTML standalone exportado con éxito.');
  };

  // --- VIEW 1: LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#07090e] cyber-grid flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Ambient neon radial lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FF87]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo & Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border-2 border-cyan-400 glow-cyan mb-3">
              <Shield className="w-8 h-8 text-[#00E5FF] animate-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-orbitron font-extrabold tracking-wider text-white">
              CONTROL <span className="text-[#00FF87]">TECH</span> SOLUTIONS
            </h1>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-orbitron font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                VERSIÓN 2.0
              </span>
              <span className="text-xs font-tech text-slate-400">
                SISTEMA DOMÓTICO EMPRESARIAL
              </span>
            </div>
          </div>

          {/* Login Card Panel */}
          <div className="cyber-panel rounded-xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <span className="text-xs font-orbitron font-semibold text-slate-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                TERMINAL DE AUTENTICACIÓN
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-tech text-[#00FF87]">
                <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
                ONLINE
              </span>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/80 text-rose-300 text-xs font-tech flex items-start gap-2.5 glow-red animate-bounce">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-orbitron font-bold">ACCESO DENEGADO</div>
                  <div className="text-[11px] text-rose-200/90">{loginError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-tech text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Correo Electrónico Corporativo</span>
                  <span className="text-[10px] text-cyan-400 font-mono">@controltech.com</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="usuario@controltech.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm font-tech text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-tech text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña de Seguridad
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm font-tech text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-[#00FF87] hover:from-cyan-400 hover:to-[#00FF87] text-black font-orbitron font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-lg glow-green cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    AUTENTICANDO...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    INGRESAR AL DASHBOARD
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 cyber-grid flex flex-col">
      {/* 1. TOP NAV BAR */}
      <header className="sticky top-0 z-50 bg-[#0a0d14]/95 border-b border-cyan-500/30 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-cyan-400 glow-cyan flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-orbitron font-black tracking-wider text-white">
                  CONTROL <span className="text-[#00FF87]">TECH</span> SOLUTIONS
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-orbitron font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  v2.0
                </span>
              </div>
              <div className="text-[11px] font-tech text-slate-400">
                Dashboard de Control y Simulador Virtual en Tiempo Real
              </div>
            </div>
          </div>

          {/* Global System State Badge & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* System State Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-orbitron font-bold tracking-wide transition-all duration-300 ${
                systemState === 'NORMAL'
                  ? 'bg-emerald-950/60 border-[#00FF87]/50 text-[#00FF87] glow-green'
                  : systemState === 'ALERTA'
                  ? 'bg-amber-950/60 border-amber-400/60 text-amber-300 glow-yellow animate-pulse'
                  : 'bg-rose-950/60 border-rose-500/80 text-rose-300 glow-red animate-pulse'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  systemState === 'NORMAL'
                    ? 'bg-[#00FF87]'
                    : systemState === 'ALERTA'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {systemState === 'NORMAL'
                  ? '🟢 ESTADO NORMAL'
                  : systemState === 'ALERTA'
                  ? '🟡 ESTADO ALERTA'
                  : '🔴 ESTADO CRÍTICO'}
              </span>
            </div>

            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Activar Sonidos Sintéticos' : 'Silenciar'}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 cursor-pointer transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00FF87]" />}
            </button>

            {/* Standalone HTML Exporter */}
            <button
              type="button"
              onClick={downloadStandaloneHtml}
              title="Descargar archivo HTML Todo-En-Uno autónomo"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-tech text-cyan-300 hover:bg-slate-800 hover:border-cyan-400 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar HTML</span>
            </button>

            {/* Active User Info & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-orbitron font-semibold text-slate-200">
                  {currentUser}
                </div>
                <div className="text-[10px] font-tech text-cyan-400 truncate max-w-[200px]">
                  {currentUserEmail}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/50 text-rose-300 font-orbitron text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. SYSTEM SIMULATION BAR (For testing Normal, Alert, Critical states) */}
      <div className="bg-[#0b0e17] border-b border-slate-800 px-4 py-2 text-xs font-tech">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-semibold">SIMULADOR DE EVENTOS Y FALLOS:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleServoFault}
              className={`px-2.5 py-1 rounded border text-xs font-tech transition-colors cursor-pointer flex items-center gap-1.5 ${
                isServoFault
                  ? 'bg-rose-950 border-rose-500 text-rose-300 glow-red'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{isServoFault ? 'Fallo Servo: ACTIVADO' : 'Forzar Fallo Servomotor'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSensorBusFault}
              className={`px-2.5 py-1 rounded border text-xs font-tech transition-colors cursor-pointer flex items-center gap-1.5 ${
                isSensorBusFault
                  ? 'bg-rose-950 border-rose-500 text-rose-300 glow-red'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              <span>{isSensorBusFault ? 'Bus I2C/SPI: DESCONECTADO' : 'Simular Desconexión Bus'}</span>
            </button>

            {systemState !== 'NORMAL' && (
              <button
                type="button"
                onClick={resetSystemStateToNormal}
                className="px-2.5 py-1 rounded bg-[#00FF87]/20 border border-[#00FF87] text-[#00FF87] text-xs font-tech font-bold hover:bg-[#00FF87]/30 transition-colors cursor-pointer flex items-center gap-1 glow-green"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Restablecer a ESTADO NORMAL</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE GRID CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        {/* ROW 1: ACCESS CONTROL & DOORBELL ANTISPAM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SUBSYSTEM 1: CONTROL DE ACCESO (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between cyber-panel rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-orbitron font-bold tracking-wide text-white">
                  1. CONTROL DE ACCESO (ENTRADA PRINCIPAL)
                </h2>
              </div>
              <div className="text-[11px] font-tech text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">
                RC522 (SPI) + SG90 (Pin D3)
              </div>
            </div>

            {/* Visual Door and Servo mechanism */}
            <DoorServoVisualizer
              isOpen={doorOpen}
              angle={servoAngle}
              isFailed={isServoFault}
            />

            {/* RFID Scanner Controls */}
            <div className="mt-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-tech">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  LECTOR RFID RC522 (13.56 MHz)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">LED Testigo:</span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      rfidLedStatus === 'GRANTED'
                        ? 'bg-[#00FF87] glow-green animate-ping'
                        : rfidLedStatus === 'DENIED'
                        ? 'bg-rose-500 glow-red animate-ping'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400">
                    {rfidLedStatus === 'GRANTED'
                      ? 'VERDE (ACCESO OK)'
                      : rfidLedStatus === 'DENIED'
                      ? 'ROJO (ERROR)'
                      : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for RFID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={triggerMasterRfidScan}
                  disabled={isServoFault}
                  className="py-2.5 px-3 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-[#00FF87]/60 text-[#00FF87] text-xs font-orbitron font-bold flex items-center justify-center gap-2 transition-all cursor-pointer glow-green disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00FF87]" />
                  <span>Escanear Tarjeta Maestra (UID: 6A 4F C9 80)</span>
                </button>

                <button
                  type="button"
                  onClick={triggerDeniedRfidScan}
                  className="py-2.5 px-3 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/70 text-rose-300 text-xs font-orbitron font-bold flex items-center justify-center gap-2 transition-all cursor-pointer glow-red"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Escanear Tarjeta Denegada / Falsa</span>
                </button>
              </div>

              {/* Manual UID input for custom testing */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs font-tech">
                <span className="text-slate-400">UID Manual:</span>
                <input
                  type="text"
                  value={customUid}
                  onChange={(e) => setCustomUid(e.target.value)}
                  placeholder="Ej: 6A 4F C9 80"
                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-cyan-300 font-mono text-xs w-36 uppercase focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => triggerCustomRfidScan(customUid)}
                  className="px-3 py-1 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 transition-colors cursor-pointer"
                >
                  Simular Escaneo
                </button>
              </div>
            </div>

            {/* Real-time Access Log Table */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs font-tech text-slate-400 mb-1.5">
                <span>REGISTRO HISTÓRICO DE ACCESOS (ÚLTIMOS INTENTOS):</span>
                <span>{accessLogs.length} registros</span>
              </div>
              <div className="bg-slate-950/90 rounded-lg border border-slate-800 max-h-28 overflow-y-auto font-tech text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-1 px-2.5">Hora</th>
                      <th className="py-1 px-2.5">UID Tarjeta</th>
                      <th className="py-1 px-2.5">Resultado</th>
                      <th className="py-1 px-2.5">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-1 px-2.5 text-slate-400 font-mono">{log.time}</td>
                        <td className="py-1 px-2.5 text-cyan-300 font-mono font-bold">{log.uid}</td>
                        <td className="py-1 px-2.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              log.status === 'AUTORIZADO'
                                ? 'bg-[#00FF87]/20 text-[#00FF87]'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-1 px-2.5 text-slate-300 truncate">{log.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SUBSYSTEM 2: ALERTA Y TIMBRE ANTISPAM (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between cyber-panel rounded-xl p-5 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-orbitron font-bold tracking-wide text-white">
                    2. TIMBRE & ALERTA ANTISPAM
                  </h2>
                </div>
                <div className="text-[11px] font-tech text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  SW-420 (INT0 D2) | Buzzer (D5)
                </div>
              </div>

              {/* 7-Segment Display Panel */}
              <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-orbitron text-slate-300 tracking-wider mb-2">
                  TEMPORIZADOR COOLDOWN ANTISPAM
                </div>

                <SevenSegmentDisplay
                  value={antiSpamCountdown}
                  size="md"
                  glowColor={antiSpamCountdown > 0 ? '#00E5FF' : '#334155'}
                />

                <div className="mt-2 text-xs font-tech">
                  {antiSpamCountdown > 0 ? (
                    <span className="text-amber-400 font-bold animate-pulse">
                      BLOQUEO ACTIVO: Esperando {antiSpamCountdown}s para desbloquear...
                    </span>
                  ) : (
                    <span className="text-[#00FF87] font-semibold">
                      SISTEMA LISTO: Sin bloqueo antispam activo.
                    </span>
                  )}
                </div>
              </div>

              {/* Vibration Sensor Trigger Button */}
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleVibrationDoorbell}
                  disabled={isDoorbellBlocked}
                  className={`w-full py-4 px-4 rounded-xl font-orbitron font-bold text-sm tracking-wide uppercase transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                    isDoorbellBlocked
                      ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black glow-yellow'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className={`w-5 h-5 ${isDoorbellBlocked ? 'text-slate-600' : 'text-black'}`} />
                    <span>{isDoorbellBlocked ? 'TIMBRE BLOQUEADO (ANTISPAM)' : 'GOLPEAR PUERTA / TOCAR TIMBRE'}</span>
                  </div>
                  <span className="text-[10px] font-tech text-black/80 font-normal">
                    {isDoorbellBlocked
                      ? `Rechazando spam (restan ${antiSpamCountdown}s)`
                      : 'Sensor piezoeléctrico SW-420 en Pin D2'}
                  </span>
                </button>

                {/* Vibration Gauge / Graphic Bar */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-xs font-tech space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Intensidad de Impacto Mecánico:</span>
                    <span className="text-cyan-300 font-mono font-bold">
                      {vibrationIntensity > 0 ? 'PIEZO SPIKE (1024)' : 'REPOSO (0)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-amber-400 h-full transition-all duration-200"
                      style={{
                        width: `${vibrationIntensity}%`,
                        backgroundColor: vibrationIntensity > 50 ? '#FF2E93' : '#FFD166',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    <span>Total Pulsaciones: {doorbellHitsCount}</span>
                    <span className="text-amber-400">Protección antispam de 5s activada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Pin info box */}
            <div className="mt-4 p-2.5 rounded bg-black/40 border border-slate-800/80 text-[11px] font-tech text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Cpu className="w-3.5 h-3.5" />
                Interrupción Arduino:
              </span>
              <span>attachInterrupt(digitalPinToInterrupt(2), sw420_ISR, FALLING)</span>
            </div>
          </div>
        </div>

        {/* ROW 2: BLUETOOTH INALÁMBRICO & CONTROL DE FOCO */}
        <BluetoothBulbController onLogSerial={addSerialLog} />

        {/* ROW 3: HABITABILITY & SMART LIGHTING */}
        <div className="cyber-panel rounded-xl p-5 shadow-xl">
          <VirtualRoomBulb
            presenceDetected={presenceDetected}
            onTogglePresence={handleTogglePresence}
            darknessPercent={darknessPercent}
            onChangeDarkness={setDarknessPercent}
            distanceCm={distanceCm}
            onChangeDistance={setDistanceCm}
            autoOffSeconds={autoOffSeconds}
          />
        </div>

        {/* ROW 3: KERAS AI & BIOSCIENCE TELEMETRY */}
        <div className="cyber-panel rounded-xl p-5 shadow-xl">
          <KerasAiMonitor
            accessAttemptsCount={accessLogs.length}
            doorbellSpamCount={doorbellHitsCount}
            unauthorizedCount={unauthorizedScanCount}
            darknessPercent={darknessPercent}
            presenceDetected={presenceDetected}
            systemState={systemState}
          />
        </div>

        {/* ROW 4: LIVE TERMINAL / SERIAL MONITOR */}
        <div className="cyber-panel rounded-xl p-5 shadow-xl">
          <SerialTerminal
            logs={serialLogs}
            onClear={() => {
              setSerialLogs([]);
              sound.playClick();
            }}
          />
        </div>
      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-slate-800 bg-[#06080e] py-4 px-4 text-xs font-tech text-slate-500 mt-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00FF87] font-orbitron font-bold">CONTROL TECH SOLUTIONS v2.0</span>
            <span>— Dashboard de Control y Simulador Virtual en Tiempo Real</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Microcontrolador: ATmega328P / ESP32</span>
            <span>Audio: Web Audio API Sintético</span>
            <span>Operador Activo: <strong className="text-cyan-300">{currentUser}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
