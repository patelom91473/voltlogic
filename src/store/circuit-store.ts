import { create } from "zustand";
import type { Edge, OnEdgesChange, Connection, Node, OnNodesChange } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type {
  CircuitComponent,
  CircuitAnalysis,
  PaletteItem,
  Pin,
  ProbeEntry,
  ScopeSample,
} from "@/types/circuit";
import { CircuitSolver } from "@/engine/circuit-solver";

export interface CircuitNodeData extends Record<string, unknown> {
  component: CircuitComponent;
}

interface ClipboardEntry {
  components: CircuitComponent[];
  edges: Edge[];
}

interface CircuitState {
  nodes: Node<CircuitNodeData>[];
  edges: Edge[];
  components: CircuitComponent[];
  isPowered: boolean;
  analysis: CircuitAnalysis | null;
  selectedComponentId: string | null;
  clipboard: ClipboardEntry | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  addComponent: (item: PaletteItem, position: { x: number; y: number }) => void;
  removeComponent: (id: string) => void;
  updateComponentValue: (id: string, value: number) => void;
  togglePower: () => void;
  setGateInput: (componentId: string, pinId: string, value: boolean) => void;
  set555Property: (componentId: string, key: string, value: number | boolean) => void;
  set7SegInput: (componentId: string, pinId: string, value: boolean) => void;
  selectComponent: (id: string | null) => void;
  rotateComponent: (id: string) => void;
  rotateNodes: (ids: string[]) => void;
  toggleSwitch: (id: string) => void;
  setGateInputCount: (id: string, count: number) => void;
  setPotPosition: (id: string, position: number) => void;
  setFuncGenWaveform: (id: string, waveform: string) => void;
  setButtonPressed: (id: string, pressed: boolean) => void;
  setNodeColor: (id: string, color: string) => void;
  setEdgeColor: (edgeId: string, color: string) => void;
  loadCircuit: (data: VoltLogicSaveFile) => void;
  _fitViewToken: number;

  simRunning: boolean;
  simTime: number;
  probes: ProbeEntry[];
  scopeTraces: Record<string, ScopeSample[]>;
  scopeOpen: boolean;
  _transientState: Record<string, number>;
  toggleSim: () => void;
  simTick: () => void;
  addProbe: (nodeKey: string, label: string) => void;
  removeProbe: (id: string) => void;
  setScopeOpen: (open: boolean) => void;

  copySelected: () => void;
  pasteClipboard: () => void;
  recalculate: () => void;
}

export interface VoltLogicSaveFile {
  components: CircuitComponent[];
  edges: { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; data?: unknown }[];
  nodes: { id: string; type?: string; position: { x: number; y: number } }[];
}

let nextId = 1;
let probeCounter = 0;

const SIM_DT = 0.0001;
const SIM_STEPS_PER_TICK = 10;
const MAX_SCOPE_SAMPLES = 2000;
const SCOPE_COLORS = ["#4ade80", "#f97316", "#3b82f6", "#eab308", "#ec4899", "#a78bfa"];

const FALLBACK_ANALYSIS: CircuitAnalysis = {
  totalResistance: 0,
  totalCurrent: 0,
  sourceVoltage: 0,
  terminalVoltage: 0,
  internalResistance: 0,
  power: 0,
  nodeVoltages: {},
  branchCurrents: {},
  truthTables: [],
  timer555States: {},
  sevenSegmentStates: {},
  floatingReference: true,
};

function snapTo20(v: number): number {
  return Math.round(v / 20) * 20;
}

function createComponentFromPalette(
  item: PaletteItem,
  position: { x: number; y: number }
): CircuitComponent {
  const id = `${item.type}_${nextId++}`;
  const pins: Pin[] = item.pins.map((p) => ({ ...p, voltage: 0, current: 0 }));
  const properties: Record<string, number | string | boolean> = {};

  if (item.category === "logic") {
    pins.filter((p) => p.type === "input").forEach((p) => { properties[p.id] = false; });
  }
  if (item.type === "timer_555") {
    properties["_ff"] = false;
    properties["trig_voltage"] = 0;
    properties["thresh_voltage"] = 0;
    properties["ctrl_voltage"] = (2 / 3) * item.defaultValue;
    properties["reset"] = true;
  }
  if (item.type === "seven_segment") {
    ["a", "b", "c", "d", "e", "f", "g"].forEach((s) => { properties[s] = false; });
  }
  if (item.type === "voltage_source") {
    properties["internalResistance"] = 0.1;
  }
  if (item.type === "logic_switch") {
    properties["on"] = false;
  }
  if (item.type === "potentiometer") {
    properties["position"] = 0.5;
  }
  if (item.type === "npn_transistor") {
    properties["beta"] = 100;
  }
  if (item.type === "func_gen") {
    properties["waveform"] = "square";
    properties["amplitude"] = 5;
  }
  if (item.type === "momentary_button") {
    properties["pressed"] = false;
  }
  if (item.type === "d_flipflop") {
    properties["_q"] = false;
    properties["_prevClk"] = false;
    properties["d"] = false;
    properties["clk"] = false;
  }

  return {
    id,
    type: item.type,
    category: item.category,
    label: item.label,
    value: item.defaultValue,
    unit: item.unit,
    pins,
    position: { x: snapTo20(position.x), y: snapTo20(position.y) },
    rotation: 0,
    properties,
  };
}

function syncNodeData(
  nodes: Node<CircuitNodeData>[],
  components: CircuitComponent[]
): Node<CircuitNodeData>[] {
  const map = new Map(components.map((c) => [c.id, c]));
  return nodes.map((n) => {
    const comp = map.get(n.id);
    return comp ? { ...n, data: { component: comp } } : n;
  });
}

function voltageToColor(voltage: number): string {
  if (voltage >= 4.5) return "#22d3ee";
  if (voltage >= 2.5) return "#06b6d4";
  if (voltage >= 1.0) return "#0891b2";
  if (voltage > 0) return "#155e75";
  return "#3f3f46";
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  nodes: [],
  edges: [],
  components: [],
  isPowered: false,
  analysis: null,
  selectedComponentId: null,
  clipboard: null,
  _fitViewToken: 0,

  simRunning: false,
  simTime: 0,
  probes: [],
  scopeTraces: {},
  scopeOpen: false,
  _transientState: {},

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<CircuitNodeData>[] });
    if (changes.some((c) => c.type === "position")) get().recalculate();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().recalculate();
  },

  onConnect: (connection) => {
    const newEdges = addEdge(
      { ...connection, type: "voltlogicEdge", animated: get().isPowered, style: { stroke: "#22d3ee", strokeWidth: 2 } },
      get().edges
    );
    set({ edges: newEdges });
    get().recalculate();
  },

  addComponent: (item, position) => {
    const component = createComponentFromPalette(item, position);
    const node: Node<CircuitNodeData> = {
      id: component.id,
      type: `circuit_${component.type}`,
      position: component.position,
      data: { component },
    };
    set((s) => ({ nodes: [...s.nodes, node], components: [...s.components, component] }));
    get().recalculate();
  },

  removeComponent: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      components: s.components.filter((c) => c.id !== id),
      selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
    }));
    get().recalculate();
  },

  updateComponentValue: (id, value) => {
    set((s) => {
      const components = s.components.map((c) => c.id === id ? { ...c, value } : c);
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  togglePower: () => {
    const powered = !get().isPowered;
    set((s) => ({
      isPowered: powered,
      edges: s.edges.map((e) => ({ ...e, animated: powered })),
    }));
    get().recalculate();
  },

  setGateInput: (componentId, pinId, value) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === componentId ? { ...c, properties: { ...c.properties, [pinId]: value } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  set555Property: (componentId, key, value) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === componentId ? { ...c, properties: { ...c.properties, [key]: value } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  set7SegInput: (componentId, pinId, value) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === componentId ? { ...c, properties: { ...c.properties, [pinId]: value } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  selectComponent: (id) => set({ selectedComponentId: id }),

  rotateComponent: (id) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
  },

  rotateNodes: (ids) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    set((s) => {
      const components = s.components.map((c) =>
        idSet.has(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
  },

  toggleSwitch: (id) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, on: !(c.properties["on"] === true) } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  setGateInputCount: (id, count) => {
    set((s) => {
      const components = s.components.map((c) => {
        if (c.id !== id) return c;
        if (c.type === "not_gate") return c;
        const newPins: Pin[] = [];
        for (let i = 1; i <= count; i++) {
          newPins.push({ id: `in${i}`, label: String.fromCharCode(64 + i), type: "input", voltage: 0, current: 0 });
        }
        newPins.push({ id: "out", label: "Y", type: "output", voltage: 0, current: 0 });
        const newProps: Record<string, number | string | boolean> = { ...c.properties, inputCount: count };
        for (let i = 1; i <= count; i++) {
          if (newProps[`in${i}`] === undefined) newProps[`in${i}`] = false;
        }
        for (let i = count + 1; i <= 5; i++) { delete newProps[`in${i}`]; }
        return { ...c, pins: newPins, properties: newProps };
      });
      const comp = components.find((c) => c.id === id);
      const validPins = comp ? new Set(comp.pins.map((p) => p.id)) : new Set<string>();
      const edges = s.edges.filter((e) => {
        if (e.source === id && e.sourceHandle && !validPins.has(e.sourceHandle)) return false;
        if (e.target === id && e.targetHandle && !validPins.has(e.targetHandle)) return false;
        return true;
      });
      return { components, edges, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  setPotPosition: (id, position) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, position } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  setFuncGenWaveform: (id, waveform) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, waveform } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
  },

  setButtonPressed: (id, pressed) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, pressed } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
    get().recalculate();
  },

  setNodeColor: (id, color) => {
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id ? { ...c, properties: { ...c.properties, nodeColor: color } } : c
      );
      return { components, nodes: syncNodeData(s.nodes, components) };
    });
  },

  setEdgeColor: (edgeId, color) => {
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...((e.data as Record<string, unknown>) ?? {}), customColor: color } }
          : e
      ),
    }));
  },

  toggleSim: () => {
    const running = !get().simRunning;
    if (running && !get().isPowered) {
      set({ isPowered: true, edges: get().edges.map((e) => ({ ...e, animated: true })) });
    }
    if (!running) {
      set({ simRunning: false });
      return;
    }
    set({ simRunning: true, simTime: 0, scopeTraces: {}, _transientState: {} });
  },

  simTick: () => {
    const { components, edges, isPowered, probes, simTime, _transientState } = get();
    if (!isPowered || components.length === 0) return;

    const solver = new CircuitSolver(components, edges);
    let st = { ..._transientState };
    let analysis: CircuitAnalysis | null = null;

    try {
      for (let i = 0; i < SIM_STEPS_PER_TICK; i++) {
        const result = solver.solveTransient(SIM_DT, st);
        st = result.state;
        analysis = result.analysis;
      }
    } catch {
      return;
    }

    const t = simTime + SIM_STEPS_PER_TICK * SIM_DT;

    const traces = { ...get().scopeTraces };
    for (const probe of probes) {
      const v = analysis?.nodeVoltages[probe.nodeKey] ?? 0;
      const arr = [...(traces[probe.nodeKey] ?? []), { t, v }];
      if (arr.length > MAX_SCOPE_SAMPLES) arr.splice(0, arr.length - MAX_SCOPE_SAMPLES);
      traces[probe.nodeKey] = arr;
    }

    const coloredEdges = get().edges.map((e) => {
      const sv = analysis?.nodeVoltages[`${e.source}:${e.sourceHandle}`] ?? 0;
      const prev = (e.data as Record<string, unknown>) ?? {};
      const customColor = prev.customColor as string | undefined;
      const wireColor = customColor || voltageToColor(sv);
      return {
        ...e,
        data: { ...prev, voltage: sv, current: analysis?.branchCurrents[e.id] ?? 0, customColor },
        style: { stroke: wireColor, strokeWidth: 2 },
      };
    });

    set({ simTime: t, _transientState: st, analysis, scopeTraces: traces, edges: coloredEdges });
  },

  addProbe: (nodeKey, label) => {
    const existing = get().probes;
    if (existing.some((p) => p.nodeKey === nodeKey)) return;
    const color = SCOPE_COLORS[existing.length % SCOPE_COLORS.length];
    const id = `probe_${++probeCounter}`;
    set({ probes: [...existing, { id, nodeKey, label, color }], scopeOpen: true });
  },

  removeProbe: (id) => {
    const probes = get().probes.filter((p) => p.id !== id);
    const removed = get().probes.find((p) => p.id === id);
    const traces = { ...get().scopeTraces };
    if (removed) delete traces[removed.nodeKey];
    set({ probes, scopeTraces: traces, scopeOpen: probes.length > 0 });
  },

  setScopeOpen: (open) => set({ scopeOpen: open }),

  loadCircuit: (data) => {
    const maxNumericId = data.components.reduce((max, c) => {
      const match = c.id.match(/_(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    nextId = maxNumericId + 1;

    const rfNodes: Node<CircuitNodeData>[] = data.components.map((comp) => {
      const saved = data.nodes.find((n) => n.id === comp.id);
      return {
        id: comp.id,
        type: `circuit_${comp.type}`,
        position: saved?.position ?? comp.position,
        data: { component: comp },
      };
    });

    const rfEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      type: "voltlogicEdge",
      data: (e.data as Record<string, unknown>) ?? {},
      style: { stroke: "#22d3ee", strokeWidth: 2 },
    }));

    set({
      components: data.components,
      nodes: rfNodes,
      edges: rfEdges,
      isPowered: false,
      analysis: null,
      selectedComponentId: null,
      clipboard: null,
      _fitViewToken: get()._fitViewToken + 1,
      simRunning: false,
      simTime: 0,
      probes: [],
      scopeTraces: {},
      scopeOpen: false,
      _transientState: {},
    });
  },

  copySelected: () => {
    const { nodes, edges, components } = get();
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const { selectedComponentId } = get();
    if (selectedIds.size === 0 && selectedComponentId) selectedIds.add(selectedComponentId);
    if (selectedIds.size === 0) return;

    const copiedComps = components.filter((c) => selectedIds.has(c.id));
    const copiedEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
    set({ clipboard: { components: copiedComps, edges: copiedEdges } });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.components.length === 0) return;

    const idMap = new Map<string, string>();
    const offset = 20;

    clipboard.components.forEach((c) => {
      const newId = `${c.type}_${nextId++}`;
      idMap.set(c.id, newId);
    });

    const newComponents = clipboard.components.map((c) => ({
      ...c,
      id: idMap.get(c.id)!,
      position: { x: c.position.x + offset, y: c.position.y + offset },
      pins: c.pins.map((p) => ({ ...p })),
      properties: { ...c.properties },
    }));

    const newNodes: Node<CircuitNodeData>[] = newComponents.map((comp) => ({
      id: comp.id,
      type: `circuit_${comp.type}`,
      position: comp.position,
      data: { component: comp },
      selected: true,
    }));

    const newEdges = clipboard.edges.map((e) => ({
      ...e,
      id: `e_${nextId++}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    set((s) => ({
      nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
      edges: [...s.edges, ...newEdges],
      components: [...s.components, ...newComponents],
    }));
    get().recalculate();
  },

  recalculate: () => {
    const { components, edges, isPowered } = get();
    if (!isPowered || components.length === 0) {
      set({ analysis: null });
      return;
    }
    const solver = new CircuitSolver(components, edges);
    let analysis: CircuitAnalysis;
    try {
      analysis = solver.solve();
    } catch {
      analysis = FALLBACK_ANALYSIS;
    }

    const coloredEdges = get().edges.map((e) => {
      const sv = analysis.nodeVoltages[`${e.source}:${e.sourceHandle}`] ?? 0;
      const prev = (e.data as Record<string, unknown>) ?? {};
      const customColor = prev.customColor as string | undefined;
      const wireColor = customColor || voltageToColor(sv);
      return {
        ...e,
        data: { ...prev, voltage: sv, current: analysis.branchCurrents[e.id] ?? 0, customColor },
        style: { stroke: wireColor, strokeWidth: 2 },
      };
    });
    set({ analysis, edges: coloredEdges });
  },
}));
