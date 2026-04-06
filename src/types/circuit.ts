export type ComponentCategory = "passive" | "active" | "logic" | "source" | "ic" | "measurement";

export type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "led"
  | "voltage_source"
  | "ground"
  | "logic_switch"
  | "and_gate"
  | "or_gate"
  | "not_gate"
  | "nand_gate"
  | "nor_gate"
  | "xor_gate"
  | "timer_555"
  | "seven_segment"
  | "logic_led"
  | "voltmeter"
  | "ammeter"
  | "potentiometer"
  | "npn_transistor"
  | "d_flipflop"
  | "func_gen"
  | "momentary_button";

export interface Pin {
  id: string;
  label: string;
  type: "input" | "output" | "bidirectional";
  voltage: number;
  current: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  category: ComponentCategory;
  label: string;
  value: number;
  unit: string;
  pins: Pin[];
  position: { x: number; y: number };
  rotation: number;
  properties: Record<string, number | string | boolean>;
}

export interface CircuitNode {
  id: string;
  voltage: number;
  connections: string[];
}

export interface CircuitWire {
  id: string;
  sourceComponentId: string;
  sourcePinId: string;
  targetComponentId: string;
  targetPinId: string;
  current: number;
}

export interface TruthTableRow {
  inputs: Record<string, boolean>;
  outputs: Record<string, boolean>;
}

export interface TruthTable {
  gateId: string;
  gateType: ComponentType;
  inputLabels: string[];
  outputLabels: string[];
  rows: TruthTableRow[];
}

export interface Timer555State {
  flipFlop: boolean;
  output: boolean;
  dischargeOpen: boolean;
  mode: "astable" | "monostable" | "idle";
}

export interface CircuitAnalysis {
  totalResistance: number;
  totalCurrent: number;
  sourceVoltage: number;
  terminalVoltage: number;
  internalResistance: number;
  power: number;
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  truthTables: TruthTable[];
  timer555States: Record<string, Timer555State>;
  sevenSegmentStates: Record<string, boolean[]>;
  /** True when there is no ground symbol, or nothing in the schematic ties to ground (floating reference). */
  floatingReference: boolean;
}

export interface ProbeEntry {
  id: string;
  nodeKey: string;
  label: string;
  color: string;
}

export interface ScopeSample {
  t: number;
  v: number;
}

export interface PaletteItem {
  type: ComponentType;
  category: ComponentCategory;
  label: string;
  defaultValue: number;
  unit: string;
  pins: Omit<Pin, "voltage" | "current">[];
}

export const PALETTE_ITEMS: PaletteItem[] = [
  // ── Sources ──
  {
    type: "voltage_source",
    category: "source",
    label: "DC Source",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "pos", label: "+", type: "output" },
      { id: "neg", label: "−", type: "input" },
    ],
  },
  {
    type: "func_gen",
    category: "source",
    label: "Func Gen",
    defaultValue: 1000,
    unit: "Hz",
    pins: [
      { id: "pos", label: "+", type: "output" },
      { id: "neg", label: "−", type: "input" },
    ],
  },
  {
    type: "ground",
    category: "source",
    label: "Ground",
    defaultValue: 0,
    unit: "V",
    pins: [{ id: "gnd", label: "GND", type: "bidirectional" }],
  },
  // ── Passive ──
  {
    type: "resistor",
    category: "passive",
    label: "Resistor",
    defaultValue: 1000,
    unit: "Ω",
    pins: [
      { id: "a", label: "1", type: "bidirectional" },
      { id: "b", label: "2", type: "bidirectional" },
    ],
  },
  {
    type: "capacitor",
    category: "passive",
    label: "Capacitor",
    defaultValue: 100,
    unit: "µF",
    pins: [
      { id: "a", label: "+", type: "bidirectional" },
      { id: "b", label: "−", type: "bidirectional" },
    ],
  },
  {
    type: "inductor",
    category: "passive",
    label: "Inductor",
    defaultValue: 10,
    unit: "mH",
    pins: [
      { id: "a", label: "1", type: "bidirectional" },
      { id: "b", label: "2", type: "bidirectional" },
    ],
  },
  {
    type: "potentiometer",
    category: "passive",
    label: "Pot",
    defaultValue: 10000,
    unit: "Ω",
    pins: [
      { id: "a", label: "1", type: "bidirectional" },
      { id: "wiper", label: "W", type: "bidirectional" },
      { id: "b", label: "2", type: "bidirectional" },
    ],
  },
  // ── Active ──
  {
    type: "npn_transistor",
    category: "active",
    label: "NPN BJT",
    defaultValue: 100,
    unit: "β",
    pins: [
      { id: "base", label: "B", type: "input" },
      { id: "collector", label: "C", type: "bidirectional" },
      { id: "emitter", label: "E", type: "bidirectional" },
    ],
  },
  {
    type: "led",
    category: "active",
    label: "LED",
    defaultValue: 2,
    unit: "V",
    pins: [
      { id: "anode", label: "A", type: "input" },
      { id: "cathode", label: "K", type: "output" },
    ],
  },
  // ── Logic ──
  {
    type: "logic_switch",
    category: "logic",
    label: "Switch",
    defaultValue: 5,
    unit: "V",
    pins: [{ id: "out", label: "OUT", type: "output" }],
  },
  {
    type: "and_gate",
    category: "logic",
    label: "AND",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in1", label: "A", type: "input" },
      { id: "in2", label: "B", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "or_gate",
    category: "logic",
    label: "OR",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in1", label: "A", type: "input" },
      { id: "in2", label: "B", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "not_gate",
    category: "logic",
    label: "NOT",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in", label: "A", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "nand_gate",
    category: "logic",
    label: "NAND",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in1", label: "A", type: "input" },
      { id: "in2", label: "B", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "nor_gate",
    category: "logic",
    label: "NOR",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in1", label: "A", type: "input" },
      { id: "in2", label: "B", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "xor_gate",
    category: "logic",
    label: "XOR",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "in1", label: "A", type: "input" },
      { id: "in2", label: "B", type: "input" },
      { id: "out", label: "Y", type: "output" },
    ],
  },
  {
    type: "momentary_button",
    category: "logic",
    label: "Button",
    defaultValue: 5,
    unit: "V",
    pins: [{ id: "out", label: "OUT", type: "output" }],
  },
  {
    type: "logic_led",
    category: "logic",
    label: "Logic LED",
    defaultValue: 0,
    unit: "",
    pins: [{ id: "in", label: "IN", type: "input" }],
  },
  {
    type: "d_flipflop",
    category: "logic",
    label: "D Flip-Flop",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "d", label: "D", type: "input" },
      { id: "clk", label: "CLK", type: "input" },
      { id: "q", label: "Q", type: "output" },
      { id: "qn", label: "Q̄", type: "output" },
    ],
  },
  // ── Measurement ──
  {
    type: "voltmeter",
    category: "measurement",
    label: "Voltmeter",
    defaultValue: 0,
    unit: "V",
    pins: [
      { id: "pos", label: "V+", type: "bidirectional" },
      { id: "neg", label: "V−", type: "bidirectional" },
    ],
  },
  {
    type: "ammeter",
    category: "measurement",
    label: "Ammeter",
    defaultValue: 0,
    unit: "A",
    pins: [
      { id: "a", label: "A", type: "bidirectional" },
      { id: "b", label: "B", type: "bidirectional" },
    ],
  },
  // ── Integrated Circuits ──
  {
    type: "timer_555",
    category: "ic",
    label: "555 Timer",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "gnd", label: "GND", type: "bidirectional" },
      { id: "trig", label: "TRIG", type: "input" },
      { id: "out", label: "OUT", type: "output" },
      { id: "reset", label: "RST", type: "input" },
      { id: "ctrl", label: "CTRL", type: "input" },
      { id: "thresh", label: "THR", type: "input" },
      { id: "disch", label: "DIS", type: "output" },
      { id: "vcc", label: "VCC", type: "bidirectional" },
    ],
  },
  {
    type: "seven_segment",
    category: "ic",
    label: "7-Seg Display",
    defaultValue: 5,
    unit: "V",
    pins: [
      { id: "a", label: "a", type: "input" },
      { id: "b", label: "b", type: "input" },
      { id: "c", label: "c", type: "input" },
      { id: "d", label: "d", type: "input" },
      { id: "e", label: "e", type: "input" },
      { id: "f", label: "f", type: "input" },
      { id: "g", label: "g", type: "input" },
      { id: "com", label: "COM", type: "bidirectional" },
    ],
  },
];
