import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Lightbulb,
  Power,
  Terminal,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Send,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  Radio,
} from 'lucide-react';
import { sound } from '../utils/audio';

// ============================================================================
// CONSTANTES EDITABLES DE COMANDOS ASCII PARA ARDUINO (TX)
// Modifica estos caracteres si tu sketch de Arduino espera otros comandos
// ============================================================================
export const CMD_LED_ON = '1';        // Carácter ASCII para "Encender LED" (ej. '1' o 'H')
export const CMD_LED_OFF = '0';       // Carácter ASCII para "Apagar LED" (ej. '0' o 'L')
export const CMD_NORMAL_MODE = 'A';   // Carácter ASCII para "Modo Normal (Enviar 'A')"
export const BLUETOOTH_BAUD_RATE = 9600; // Velocidad estándar HC-05 / HC-06 en Serial1

// Declaraciones de tipos locales para Web Serial API (compatibilidad TypeScript)
interface WebSerialPort {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface TerminalLine {
  id: string;
  dir: 'TX' | 'RX' | 'SYS';
  text: string;
  time: string;
}

interface BluetoothBulbControllerProps {
  onLogSerial: (
    source: 'RC522' | 'SERVO' | 'SW420' | 'HC-SR04' | 'LDR' | 'KERAS_AI' | 'SISTEMA' | 'BIO',
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR',
    message: string
  ) => void;
  onResetSystemNormal?: () => void;
}

export const BluetoothBulbController: React.FC<BluetoothBulbControllerProps> = ({
  onLogSerial,
  onResetSystemNormal,
}) => {
  // Soporte de navegador para Web Serial API
  const isWebSerialSupported =
    typeof navigator !== 'undefined' && 'serial' in navigator;

  // Estado de conexión real Web Serial
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [portInfoLabel, setPortInfoLabel] = useState<string>('Puerto Serial HC-05 / HC-06');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Estado visual del actuador LED / Foco
  const [isLedOn, setIsLedOn] = useState<boolean>(false);

  // Consola Terminal Bidireccional (RX / TX)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [appendNewline, setAppendNewline] = useState<boolean>(true);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);

  // Drawer de código Arduino (.ino)
  const [showCodeGuide, setShowCodeGuide] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [codeType, setCodeType] = useState<'serial1' | 'uno'>('serial1');

  // Referencias mutables para ciclo de vida seguro de streams Web Serial
  const portRef = useRef<WebSerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const readableClosedRef = useRef<Promise<void> | null>(null);
  const writableClosedRef = useRef<Promise<void> | null>(null);
  const keepReadingRef = useRef<boolean>(false);

  const getFormattedTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const appendTerminalLine = useCallback((dir: 'TX' | 'RX' | 'SYS', text: string) => {
    setTerminalLines((prev) => [
      ...prev.slice(-200),
      {
        id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dir,
        text,
        time: getFormattedTime(),
      },
    ]);
  }, []);

  // Scroll automático de la consola al recibir o enviar líneas
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Cierre seguro al desmontar el componente
  const closePortSafely = useCallback(async () => {
    keepReadingRef.current = false;

    try {
      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {});
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
      if (readableClosedRef.current) {
        await readableClosedRef.current.catch(() => {});
        readableClosedRef.current = null;
      }
    } catch {
      // Ignorar errores de cancelación de lector
    }

    try {
      if (writerRef.current) {
        await writerRef.current.close().catch(() => {});
        writerRef.current.releaseLock();
        writerRef.current = null;
      }
      if (writableClosedRef.current) {
        await writableClosedRef.current.catch(() => {});
        writableClosedRef.current = null;
      }
    } catch {
      // Ignorar errores de cierre de escritor
    }

    try {
      if (portRef.current) {
        await portRef.current.close().catch(() => {});
        portRef.current = null;
      }
    } catch {
      // Ignorar errores de cierre de puerto
    }

    setIsConnected(false);
    setIsLedOn(false);
  }, []);

  useEffect(() => {
    return () => {
      void closePortSafely();
    };
  }, [closePortSafely]);

  // Bucle continuo de lectura en segundo plano (TextDecoderStream)
  const startReadLoop = async (port: WebSerialPort) => {
    if (!port.readable) return;

    const textDecoder = new TextDecoderStream();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readableClosedRef.current = port.readable.pipeTo(textDecoder.writable as any);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;
    keepReadingRef.current = true;

    let rxBuffer = '';

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          rxBuffer += value;
          const lines = rxBuffer.split(/\r?\n/);
          // Conservar la última línea parcial en el buffer hasta recibir salto de línea
          rxBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length > 0) {
              appendTerminalLine('RX', cleanLine);
              onLogSerial('SISTEMA', 'INFO', `[BT RX] <- ${cleanLine}`);

              // Sincronización inteligente si el Arduino confirma estado del LED
              const upper = cleanLine.toUpperCase();
              if (upper.includes('LED_ON') || upper.includes('RELAY_STATE_1') || upper.includes('ENCENDIDO')) {
                setIsLedOn(true);
              } else if (upper.includes('LED_OFF') || upper.includes('RELAY_STATE_0') || upper.includes('APAGADO')) {
                setIsLedOn(false);
              }
            }
          }
        }
      }

      // Vaciar cualquier remanente en buffer si se cierra el stream
      if (rxBuffer.trim().length > 0) {
        appendTerminalLine('RX', rxBuffer.trim());
      }
    } catch (err) {
      if (keepReadingRef.current) {
        const msg = err instanceof Error ? err.message : 'Error de lectura en puerto serial';
        setErrorAlert(`Conexión interrumpida durante lectura RX: ${msg}`);
        appendTerminalLine('SYS', `Error RX: ${msg}`);
        onLogSerial('SISTEMA', 'ERROR', `Error de lectura Bluetooth Serial: ${msg}`);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {}
    }
  };

  // 1. GESTIÓN DE CONEXIÓN (Web Serial API)
  const handleConnectSerial = async () => {
    setErrorAlert(null);
    sound.playClick();

    if (!isWebSerialSupported) {
      const msg =
        'Tu navegador no soporta la Web Serial API. Por favor utiliza Google Chrome o Microsoft Edge en escritorio.';
      setErrorAlert(msg);
      sound.playAccessDenied();
      onLogSerial('SISTEMA', 'ERROR', msg);
      return;
    }

    setIsConnecting(true);
    onLogSerial(
      'SISTEMA',
      'INFO',
      `Solicitando selección de Puerto Serial Bluetooth (${BLUETOOTH_BAUD_RATE} baudios)...`
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serial = (navigator as any).serial;
      const port: WebSerialPort = await serial.requestPort();

      await port.open({
        baudRate: BLUETOOTH_BAUD_RATE,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      portRef.current = port;

      // Configurar escritor con TextEncoderStream
      if (port.writable) {
        const textEncoder = new TextEncoderStream();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writableClosedRef.current = textEncoder.readable.pipeTo(port.writable as any);
        writerRef.current = textEncoder.writable.getWriter();
      }

      const info = port.getInfo ? port.getInfo() : {};
      const infoText =
        info.usbVendorId !== undefined
          ? `Puerto COM Bluetooth (VID: 0x${info.usbVendorId.toString(16).toUpperCase()})`
          : `Bluetooth SPP Serial @ ${BLUETOOTH_BAUD_RATE} bps`;

      setPortInfoLabel(infoText);
      setIsConnected(true);
      sound.playBluetoothConnected();

      appendTerminalLine('SYS', `Puerto abierto correctamente @ ${BLUETOOTH_BAUD_RATE} baudios.`);
      onLogSerial(
        'SISTEMA',
        'SUCCESS',
        `Bluetooth Serial REAL conectado (${infoText} @ ${BLUETOOTH_BAUD_RATE} baudios).`
      );

      // Iniciar bucle continuo de lectura RX
      void startReadLoop(port);
    } catch (err) {
      const errObj = err as { name?: string; message?: string };
      if (errObj?.name === 'NotFoundError') {
        const cancelMsg =
          'Selección cancelada: No elegiste ningún puerto COM Bluetooth en la ventana del navegador.';
        setErrorAlert(cancelMsg);
        appendTerminalLine('SYS', cancelMsg);
        onLogSerial('SISTEMA', 'WARN', cancelMsg);
      } else if (errObj?.name === 'InvalidStateError' || errObj?.name === 'NetworkError') {
        const busyMsg =
          'No se pudo abrir el puerto Bluetooth. Verifica que no esté en uso por el Monitor Serial del Arduino IDE y que el módulo HC-05/HC-06 esté emparejado.';
        setErrorAlert(busyMsg);
        sound.playAccessDenied();
        appendTerminalLine('SYS', busyMsg);
        onLogSerial('SISTEMA', 'ERROR', busyMsg);
      } else {
        const genericMsg = `Error al conectar Web Serial: ${errObj?.message || 'Error desconocido'}`;
        setErrorAlert(genericMsg);
        sound.playAccessDenied();
        appendTerminalLine('SYS', genericMsg);
        onLogSerial('SISTEMA', 'ERROR', genericMsg);
      }
      await closePortSafely();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectSerial = async () => {
    sound.playClick();
    setErrorAlert(null);
    await closePortSafely();
    appendTerminalLine('SYS', 'Puerto Serial Bluetooth cerrado de forma segura.');
    onLogSerial('SISTEMA', 'WARN', 'Puerto Bluetooth Serial desconectado por el operador.');
  };

  // 2. CONTROLES RÁPIDOS DE HARDWARE (TX)
  const sendSerialCommand = async (cmd: string, label?: string) => {
    if (!isConnected || !writerRef.current) {
      sound.playSpamBlocked();
      const warnMsg = 'Puerto desconectado: Conecta el Bluetooth (Puerto Serial) antes de enviar comandos.';
      setErrorAlert(warnMsg);
      onLogSerial('SISTEMA', 'WARN', warnMsg);
      return;
    }

    setErrorAlert(null);

    try {
      const payload = appendNewline ? `${cmd}\n` : cmd;
      await writerRef.current.write(payload);

      appendTerminalLine('TX', cmd);
      onLogSerial(
        'SISTEMA',
        'SUCCESS',
        `[BT TX] -> '${cmd}'${label ? ` (${label})` : ''} enviado a ${BLUETOOTH_BAUD_RATE} baudios.`
      );

      // Actualizar estado visual local según comando enviado
      if (cmd === CMD_LED_ON) {
        setIsLedOn(true);
        sound.playRelayClick(true);
      } else if (cmd === CMD_LED_OFF) {
        setIsLedOn(false);
        sound.playRelayClick(false);
      } else if (cmd === CMD_NORMAL_MODE) {
        sound.playAccessGranted();
        if (onResetSystemNormal) {
          onResetSystemNormal();
        }
      } else {
        sound.playClick();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fallo al transmitir por puerto serial';
      setErrorAlert(`Error al enviar comando '${cmd}': ${msg}`);
      sound.playAccessDenied();
      appendTerminalLine('SYS', `Error TX: ${msg}`);
      onLogSerial('SISTEMA', 'ERROR', `Error TX Bluetooth: ${msg}`);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCommand.trim();
    if (!trimmed) return;
    await sendSerialCommand(trimmed, 'Comando Manual');
    setCustomCommand('');
  };

  const handleClearConsole = () => {
    sound.playClick();
    setTerminalLines([]);
  };

  // Sketches de referencia para Arduino (Serial1 a 9600 bps)
  const arduinoSerial1Code = `/*
 * CONTROL TECH SOLUTIONS v2.0 - Terminal Bluetooth Serial REAL
 * Para Arduino Mega / Leonardo / Pro Micro (usa Serial1 en pines TX1/RX1)
 * Módulo HC-05 / HC-06 conectado a Serial1 @ 9600 baudios
 */

const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);   // Monitor USB de depuración
  Serial1.begin(9600);    // Módulo Bluetooth HC-05 / HC-06
  Serial1.println("CONTROL_TECH_READY_9600");
}

void loop() {
  if (Serial1.available() > 0) {
    char cmd = Serial1.read();
    if (cmd == '\\n' || cmd == '\\r') return;

    if (cmd == '${CMD_LED_ON}') {
      digitalWrite(LED_PIN, HIGH);
      Serial1.println("ACK: LED_ON (Pin 13 HIGH)");
    } else if (cmd == '${CMD_LED_OFF}') {
      digitalWrite(LED_PIN, LOW);
      Serial1.println("ACK: LED_OFF (Pin 13 LOW)");
    } else if (cmd == '${CMD_NORMAL_MODE}') {
      // Restablecer Arduino a Modo Normal
      Serial1.println("ACK: MODO_NORMAL_ACTIVADO");
    } else {
      Serial1.print("ACK: CMD_RECIBIDO -> ");
      Serial1.println(cmd);
    }
  }
}`;

  const arduinoUnoCode = `/*
 * CONTROL TECH SOLUTIONS v2.0 - Arduino UNO + HC-05 / HC-06
 * Usa SoftwareSerial en Pines D10 (RX) y D11 (TX) @ 9600 baudios
 */
#include <SoftwareSerial.h>

SoftwareSerial SerialBT(10, 11); // RX, TX
const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  SerialBT.begin(9600);
  SerialBT.println("CONTROL_TECH_UNO_READY");
}

void loop() {
  if (SerialBT.available() > 0) {
    char cmd = SerialBT.read();
    if (cmd == '\\n' || cmd == '\\r') return;

    if (cmd == '${CMD_LED_ON}') {
      digitalWrite(LED_PIN, HIGH);
      SerialBT.println("ACK: LED_ON");
    } else if (cmd == '${CMD_LED_OFF}') {
      digitalWrite(LED_PIN, LOW);
      SerialBT.println("ACK: LED_OFF");
    } else if (cmd == '${CMD_NORMAL_MODE}') {
      SerialBT.println("ACK: MODO_NORMAL");
    } else {
      SerialBT.print("ACK: CMD -> ");
      SerialBT.println(cmd);
    }
  }
}`;

  const handleCopyCode = () => {
    const code = codeType === 'serial1' ? arduinoSerial1Code : arduinoUnoCode;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative rounded-xl cyber-panel p-5 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              isConnected ? 'bg-[#00FF87] glow-green animate-pulse' : 'bg-[#FF2E93] glow-red'
            }`}
          />
          <Bluetooth className="w-5 h-5 text-[#00E5FF]" />
          <div>
            <h2 className="text-sm font-orbitron font-bold tracking-wide text-white flex flex-wrap items-center gap-2">
              <span>TERMINAL BLUETOOTH SERIAL REAL (WEB SERIAL API)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-tech bg-cyan-950 text-[#00E5FF] border border-cyan-500/40">
                HC-05 / HC-06 @ {BLUETOOTH_BAUD_RATE} BAUD
              </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador visual en tiempo real del estado de conexión */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-orbitron font-bold tracking-wider uppercase transition-all ${
              isConnected
                ? 'bg-emerald-950/70 border-[#00FF87]/70 text-[#00FF87] glow-green'
                : 'bg-rose-950/70 border-[#FF2E93]/70 text-[#FF2E93] glow-red'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#00FF87] animate-ping' : 'bg-[#FF2E93]'
              }`}
            />
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCodeGuide(!showCodeGuide)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-tech text-cyan-300 hover:border-cyan-400 cursor-pointer transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código Arduino (.ino)</span>
            {showCodeGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Aviso si el navegador NO soporta Web Serial API */}
      {!isWebSerialSupported && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-950/50 border border-[#FFD166]/60 text-amber-200 text-xs font-tech flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FFD166] shrink-0 mt-0.5" />
          <div>
            <div className="font-orbitron font-bold text-[#FFD166] mb-0.5">
              WEB SERIAL API NO DISPONIBLE EN ESTE NAVEGADOR / ENTORNO
            </div>
            <p className="text-amber-100/90 leading-relaxed">
              Tu navegador actual no expone <code className="px-1 py-0.5 rounded bg-black/50 text-cyan-300">navigator.serial</code>.
              Para conectar un módulo Bluetooth HC-05/HC-06 real por puerto COM serial, abre esta aplicación en{' '}
              <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong> de escritorio (sobre HTTPS o localhost).
            </p>
          </div>
        </div>
      )}

      {/* Alerta visual de errores de conexión / cancelación */}
      {errorAlert && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-[#FF2E93]/70 text-rose-200 text-xs font-tech flex items-start justify-between gap-3 glow-red">
          <div className="flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
            <span>{errorAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorAlert(null)}
            className="text-rose-300 hover:text-white text-[11px] font-orbitron uppercase cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Expandable Arduino Code Drawer */}
      {showCodeGuide && (
        <div className="mb-4 p-4 rounded-xl bg-slate-950 border border-cyan-500/40 font-tech text-xs space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">SKETCH HARDWARE REAL (9600 BAUD):</span>
              <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCodeType('serial1')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    codeType === 'serial1'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Arduino Mega / Serial1
                </button>
                <button
                  type="button"
                  onClick={() => setCodeType('uno')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    codeType === 'uno'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Arduino UNO (SoftwareSerial)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 transition-colors cursor-pointer text-xs"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00FF87]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado al portapapeles' : 'Copiar Código .ino'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-lg bg-black/90 border border-slate-800 text-[11px] leading-5 text-emerald-300 overflow-x-auto max-h-56 select-text">
            {codeType === 'serial1' ? arduinoSerial1Code : arduinoUnoCode}
          </pre>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800">
            <strong>Emparejamiento en PC:</strong> Empareja tu módulo HC-05/HC-06 en la configuración Bluetooth de Windows/macOS (PIN estándar: <code className="text-cyan-300">1234</code> o <code className="text-cyan-300">0000</code>). Esto creará un puerto COM Serial saliente en tu computadora que podrás seleccionar al pulsar <em>&quot;Conectar Bluetooth (Puerto Serial)&quot;</em>.
          </div>
        </div>
      )}

      {/* Main Grid: Conexión + Controles TX (Izquierda) | Terminal Serial Bidireccional RX/TX (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMNA IZQUIERDA (5 cols): Gestión Web Serial & Controles Rápidos */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
          {/* 1. Panel de Conexión */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-tech text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
                1. GESTIÓN DE PUERTO SERIAL
              </span>
              <span className="font-mono text-[11px] text-cyan-400">{BLUETOOTH_BAUD_RATE} baud</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                    isConnected
                      ? 'border-[#00FF87]/60 bg-emerald-950/50 text-[#00FF87]'
                      : 'border-rose-500/40 bg-rose-950/30 text-[#FF2E93]'
                  }`}
                >
                  {isConnected ? (
                    <BluetoothConnected className="w-5 h-5" />
                  ) : (
                    <Bluetooth className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-orbitron font-bold text-slate-200 truncate">
                    {isConnected ? portInfoLabel : 'Sin Puerto Serial Enlazado'}
                  </div>
                  <div className="text-[10px] font-tech text-slate-400 truncate">
                    {isConnected
                      ? 'Streams TextDecoder / TextEncoder activos'
                      : 'Selecciona el puerto COM saliente de tu HC-05'}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones Conectar / Desconectar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConnectSerial}
                disabled={isConnecting || isConnected || !isWebSerialSupported}
                className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-[#00E5FF] hover:from-cyan-400 hover:to-[#00E5FF] text-black font-orbitron font-bold text-[11px] tracking-wide uppercase transition-all shadow-lg glow-cyan cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <BluetoothSearching className="w-4 h-4 animate-spin text-black" />
                    <span>ABRIENDO...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 text-black" />
                    <span>Conectar Bluetooth (Puerto Serial)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDisconnectSerial}
                disabled={!isConnected}
                className="py-2.5 px-3 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-[#FF2E93]/70 text-[#FF2E93] font-orbitron font-bold text-[11px] tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Power className="w-4 h-4" />
                <span>Desconectar</span>
              </button>
            </div>
          </div>

          {/* 2. Controles Rápidos de Hardware (TX) + Indicador LED */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-tech">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Zap className="w-3.5 h-3.5 text-[#FFD166]" />
                2. CONTROLES RÁPIDOS DE HARDWARE (TX)
              </span>
              <span className="text-[10px] text-slate-400">
                Pin LED / Relé: <strong className="text-cyan-300">D13</strong>
              </span>
            </div>

            {/* Indicador gráfico del LED/Foco físico */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isLedOn
                      ? 'border-[#FFD166] bg-amber-100 shadow-[0_0_25px_rgba(255,209,102,0.9)]'
                      : 'border-slate-700 bg-slate-900 text-slate-600'
                  }`}
                >
                  <Lightbulb
                    className={`w-5 h-5 ${
                      isLedOn ? 'text-amber-600 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-xs font-orbitron font-bold text-slate-200">
                    {isLedOn ? 'LED / FOCO ENCENDIDO' : 'LED / FOCO APAGADO'}
                  </div>
                  <div className="text-[10px] font-tech text-slate-400">
                    Estado TX/RX sincronizado
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold ${
                  isLedOn
                    ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isLedOn ? 'HIGH (5V)' : 'LOW (0V)'}
              </span>
            </div>

            {/* 3 Botones de Control Rápido */}
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void sendSerialCommand(CMD_LED_ON, 'Encender LED')}
                  disabled={!isConnected}
                  className="py-2.5 px-3 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-[#00FF87]/60 text-[#00FF87] font-orbitron font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 glow-green disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Encender LED</span>
                  <span className="text-[10px] font-tech opacity-80">(&apos;{CMD_LED_ON}&apos;)</span>
                </button>

                <button
                  type="button"
                  onClick={() => void sendSerialCommand(CMD_LED_OFF, 'Apagar LED')}
                  disabled={!isConnected}
                  className="py-2.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-[#FF2E93]/60 text-[#FF2E93] font-orbitron font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Power className="w-4 h-4" />
                  <span>Apagar LED</span>
                  <span className="text-[10px] font-tech opacity-80">(&apos;{CMD_LED_OFF}&apos;)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void sendSerialCommand(CMD_NORMAL_MODE, 'Modo Normal')}
                disabled={!isConnected}
                className="w-full py-2.5 px-3 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-[#00E5FF]/60 text-[#00E5FF] font-orbitron font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 glow-cyan disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Modo Normal (Enviar &apos;{CMD_NORMAL_MODE}&apos;)</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (7 cols): Terminal Serial Bidireccional (RX / TX) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-3">
          {/* Header de consola */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-tech">
              <Terminal className="w-4 h-4 text-[#00E5FF]" />
              <span className="font-orbitron font-bold text-slate-200 tracking-wide">
                3. TERMINAL SERIAL BIDIRECCIONAL (RX / TX)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-tech text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={appendNewline}
                  onChange={(e) => setAppendNewline(e.target.checked)}
                  className="accent-[#00E5FF] cursor-pointer"
                />
                <span>Añadir \n</span>
              </label>

              <button
                type="button"
                onClick={handleClearConsole}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-slate-700 hover:border-[#FF2E93]/60 text-xs font-tech text-rose-300 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar consola</span>
              </button>
            </div>
          </div>

          {/* Pantalla del Monitor Serial Oscuro */}
          <div
            ref={terminalContainerRef}
            className="h-64 overflow-y-auto rounded-lg bg-[#05070c] border border-cyan-500/25 p-3 font-tech text-xs space-y-1 scanline-effect select-text"
          >
            {terminalLines.length === 0 ? (
              <div className="text-slate-500 italic py-2">
                Monitor Bluetooth Serial listo. Conecta tu puerto COM a {BLUETOOTH_BAUD_RATE} baudios para iniciar la comunicación bidireccional con Arduino (Serial1.println)...
              </div>
            ) : (
              terminalLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-start gap-2 hover:bg-slate-900/50 px-1.5 py-0.5 rounded leading-5"
                >
                  <span className="text-slate-500 font-mono shrink-0">[{line.time}]</span>
                  {line.dir === 'TX' ? (
                    <span className="text-[#00E5FF] font-bold shrink-0">[TX] -&gt;</span>
                  ) : line.dir === 'RX' ? (
                    <span className="text-[#00FF87] font-bold shrink-0">[RX] &lt;-</span>
                  ) : (
                    <span className="text-[#FFD166] font-bold shrink-0">[SYS] ::</span>
                  )}
                  <span
                    className={`break-all ${
                      line.dir === 'TX'
                        ? 'text-cyan-200'
                        : line.dir === 'RX'
                        ? 'text-emerald-200'
                        : 'text-amber-200'
                    }`}
                  >
                    {line.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Entrada manual de comandos ASCII */}
          <form onSubmit={handleSendCustom} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? 'Escribe un comando ASCII personalizado (ej. A, 1, 0, STATUS) y presiona Enter...'
                  : 'Conecta el puerto Bluetooth Serial para enviar comandos...'
              }
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-tech text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isConnected || !customCommand.trim()}
              className="px-4 py-2 rounded-lg bg-[#00E5FF]/20 hover:bg-[#00E5FF] border border-[#00E5FF] text-[#00E5FF] hover:text-black font-orbitron font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
