"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCircuitStore, type VoltLogicSaveFile } from "@/store/circuit-store";
import { PALETTE_ITEMS, type PaletteItem, type ComponentType } from "@/types/circuit";
import { PaletteIcon } from "@/components/palette-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilePlus2,
  Save,
  Upload,
  Image as ImageIcon,
  Keyboard,
  Search,
  ChevronDown,
  X,
  Play,
  Square,
  Activity,
} from "lucide-react";

const COMPONENT_INFO: Partial<Record<ComponentType, string>> = {
  voltage_source: "Ideal DC voltage source with configurable internal resistance.",
  ground: "Reference node at 0 V for establishing circuit ground.",
  resistor: "Passive 2-terminal element that opposes current flow (Ohm's Law: V=IR).",
  capacitor: "Stores energy in an electric field between two plates (C=Q/V).",
  inductor: "Stores energy in a magnetic field when current flows through a coil.",
  led: "Light-Emitting Diode — emits photons when forward-biased above its threshold voltage.",
  logic_switch: "Manual logic input — outputs 5 V (HIGH) or 0 V (LOW) via toggle.",
  logic_led: "Single-input logic indicator — glows when input ≥ 2.5 V.",
  and_gate: "2-input AND gate — output HIGH only when both inputs are HIGH.",
  or_gate: "2-input OR gate — output HIGH when at least one input is HIGH.",
  not_gate: "Inverter — output is the complement of the input.",
  nand_gate: "2-input NAND gate — inverted AND; LOW only when both inputs HIGH.",
  nor_gate: "2-input NOR gate — inverted OR; HIGH only when both inputs LOW.",
  xor_gate: "2-input XOR gate — HIGH when inputs differ.",
  voltmeter: "High-impedance probe that measures voltage difference between two nodes.",
  ammeter: "Zero-resistance series meter that measures current through a branch.",
  potentiometer: "3-terminal variable resistor with interactive slider to set wiper position.",
  npn_transistor: "NPN bipolar junction transistor — base current controls collector-emitter flow (Ic=β·Ib).",
  d_flipflop: "Edge-triggered D flip-flop — captures Data on rising CLK edge; outputs Q and Q̄.",
  func_gen: "Signal generator — outputs Square, Sine, or Triangle waveforms at configurable frequency.",
  momentary_button: "Momentary push-button — outputs HIGH (5 V) only while held down; releases to LOW.",
  timer_555: "8-pin IC used for pulse generation, timing, and oscillation circuits.",
  seven_segment: "7-segment LED display driven by individual segment inputs (a–g).",
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) handler();
    };
    document.addEventListener("mousedown", cb);
    return () => document.removeEventListener("mousedown", cb);
  }, [ref, handler]);
}

function DropMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
      >
        {label}
        <ChevronDown size={10} className="opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[200] min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, shortcut, onClick }: {
  icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono text-zinc-300 hover:bg-accent transition-colors"
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-[9px] text-zinc-600">{shortcut}</span>}
    </button>
  );
}

function validateSaveFile(data: unknown): data is VoltLogicSaveFile {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.components) || !Array.isArray(obj.edges) || !Array.isArray(obj.nodes)) return false;
  for (const c of obj.components as Record<string, unknown>[]) {
    if (typeof c.id !== "string" || typeof c.type !== "string" || !Array.isArray(c.pins) || typeof c.position !== "object") return false;
  }
  for (const e of obj.edges as Record<string, unknown>[]) {
    if (typeof e.id !== "string" || typeof e.source !== "string" || typeof e.target !== "string") return false;
  }
  return true;
}

export function GlobalHeader() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const addComponent = useCircuitStore((s) => s.addComponent);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const simRunning = useCircuitStore((s) => s.simRunning);
  const toggleSim = useCircuitStore((s) => s.toggleSim);
  const scopeOpen = useCircuitStore((s) => s.scopeOpen);
  const setScopeOpen = useCircuitStore((s) => s.setScopeOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (cmdOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [cmdOpen]);

  const filtered = PALETTE_ITEMS.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.type.replace(/_/g, " ").includes(q) ||
      (COMPONENT_INFO[item.type] ?? "").toLowerCase().includes(q)
    );
  });

  const handlePlace = useCallback(
    (item: PaletteItem) => {
      addComponent(item, { x: 400, y: 300 });
      setCmdOpen(false);
    },
    [addComponent],
  );

  const handleNewCircuit = useCallback(() => {
    if (confirm("Clear the entire canvas? This cannot be undone.")) {
      window.location.reload();
    }
  }, []);

  const handleSave = useCallback(() => {
    const state = useCircuitStore.getState();
    // Each entry is a full CircuitComponent: rotation, properties.nodeColor, and all pins/properties round-trip on load.
    const payload = {
      components: state.components,
      edges: state.edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
        data: e.data,
      })),
      nodes: state.nodes.map((n) => ({
        id: n.id, type: n.type, position: n.position,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "circuit-save.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!validateSaveFile(data)) {
          alert("Invalid VoltLogic save file. Expected components, edges, and nodes arrays.");
          return;
        }
        loadCircuit(data);
      } catch {
        alert("Failed to parse the file. Ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [loadCircuit]);

  const handleExportImage = useCallback(() => {
    const svg = document.querySelector<SVGSVGElement>(".react-flow__viewport");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const bbox = svg.getBoundingClientRect();
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    const data = new XMLSerializer().serializeToString(svg);
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `voltlogic-export-${Date.now()}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
  }, []);

  const HOTKEYS = [
    { keys: "R", desc: "Rotate selected component 90°" },
    { keys: "Ctrl + C", desc: "Copy selected component(s)" },
    { keys: "Ctrl + V", desc: "Paste clipboard" },
    { keys: "Ctrl + K", desc: "Open component search" },
    { keys: "Delete / Backspace", desc: "Delete selected" },
    { keys: "Right-Click Drag", desc: "Pan the viewport" },
    { keys: "Scroll", desc: "Zoom in / out" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-9 items-center gap-1 border-b border-border bg-card/90 backdrop-blur-md px-3">
        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-3">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
          <span className="text-[11px] font-mono font-bold tracking-tight text-foreground">
            VOLTLOGIC
          </span>
          <span className="text-[8px] font-mono text-zinc-600 tracking-widest">v0.2</span>
        </div>

        {/* Menu items */}
        <DropMenu label="File">
          <MenuItem icon={<FilePlus2 size={13} />} label="New Circuit" onClick={handleNewCircuit} />
          <div className="h-px bg-border my-0.5" />
          <MenuItem icon={<Save size={13} />} label="Download Circuit" shortcut="Ctrl+S" onClick={handleSave} />
          <MenuItem icon={<Upload size={13} />} label="Upload Circuit" onClick={handleLoad} />
          <div className="h-px bg-border my-0.5" />
          <MenuItem icon={<ImageIcon size={13} />} label="Export as PNG" onClick={handleExportImage} />
        </DropMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onFileSelected}
        />

        <DropMenu label="Help">
          <MenuItem icon={<Keyboard size={13} />} label="Keyboard Shortcuts" onClick={() => setHelpOpen(true)} />
        </DropMenu>

        {/* Sim + Scope controls */}
        <div className="flex items-center gap-1 ml-2 border-l border-zinc-800 pl-2">
          <button onClick={toggleSim}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
              simRunning
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                : "text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-600"
            }`}>
            {simRunning ? <Square size={10} /> : <Play size={10} />}
            {simRunning ? "Stop" : "Simulate"}
          </button>
          <button onClick={() => setScopeOpen(!scopeOpen)}
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-mono transition-colors ${
              scopeOpen
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                : "text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-600"
            }`}
            title="Toggle oscilloscope">
            <Activity size={11} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Command search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-border/40 text-[10px] font-mono text-zinc-500 hover:border-cyan-500/40 hover:text-zinc-300 transition-colors"
        >
          <Search size={11} />
          <span>Search components...</span>
          <kbd className="ml-2 px-1 py-px rounded bg-zinc-800 text-[9px] text-zinc-500 border border-zinc-700">Ctrl+K</kbd>
        </button>
      </header>

      {/* ── Command Palette Dialog ────────────────────────────────── */}
      <Dialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-zinc-950 border-zinc-800">
          <div className="flex items-center gap-2 px-3 border-b border-zinc-800">
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components…"
              className="flex-1 bg-transparent py-3 text-sm font-mono text-zinc-200 outline-none placeholder:text-zinc-600"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-600 hover:text-zinc-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs font-mono text-zinc-600">
                No components match &ldquo;{query}&rdquo;
              </p>
            )}
            {filtered.map((item) => (
              <div
                key={item.type}
                className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-zinc-900 cursor-default group"
              >
                <div className="mt-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  <PaletteIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-zinc-200">{item.label}</span>
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">{item.category}</span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 leading-relaxed mt-0.5">
                    {COMPONENT_INFO[item.type] ?? `${item.pins.length}-pin ${item.category} component.`}
                  </p>
                </div>
                <button
                  onClick={() => handlePlace(item)}
                  className="shrink-0 px-2 py-1 rounded text-[10px] font-mono font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  Place
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Help / Hotkeys Dialog ────────────────────────────────── */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[380px] bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono text-zinc-200">Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-2">
            {HOTKEYS.map((h) => (
              <div key={h.keys} className="flex items-center justify-between px-1 py-1.5">
                <span className="text-xs font-mono text-zinc-400">{h.desc}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300 border border-zinc-700">
                  {h.keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
