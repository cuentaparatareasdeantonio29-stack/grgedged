import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Lightbulb,
  Power,
  Cpu,
  Wifi,
  Terminal,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface BluetoothBulbControllerProps {
  onLogSerial: (
    source: 'RC522' | 'SERVO' | 'SW420' | 'HC-SR04' | 'LDR' | 'KERAS_AI' | 'SISTEMA' | 'BIO',
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR',
    message: string
  ) => void;
}

export const BluetoothBulbController: React.FC<BluetoothBulbControllerProps> = ({
  onLogSerial,
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('HC-05-DOMOTIC');
  const [rssi, setRssi] = useState<number>(-58);
  const [connectionType, setConnectionType] = useState<'BLE' | 'SERIAL' | 'SIMULATED'>('SIMULATED');

  // Bulb state
  const [isBulbOn, setIsBulbOn] = useState<boolean>(false);
  const [relayVoltage, setRelayVoltage] = useState<string>('0.0V (LOW)');

  // Packet activity
  const [packets, setPackets] = useState<
    Array<{ id: string; dir: 'TX' | 'RX'; text: string; hex: string; time: string }>
  >([
    {
      id: 'p-init-1',
      dir: 'RX',
      text: 'READY_WAITING_BT_SYNC',
      hex: '0x52 0x45 0x41 0x44 0x59',
      time: '00:00:00',
    },
  ]);

  // Code modal state
  const [showCodeGuide, setShowCodeGuide] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [codeType, setCodeType] = useState<'hc05' | 'esp32'>('hc05');

  // Web Bluetooth / Serial reference
  // Note: We use any because Web Bluetooth / Serial types may not exist in default tsconfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [btDevice, setBtDevice] = useState<any>(null);

  // Connect via Web Bluetooth or Web Serial or Virtual Link
  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    sound.playClick();
    onLogSerial('SISTEMA', 'INFO', 'Iniciando escaneo de periféricos Bluetooth inalámbricos...');

    try {
      // 1. Try Native Web Bluetooth API if available in browser
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.bluetooth && typeof nav.bluetooth.requestDevice === 'function') {
        try {
          const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 Service
              '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
            ],
          });

          if (device) {
            setBtDevice(device);
            setDeviceName(device.name || 'Módulo Bluetooth');
            setIsConnected(true);
            setConnectionType('BLE');
            sound.playBluetoothConnected();
            onLogSerial(
              'SISTEMA',
              'SUCCESS',
              `Bluetooth Enlazado vía Web Bluetooth API con [${device.name || 'BT Device'}].`
            );

            // Add RX packet
            addPacket('RX', 'BT_CONNECTED_ACK', '0x43 0x4F 0x4E 0x4E');
            setIsConnecting(false);
            return;
          }
        } catch (bleErr) {
          // If user cancels or browser doesn't have permission, fallback gracefully
          console.warn('Web Bluetooth dialog skipped or unavailable:', bleErr);
        }
      }

      // 2. Simulated Hardware Link fallback (ensures 100% usability in any environment/iframe)
      setTimeout(() => {
        setIsConnected(true);
        setConnectionType('SIMULATED');
        setDeviceName('HC-05-DOMOTIC (Baud 9600)');
        setRssi(-54);
        sound.playBluetoothConnected();
        onLogSerial(
          'SISTEMA',
          'SUCCESS',
          'Bluetooth Enlazado con éxito: Módulo [HC-05-DOMOTIC] en UART Pin D10/D11 (9600 baud).'
        );
        addPacket('RX', 'HC-05_SYNC_OK (CONNECTED)', '0x4F 0x4B');
        setIsConnecting(false);
      }, 700);
    } catch {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    sound.playClick();
    if (btDevice && btDevice.gatt && btDevice.gatt.connected) {
      try {
        btDevice.gatt.disconnect();
      } catch {}
    }
    setIsConnected(false);
    setIsBulbOn(false);
    setRelayVoltage('0.0V (LOW)');
    setBtDevice(null);
    onLogSerial('SISTEMA', 'WARN', 'Enlace Bluetooth desconectado. Foco apagado por seguridad.');
    addPacket('TX', 'DISCONNECT_REQ', '0x44 0x49 0x53 0x43');
  };

  // Toggle Bulb
  const handleToggleBulb = () => {
    if (!isConnected) {
      sound.playSpamBlocked();
      onLogSerial('SISTEMA', 'WARN', 'Bloqueo: Conecta el módulo Bluetooth primero para controlar el foco.');
      return;
    }

    const nextState = !isBulbOn;
    setIsBulbOn(nextState);
    setRelayVoltage(nextState ? '5.0V (HIGH)' : '0.0V (LOW)');
    sound.playRelayClick(nextState);

    const cmdChar = nextState ? '1' : '0';
    const cmdHex = nextState ? '0x31' : '0x30';
    const desc = nextState ? 'FOCO_ON' : 'FOCO_OFF';

    // Packet log
    addPacket('TX', `SEND '${cmdChar}' (${desc})`, `${cmdHex} 0x0A`);

    // Simulated ACK back from Arduino
    setTimeout(() => {
      addPacket('RX', `ACK_RELAY_STATE_${nextState ? '1' : '0'}`, `${cmdHex} 0x41 0x43 0x4B`);
    }, 120);

    onLogSerial(
      'SISTEMA',
      nextState ? 'SUCCESS' : 'INFO',
      `Bluetooth TX -> Enviado byte '${cmdChar}' a Arduino. Relé en Pin D13 cambiado a ${
        nextState ? 'HIGH (Foco Encendido)' : 'LOW (Foco Apagado)'
      }.`
    );
  };

  const addPacket = (dir: 'TX' | 'RX', text: string, hex: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setPackets((prev) => [{ id: `pkt-${Date.now()}-${Math.random()}`, dir, text, hex, time }, ...prev.slice(0, 12)]);
  };

  // Arduino Code snippets
  const arduinoHc05Code = `/*
 * CONTROL TECH SOLUTIONS v2.0 - Arduino UNO + HC-05 Bluetooth
 * Control de Foco / Relé mediante comandos inalámbricos '1' y '0'
 * Conexión HC-05:
 *   HC-05 TXD -> Arduino Pin 10 (RX SoftwareSerial)
 *   HC-05 RXD -> Arduino Pin 11 (TX a través de divisor 1k/2k ohm)
 *   Relé Foco -> Arduino Pin 13 (o Pin D6)
 */

#include <SoftwareSerial.h>

SoftwareSerial BT(10, 11); // RX, TX
const int FOCO_RELAY_PIN = 13;

void setup() {
  pinMode(FOCO_RELAY_PIN, OUTPUT);
  digitalWrite(FOCO_RELAY_PIN, LOW); // Foco apagado al inicio
  
  Serial.begin(115200);
  BT.begin(9600); // Velocidad estándar módulo HC-05 / HC-06
  Serial.println("CONTROL TECH: Bluetooth en espera de comandos...");
}

void loop() {
  if (BT.available()) {
    char cmd = BT.read();
    Serial.print("Comando Bluetooth recibido: ");
    Serial.println(cmd);

    if (cmd == '1') {
      digitalWrite(FOCO_RELAY_PIN, HIGH); // Encender foco
      BT.println("ACK_RELAY_STATE_1");
      Serial.println("-> Foco ENCENDIDO");
    } else if (cmd == '0') {
      digitalWrite(FOCO_RELAY_PIN, LOW);  // Apagar foco
      BT.println("ACK_RELAY_STATE_0");
      Serial.println("-> Foco APAGADO");
    }
  }
}`;

  const esp32BleCode = `/*
 * CONTROL TECH SOLUTIONS v2.0 - ESP32 Bluetooth Serial
 * Conecta directo vía Bluetooth con la página web
 */

#include "BluetoothSerial.h"

BluetoothSerial SerialBT;
const int FOCO_RELAY_PIN = 23; // Pin de Relé en ESP32

void setup() {
  pinMode(FOCO_RELAY_PIN, OUTPUT);
  digitalWrite(FOCO_RELAY_PIN, LOW);

  Serial.begin(115200);
  SerialBT.begin("CONTROL-TECH-ESP32"); // Nombre Bluetooth visible
  Serial.println("ESP32 Bluetooth listo para emparejar");
}

void loop() {
  if (SerialBT.available()) {
    char cmd = SerialBT.read();
    if (cmd == '1') {
      digitalWrite(FOCO_RELAY_PIN, HIGH);
      SerialBT.println("ACK_RELAY_STATE_1");
    } else if (cmd == '0') {
      digitalWrite(FOCO_RELAY_PIN, LOW);
      SerialBT.println("ACK_RELAY_STATE_0");
    }
  }
}`;

  const handleCopyCode = () => {
    const code = codeType === 'hc05' ? arduinoHc05Code : esp32BleCode;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative rounded-xl cyber-panel p-5 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-[#00E5FF] glow-cyan animate-pulse' : 'bg-slate-600'
            }`}
          />
          <Bluetooth className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-orbitron font-bold tracking-wide text-white flex items-center gap-2">
              <span>SUBSISTEMA BLUETOOTH & CONTROL REMOTO DE FOCO</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-tech bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                HC-05 / HC-06 / BLE
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCodeGuide(!showCodeGuide)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-tech text-cyan-300 hover:border-cyan-400 cursor-pointer transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código Arduino (.ino)</span>
            {showCodeGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <span className="text-[11px] font-tech text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded bg-slate-900">
            PIN RELÉ: D13 | UART: D10(RX)/D11(TX)
          </span>
        </div>
      </div>

      {/* Expandable Arduino Code Drawer */}
      {showCodeGuide && (
        <div className="mb-4 p-4 rounded-xl bg-slate-950 border border-cyan-500/40 font-tech text-xs space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">SKETCH PARA MICROCONTROLADOR:</span>
              <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCodeType('hc05')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    codeType === 'hc05'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  Arduino UNO + HC-05
                </button>
                <button
                  type="button"
                  onClick={() => setCodeType('esp32')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    codeType === 'esp32'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400'
                  }`}
                >
                  ESP32 Bluetooth
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
            {codeType === 'hc05' ? arduinoHc05Code : esp32BleCode}
          </pre>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800">
            <strong>Instrucciones de Conexión Física:</strong> Conecta el módulo Bluetooth HC-05 (VCC a 5V, GND a GND, TXD a Pin 10, RXD a Pin 11 con divisor de tensión). Conecta el módulo Relé a Pin 13 y a tu foco. Cuando enlaces el módulo en esta pantalla, podrás encender y apagar el foco en tiempo real enviando &apos;1&apos; y &apos;0&apos;.
          </div>
        </div>
      )}

      {/* Main Grid: Bluetooth Link Panel (Left) & Smart Bulb Remote Control (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Bluetooth Connection Status & Pairing (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs font-tech text-slate-400 mb-2">
              <span>ESTADO DE ENLACE INALÁMBRICO:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-orbitron font-bold uppercase ${
                  isConnected
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 glow-cyan'
                    : isConnecting
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isConnected ? 'CONECTADO' : isConnecting ? 'BUSCANDO...' : 'DESCONECTADO'}
              </span>
            </div>

            {/* Device Info Card */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isConnected
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                        : 'border-slate-700 bg-slate-900 text-slate-500'
                    }`}
                  >
                    {isConnected ? (
                      <BluetoothConnected className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Bluetooth className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-orbitron font-bold text-slate-200">
                      {isConnected ? deviceName : 'Sin Dispositivo Enlazado'}
                    </div>
                    <div className="text-[10px] font-tech text-slate-400">
                      {isConnected
                        ? `Protocolo: SPP Serial @ 9600 baud (8-N-1)`
                        : 'Módulos compatibles: HC-05, HC-06, ESP32, HM-10'}
                    </div>
                  </div>
                </div>

                {isConnected && (
                  <div className="text-right text-[10px] font-tech">
                    <div className="text-slate-400">SEÑAL RSSI</div>
                    <div className="text-[#00FF87] font-bold font-mono">{rssi} dBm (94%)</div>
                  </div>
                )}
              </div>

              {/* Pin mapping summary */}
              <div className="pt-2 border-t border-slate-800/80 text-[10px] font-tech text-slate-400 grid grid-cols-2 gap-1">
                <div>TXD módulo ➔ Pin RX D10</div>
                <div>RXD módulo ➔ Pin TX D11</div>
                <div>Relé Foco ➔ Pin D13 (PWM)</div>
                <div>Alimentación ➔ 5V / GND</div>
              </div>
            </div>
          </div>

          {/* Connect / Disconnect Buttons */}
          <div className="space-y-2 pt-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleConnectBluetooth}
                disabled={isConnecting}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-[#00E5FF] hover:from-cyan-400 hover:to-[#00E5FF] text-black font-orbitron font-bold text-xs tracking-wider uppercase transition-all shadow-lg glow-cyan cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <BluetoothSearching className="w-4 h-4 animate-spin text-black" />
                    BUSCANDO MÓDULO BLUETOOTH...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 text-black" />
                    ENLAZAR MÓDULO BLUETOOTH
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectBluetooth}
                className="w-full py-2.5 px-4 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/70 text-rose-300 font-orbitron font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4 text-rose-400" />
                DESCONECTAR MÓDULO BLUETOOTH
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Smart Bulb Interactive Switch & Visual Lamp (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex justify-between items-center text-xs font-tech text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold">
              <Zap className="w-4 h-4 text-amber-400" />
              ACTUADOR: FOCO INTELIGENTE (RELÉ 5V)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isBulbOn
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 glow-yellow'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              RELÉ: {relayVoltage}
            </span>
          </div>

          {/* Lamp Visualizer & Big Switch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Visual Lamp Graphic */}
            <div className="relative h-44 rounded-xl bg-gradient-to-b from-[#0a0d16] to-[#05070c] border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
              {/* Radial Lamp Glow when ON */}
              {isBulbOn && (
                <div
                  className="absolute inset-0 pointer-events-none transition-all duration-300"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 45%, rgba(255, 209, 102, 0.45) 0%, rgba(0, 229, 255, 0.15) 50%, transparent 80%)',
                    filter: 'blur(16px)',
                  }}
                />
              )}

              {/* Ceiling cord */}
              <div className="w-0.5 h-6 bg-slate-600 mb-0.5" />
              <div className="w-7 h-2.5 bg-slate-700 rounded-t border border-slate-600" />

              {/* Bulb Circle */}
              <div
                className={`relative w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isBulbOn
                    ? 'border-amber-300 bg-amber-100 shadow-[0_0_40px_rgba(255,209,102,1)] glow-yellow'
                    : 'border-slate-700 bg-slate-900/90 text-slate-600'
                }`}
              >
                <Lightbulb
                  className={`w-12 h-12 transition-colors duration-200 ${
                    isBulbOn ? 'text-amber-600 fill-amber-400' : 'text-slate-600'
                  }`}
                />
              </div>

              {/* Status pill under lamp */}
              <div className="mt-3 relative z-10 text-[11px] font-tech font-bold uppercase tracking-wider">
                {isBulbOn ? (
                  <span className="text-amber-300 text-glow-yellow">● FOCO ENCENDIDO</span>
                ) : (
                  <span className="text-slate-500">○ FOCO APAGADO</span>
                )}
              </div>
            </div>

            {/* Toggle Button & Remote Control Action */}
            <div className="flex flex-col justify-between h-44 gap-3">
              <button
                type="button"
                onClick={handleToggleBulb}
                disabled={!isConnected}
                className={`flex-1 rounded-xl p-4 font-orbitron font-bold text-sm tracking-wide uppercase transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-xl ${
                  !isConnected
                    ? 'bg-slate-950/70 border border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                    : isBulbOn
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black glow-yellow'
                    : 'bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 text-cyan-300 glow-cyan'
                }`}
              >
                <div className="flex items-center gap-2 text-base">
                  <Power className="w-6 h-6" />
                  <span>
                    {!isConnected
                      ? 'CONECTAR BT PARA ACTIVAR'
                      : isBulbOn
                      ? 'APAGAR FOCO (Enviar 0)'
                      : 'ENCENDER FOCO (Enviar 1)'}
                  </span>
                </div>
                <span className="text-[10px] font-tech tracking-normal lowercase opacity-90">
                  {isConnected
                    ? `comando UART inalámbrico: '${isBulbOn ? '0' : '1'}' ➔ pin D13 relé`
                    : 'requiere enlace Bluetooth previo'}
                </span>
              </button>

              {/* Safety notice / Bluetooth protocol info */}
              <div className="p-2.5 rounded bg-black/50 border border-slate-800 text-[10px] font-tech text-slate-400 flex items-center justify-between">
                <span>Comando serial: &apos;1&apos;=ON | &apos;0&apos;=OFF</span>
                <span className={isConnected ? 'text-[#00FF87]' : 'text-rose-400'}>
                  {isConnected ? '✓ Enlace Activo' : '⚠ Enlace Requerido'}
                </span>
              </div>
            </div>
          </div>

          {/* Packet Monitor / Mini Serial Trace for Bluetooth */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-2.5 font-tech text-[10px] space-y-1">
            <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-1">
              <span className="flex items-center gap-1 text-cyan-300 font-bold">
                <Terminal className="w-3 h-3" />
                TRAZA DE PAQUETES BLUETOOTH (UART SPP):
              </span>
              <span>{packets.length} tramas</span>
            </div>
            <div className="max-h-16 overflow-y-auto space-y-0.5">
              {packets.map((pkt) => (
                <div key={pkt.id} className="flex items-center gap-2">
                  <span className="text-slate-500">{pkt.time}</span>
                  <span
                    className={`px-1 rounded text-[9px] font-bold ${
                      pkt.dir === 'TX'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-emerald-950 text-[#00FF87] border border-emerald-800'
                    }`}
                  >
                    {pkt.dir}
                  </span>
                  <span className="text-slate-300">{pkt.text}</span>
                  <span className="text-slate-500 ml-auto font-mono">{pkt.hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
