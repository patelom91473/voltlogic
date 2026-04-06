import type {
  CircuitComponent,
  CircuitAnalysis,
  TruthTable,
  TruthTableRow,
  ComponentType,
  Timer555State,
} from "@/types/circuit";
import type { Edge } from "@xyflow/react";

const LOGIC_HIGH = 5;
const LOGIC_LOW = 0;
const LOGIC_THRESHOLD = 2.5;

export class CircuitSolver {
  private components: Map<string, CircuitComponent>;
  private edges: Edge[];

  constructor(components: CircuitComponent[], edges: Edge[]) {
    this.components = new Map(components.map((c) => [c.id, c]));
    this.edges = edges;
  }

  solve(): CircuitAnalysis {
    const resistors = this.getByType("resistor");
    const sources = this.getByType("voltage_source");
    const grounds = this.getByType("ground");

    const gateTypes: ComponentType[] = ["and_gate", "or_gate", "not_gate", "nand_gate", "nor_gate", "xor_gate"];
    const logicGates = gateTypes.flatMap((t) => this.getByType(t));
    const dFlipFlops = this.getByType("d_flipflop");
    const timers = this.getByType("timer_555");
    const sevenSegs = this.getByType("seven_segment");

    const source = sources.length > 0 ? sources[0] : null;
    const sourceVoltage = source?.value ?? 0;
    const internalR = source ? Number(source.properties["internalResistance"] ?? 0) : 0;

    const externalR = this.totalResistance(resistors);
    const totalResistance = externalR + internalR;
    const totalCurrent = totalResistance > 0 ? sourceVoltage / totalResistance : 0;

    // V_out = V_source - I * r_internal
    const terminalVoltage = internalR > 0 ? sourceVoltage - totalCurrent * internalR : sourceVoltage;
    const power = terminalVoltage * totalCurrent;

    const nodeVoltages = this.nodeVoltages(terminalVoltage, totalCurrent, resistors, sources);
    const branchCurrents = this.branchCurrents(nodeVoltages);
    const truthTables = [
      ...logicGates.map((g) => this.truthTable(g)),
      ...dFlipFlops.map((dff) => this.dffCharacteristicTable(dff)),
    ];

    const timer555States: Record<string, Timer555State> = {};
    for (const t of timers) {
      timer555States[t.id] = this.solve555(t, sourceVoltage);
      nodeVoltages[`${t.id}:out`] = timer555States[t.id].output ? LOGIC_HIGH : LOGIC_LOW;
    }

    const sevenSegmentStates: Record<string, boolean[]> = {};
    for (const seg of sevenSegs) {
      sevenSegmentStates[seg.id] = this.solve7Segment(seg);
    }

    const groundedKeys = this.getGroundedPinKeys();
    for (const k of groundedKeys) {
      nodeVoltages[k] = 0;
    }
    const gndPinKeySet = new Set(grounds.map((g) => `${g.id}:gnd`));
    const groundedTouchesCircuit = [...groundedKeys].some((k) => !gndPinKeySet.has(k));
    const floatingReference = grounds.length === 0 || !groundedTouchesCircuit;

    return {
      totalResistance,
      totalCurrent,
      sourceVoltage,
      terminalVoltage,
      internalResistance: internalR,
      power,
      nodeVoltages,
      branchCurrents,
      truthTables,
      timer555States,
      sevenSegmentStates,
      floatingReference,
    };
  }

  private getByType(type: ComponentType): CircuitComponent[] {
    return Array.from(this.components.values()).filter((c) => c.type === type);
  }

  /** Adjacency of pin keys (`compId:pinId`), including implicit ties between all Ground symbols (same reference). */
  private getPinAdjacency(): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    const addEdge = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    };
    for (const e of this.edges) {
      const sh = e.sourceHandle;
      const th = e.targetHandle;
      if (!sh || !th) continue;
      addEdge(`${e.source}:${sh}`, `${e.target}:${th}`);
    }
    const gndKeys = this.getByType("ground").map((g) => `${g.id}:gnd`);
    for (let i = 0; i < gndKeys.length; i++) {
      for (let j = i + 1; j < gndKeys.length; j++) {
        addEdge(gndKeys[i], gndKeys[j]);
      }
    }
    return adj;
  }

  /** All pin keys shorted to the global ground reference (0 V). */
  private getGroundedPinKeys(): Set<string> {
    const adj = this.getPinAdjacency();
    const grounds = this.getByType("ground");
    const queue = grounds.map((g) => `${g.id}:gnd`);
    const seen = new Set<string>();
    while (queue.length) {
      const k = queue.pop()!;
      if (seen.has(k)) continue;
      seen.add(k);
      for (const n of adj.get(k) ?? []) {
        if (!seen.has(n)) queue.push(n);
      }
    }
    return seen;
  }

  // ── Resistance calculation ──

  private totalResistance(resistors: CircuitComponent[]): number {
    if (resistors.length === 0) return 0;
    if (resistors.length === 1) return resistors[0].value;

    const { series, parallel } = this.classifyTopology(resistors);
    let rSeries = 0;
    for (const r of series) rSeries += r.value;

    let gPar = 0;
    for (const r of parallel) {
      if (r.value > 0) gPar += 1 / r.value;
    }
    const rPar = gPar > 0 ? 1 / gPar : 0;

    if (series.length > 0 && parallel.length > 0) return rSeries + rPar;
    return parallel.length > 0 ? rPar : rSeries;
  }

  private classifyTopology(resistors: CircuitComponent[]) {
    if (resistors.length <= 1) return { series: resistors, parallel: [] as CircuitComponent[] };

    const adj = new Map<string, Set<string>>();
    for (const e of this.edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }

    const parSet = new Set<string>();
    for (let i = 0; i < resistors.length; i++) {
      for (let j = i + 1; j < resistors.length; j++) {
        const ni = adj.get(resistors[i].id) ?? new Set();
        const nj = adj.get(resistors[j].id) ?? new Set();
        const shared = [...ni].filter((n) => nj.has(n));
        if (shared.length >= 2 || ni.has(resistors[j].id)) {
          parSet.add(resistors[i].id);
          parSet.add(resistors[j].id);
        }
      }
    }

    const series: CircuitComponent[] = [];
    const parallel: CircuitComponent[] = [];
    for (const r of resistors) (parSet.has(r.id) ? parallel : series).push(r);
    return { series, parallel };
  }

  // ── Edge-driven gate input resolution ──

  private resolveGateInput(gateId: string, pinId: string, voltages: Record<string, number>): boolean {
    for (const e of this.edges) {
      if (e.target === gateId && e.targetHandle === pinId) {
        return (voltages[`${e.source}:${e.sourceHandle}`] ?? 0) >= LOGIC_THRESHOLD;
      }
      if (e.source === gateId && e.sourceHandle === pinId) {
        return (voltages[`${e.target}:${e.targetHandle}`] ?? 0) >= LOGIC_THRESHOLD;
      }
    }
    const gate = this.components.get(gateId);
    if (gate && typeof gate.properties[pinId] === "boolean") {
      return gate.properties[pinId] as boolean;
    }
    return false;
  }

  private evaluateGateFromInputs(type: ComponentType, inputs: boolean[]): boolean {
    switch (type) {
      case "and_gate":  return inputs.every(Boolean);
      case "or_gate":   return inputs.some(Boolean);
      case "not_gate":  return !inputs[0];
      case "nand_gate": return !inputs.every(Boolean);
      case "nor_gate":  return !inputs.some(Boolean);
      case "xor_gate":  return inputs.filter(Boolean).length % 2 === 1;
      default:          return false;
    }
  }

  private resolveProbeVoltage(compId: string, pinId: string, voltages: Record<string, number>): number {
    for (const e of this.edges) {
      if (e.target === compId && e.targetHandle === pinId) {
        return voltages[`${e.source}:${e.sourceHandle}`] ?? 0;
      }
      if (e.source === compId && e.sourceHandle === pinId) {
        return voltages[`${e.target}:${e.targetHandle}`] ?? 0;
      }
    }
    return 0;
  }

  // ── Node voltages ──

  private nodeVoltages(
    terminalVoltage: number,
    totalCurrent: number,
    resistors: CircuitComponent[],
    sources: CircuitComponent[]
  ): Record<string, number> {
    const v: Record<string, number> = {};

    for (const src of sources) {
      const r = Number(src.properties["internalResistance"] ?? 0);
      v[`${src.id}:pos`] = src.value - totalCurrent * r;
      v[`${src.id}:neg`] = 0;
    }

    let remaining = terminalVoltage;
    const { series } = this.classifyTopology(resistors);
    for (const r of series) {
      const drop = totalCurrent * r.value;
      v[`${r.id}:a`] = remaining;
      remaining -= drop;
      v[`${r.id}:b`] = remaining;
    }

    for (const sw of this.getByType("logic_switch")) {
      v[`${sw.id}:out`] = sw.properties["on"] === true ? LOGIC_HIGH : LOGIC_LOW;
    }

    for (const btn of this.getByType("momentary_button")) {
      v[`${btn.id}:out`] = btn.properties["pressed"] === true ? LOGIC_HIGH : LOGIC_LOW;
    }

    for (const fg of this.getByType("func_gen")) {
      const amp = Number(fg.properties["amplitude"] ?? 5);
      v[`${fg.id}:pos`] = amp;
      v[`${fg.id}:neg`] = 0;
    }

    for (const pot of this.getByType("potentiometer")) {
      const pos = Number(pot.properties["position"] ?? 0.5);
      const vA = v[`${pot.id}:a`] ?? terminalVoltage;
      const vB = v[`${pot.id}:b`] ?? 0;
      v[`${pot.id}:a`] = vA;
      v[`${pot.id}:b`] = vB;
      v[`${pot.id}:wiper`] = vB + (vA - vB) * pos;
    }

    for (const bjt of this.getByType("npn_transistor")) {
      const beta = Number(bjt.properties["beta"] ?? 100);
      const vBase = this.resolveProbeVoltage(bjt.id, "base", v);
      const vColl = this.resolveProbeVoltage(bjt.id, "collector", v);
      v[`${bjt.id}:base`] = vBase;
      const vbe = vBase - 0;
      if (vbe > 0.7) {
        const ib = (vbe - 0.7) / 10000;
        const ic = Math.min(beta * ib, vColl > 0 ? vColl / 100 : 0);
        v[`${bjt.id}:collector`] = vColl;
        v[`${bjt.id}:emitter`] = 0;
        v[`${bjt.id}:ic`] = ic;
      } else {
        v[`${bjt.id}:collector`] = vColl;
        v[`${bjt.id}:emitter`] = 0;
        v[`${bjt.id}:ic`] = 0;
      }
    }

    const gateTypes: ComponentType[] = ["and_gate", "or_gate", "not_gate", "nand_gate", "nor_gate", "xor_gate"];
    const allGates = gateTypes.flatMap((t) => this.getByType(t));

    for (let iter = 0; iter < 10; iter++) {
      let changed = false;
      for (const gate of allGates) {
        const inPins = gate.pins.filter((p) => p.type === "input");
        const inputs = inPins.map((p) => this.resolveGateInput(gate.id, p.id, v));
        const out = this.evaluateGateFromInputs(gate.type, inputs);
        const newV = out ? LOGIC_HIGH : LOGIC_LOW;
        const key = `${gate.id}:out`;
        if (v[key] !== newV) { v[key] = newV; changed = true; }
        inPins.forEach((pin, i) => {
          v[`${gate.id}:${pin.id}`] = inputs[i] ? LOGIC_HIGH : LOGIC_LOW;
        });
      }
      if (!changed) break;
    }

    for (const led of this.getByType("logic_led")) {
      v[`${led.id}:in`] = this.resolveProbeVoltage(led.id, "in", v);
    }

    for (const vm of this.getByType("voltmeter")) {
      v[`${vm.id}:pos`] = this.resolveProbeVoltage(vm.id, "pos", v);
      v[`${vm.id}:neg`] = this.resolveProbeVoltage(vm.id, "neg", v);
    }

    for (const am of this.getByType("ammeter")) {
      const probed = this.resolveProbeVoltage(am.id, "a", v);
      v[`${am.id}:a`] = probed;
      v[`${am.id}:b`] = probed;
    }

    for (const dff of this.getByType("d_flipflop")) {
      const q = dff.properties["_q"] === true;
      v[`${dff.id}:q`] = q ? LOGIC_HIGH : LOGIC_LOW;
      v[`${dff.id}:qn`] = q ? LOGIC_LOW : LOGIC_HIGH;
      v[`${dff.id}:d`] = this.resolveProbeVoltage(dff.id, "d", v);
      v[`${dff.id}:clk`] = this.resolveProbeVoltage(dff.id, "clk", v);
    }

    const grounded = this.getGroundedPinKeys();
    for (const k of grounded) {
      v[k] = 0;
    }

    return v;
  }

  private branchCurrents(voltages: Record<string, number>): Record<string, number> {
    const c: Record<string, number> = {};
    for (const e of this.edges) {
      const sv = voltages[`${e.source}:${e.sourceHandle}`] ?? 0;
      const tv = voltages[`${e.target}:${e.targetHandle}`] ?? 0;
      const comp = this.components.get(e.source);
      if (comp?.type === "resistor" && comp.value > 0) {
        c[e.id] = Math.abs(sv - tv) / comp.value;
      } else {
        c[e.id] = Math.abs(sv - tv) > 0 ? 0.001 : 0;
      }
    }
    return c;
  }

  // ── Logic ──

  evaluateGate(gate: CircuitComponent): boolean {
    const inputs = gate.pins
      .filter((p) => p.type === "input")
      .map((p) => typeof gate.properties[p.id] === "boolean" ? (gate.properties[p.id] as boolean) : p.voltage >= LOGIC_THRESHOLD);

    switch (gate.type) {
      case "and_gate":  return inputs.every(Boolean);
      case "or_gate":   return inputs.some(Boolean);
      case "not_gate":  return !inputs[0];
      case "nand_gate": return !inputs.every(Boolean);
      case "nor_gate":  return !inputs.some(Boolean);
      case "xor_gate":  return inputs.filter(Boolean).length % 2 === 1;
      default:          return false;
    }
  }

  private evaluateStatic(gate: CircuitComponent): boolean {
    const inputs = gate.pins.filter((p) => p.type === "input").map((p) => gate.properties[p.id] === true);
    switch (gate.type) {
      case "and_gate":  return inputs.every(Boolean);
      case "or_gate":   return inputs.some(Boolean);
      case "not_gate":  return !inputs[0];
      case "nand_gate": return !inputs.every(Boolean);
      case "nor_gate":  return !inputs.some(Boolean);
      case "xor_gate":  return inputs.filter(Boolean).length % 2 === 1;
      default:          return false;
    }
  }

  truthTable(gate: CircuitComponent): TruthTable {
    const inPins = gate.pins.filter((p) => p.type === "input");
    const outPins = gate.pins.filter((p) => p.type === "output");
    const inLabels = inPins.map((p) => p.label);
    const outLabels = outPins.map((p) => p.label);
    const rows: TruthTableRow[] = [];

    for (let i = 0; i < 2 ** inPins.length; i++) {
      const inputs: Record<string, boolean> = {};
      inLabels.forEach((l, j) => { inputs[l] = Boolean((i >> (inPins.length - 1 - j)) & 1); });

      const temp: CircuitComponent = { ...gate, properties: { ...gate.properties } };
      inPins.forEach((pin, j) => { temp.properties[pin.id] = inputs[inLabels[j]]; });

      const val = this.evaluateStatic(temp);
      const outputs: Record<string, boolean> = {};
      outLabels.forEach((l) => { outputs[l] = val; });
      rows.push({ inputs, outputs });
    }
    return { gateId: gate.id, gateType: gate.type, inputLabels: inLabels, outputLabels: outLabels, rows };
  }

  // ── D Flip-Flop characteristic table ──

  private dffCharacteristicTable(dff: CircuitComponent): TruthTable {
    return {
      gateId: dff.id,
      gateType: dff.type,
      inputLabels: ["CLK↑", "D"],
      outputLabels: ["Q", "Q̄"],
      rows: [
        { inputs: { "CLK↑": true, "D": false }, outputs: { "Q": false, "Q̄": true } },
        { inputs: { "CLK↑": true, "D": true },  outputs: { "Q": true,  "Q̄": false } },
      ],
    };
  }

  // ── 555 Timer ──

  solve555(timer: CircuitComponent, vcc: number): Timer555State {
    const trig = Number(timer.properties["trig_voltage"] ?? 0);
    const thresh = Number(timer.properties["thresh_voltage"] ?? 0);
    const resetPin = timer.properties["reset"] !== false;
    const ctrl = Number(timer.properties["ctrl_voltage"] ?? (2 / 3) * vcc);
    const threshHigh = ctrl;
    const threshLow = ctrl / 2;

    let ff = timer.properties["_ff"] === true;
    if (!resetPin) ff = false;
    else if (trig < threshLow) ff = true;
    else if (thresh > threshHigh) ff = false;

    const output = ff;
    const dischargeOpen = !ff;
    let mode: Timer555State["mode"] = "idle";
    if (trig < threshLow && thresh <= threshHigh) mode = "monostable";
    if (trig < threshLow || thresh > threshHigh) mode = "astable";

    return { flipFlop: ff, output, dischargeOpen, mode };
  }

  // ── Transient (time-domain) step ──

  solveTransient(
    dt: number,
    prev: Record<string, number>,
  ): { analysis: CircuitAnalysis; state: Record<string, number> } {
    const base = this.solve();
    const st = { ...prev };
    const v = { ...base.nodeVoltages };
    const vcc = base.sourceVoltage || 5;
    const Rtot = Math.max(base.totalResistance, 100);

    for (const cap of this.getByType("capacitor")) {
      const key = `${cap.id}:capV`;
      const prevV = st[key] ?? 0;
      const vA = v[`${cap.id}:a`] ?? 0;
      const vB = v[`${cap.id}:b`] ?? 0;
      const applied = vA - vB;
      const C = cap.value * 1e-6;
      const tau = Rtot * C;
      if (tau > 1e-12) {
        const newV = applied + (prevV - applied) * Math.exp(-dt / tau);
        st[key] = newV;
        v[`${cap.id}:a`] = newV;
        v[`${cap.id}:b`] = 0;
      }
    }

    for (const timer of this.getByType("timer_555")) {
      const capKey = `${timer.id}:capV`;
      const ffKey = `${timer.id}:ff`;
      let capV = st[capKey] ?? 0;
      let ff = (st[ffKey] ?? 0) > 0.5;
      const thHigh = (2 / 3) * vcc;
      const thLow = (1 / 3) * vcc;
      const Ra = 10000;
      const Rb = 10000;
      const Cext = 1e-7;

      if (ff) {
        const tau = (Ra + Rb) * Cext;
        capV = vcc + (capV - vcc) * Math.exp(-dt / tau);
        if (capV >= thHigh) { ff = false; }
      } else {
        const tau = Rb * Cext;
        capV = capV * Math.exp(-dt / tau);
        if (capV <= thLow) { ff = true; }
      }

      st[capKey] = capV;
      st[ffKey] = ff ? 1 : 0;
      v[`${timer.id}:out`] = ff ? vcc : LOGIC_LOW;
      v[`${timer.id}:capV`] = capV;

      base.timer555States[timer.id] = {
        flipFlop: ff,
        output: ff,
        dischargeOpen: !ff,
        mode: "astable",
      };
    }

    for (const dff of this.getByType("d_flipflop")) {
      const clkKey = `${dff.id}:prevClk`;
      const qKey = `${dff.id}:q`;
      const clkV = v[`${dff.id}:clk`] ?? 0;
      const dV = v[`${dff.id}:d`] ?? 0;
      const prevClk = (st[clkKey] ?? 0) >= LOGIC_THRESHOLD;
      const curClk = clkV >= LOGIC_THRESHOLD;
      const risingEdge = !prevClk && curClk;

      let q = (st[qKey] ?? 0) > 0.5;
      if (risingEdge) {
        q = dV >= LOGIC_THRESHOLD;
      }
      st[clkKey] = clkV;
      st[qKey] = q ? 1 : 0;
      v[`${dff.id}:q`] = q ? LOGIC_HIGH : LOGIC_LOW;
      v[`${dff.id}:qn`] = q ? LOGIC_LOW : LOGIC_HIGH;
    }

    const t = (st["__simTime"] ?? 0) + dt;
    st["__simTime"] = t;

    for (const fg of this.getByType("func_gen")) {
      const freq = fg.value;
      const amp = Number(fg.properties["amplitude"] ?? 5);
      const wf = String(fg.properties["waveform"] ?? "square");
      const phase = 2 * Math.PI * freq * t;
      let out: number;
      switch (wf) {
        case "sine":
          out = amp * Math.sin(phase);
          break;
        case "triangle":
          out = amp * (2 / Math.PI) * Math.asin(Math.sin(phase));
          break;
        default:
          out = Math.sin(phase) >= 0 ? amp : 0;
          break;
      }
      v[`${fg.id}:pos`] = out;
      v[`${fg.id}:neg`] = 0;
    }

    const grounded = this.getGroundedPinKeys();
    for (const k of grounded) {
      v[k] = 0;
    }

    return { analysis: { ...base, nodeVoltages: v }, state: st };
  }

  // ── 7-Segment ──

  solve7Segment(seg: CircuitComponent): boolean[] {
    return ["a", "b", "c", "d", "e", "f", "g"].map((id) => seg.properties[id] === true);
  }
}
