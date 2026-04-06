"use client";

import { useEffect, useRef, useState } from "react";
import { useCircuitStore } from "@/store/circuit-store";
import { ComponentEditor } from "@/components/component-editor";
import { RotateCw, Pencil, Trash2, Copy, Palette, GitBranch } from "lucide-react";

interface Props {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
  onRotate: () => void;
  onDelete: () => void;
}

const EDITABLE_TYPES = new Set(["resistor", "capacitor", "inductor", "voltage_source"]);

const COLOR_PRESETS = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#a855f7", label: "Purple" },
  { color: "#22d3ee", label: "Cyan" },
  { color: "",        label: "Default" },
];

const MULTI_INPUT_GATES = new Set(["and_gate", "or_gate", "nand_gate", "nor_gate", "xor_gate"]);

export function NodeContextMenu({ nodeId, x, y, onClose, onRotate, onDelete }: Props) {
  const component = useCircuitStore((s) => s.components.find((c) => c.id === nodeId));
  const copySelected = useCircuitStore((s) => s.copySelected);
  const setNodeColor = useCircuitStore((s) => s.setNodeColor);
  const setGateInputCount = useCircuitStore((s) => s.setGateInputCount);
  const [editing, setEditing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!component) return null;
  const canEdit = EDITABLE_TYPES.has(component.type);
  const isMultiGate = MULTI_INPUT_GATES.has(component.type);
  const currentColor = (component.properties.nodeColor as string) || "";
  const currentInputCount = isMultiGate
    ? Number(component.properties.inputCount ?? component.pins.filter((p) => p.type === "input").length)
    : 0;

  const items: { label: string; icon: React.ReactNode; shortcut?: string; action: () => void; variant?: string }[] = [
    ...(canEdit ? [{ label: "Edit Value", icon: <Pencil size={13} />, action: () => setEditing(true) }] : []),
    { label: "Rotate 90°", icon: <RotateCw size={13} />, shortcut: "R", action: onRotate },
    ...(isMultiGate ? [{ label: "Inputs", icon: <GitBranch size={13} />, action: () => setShowInputs((v) => !v) }] : []),
    { label: "Color", icon: <Palette size={13} />, action: () => setShowColors((v) => !v) },
    { label: "Copy", icon: <Copy size={13} />, shortcut: "Ctrl+C", action: () => { copySelected(); onClose(); } },
    { label: "Delete", icon: <Trash2 size={13} />, shortcut: "Del", action: onDelete, variant: "destructive" },
  ];

  return (
    <div ref={menuRef} className="fixed z-[100]" style={{ left: x, top: y }}>
      {editing ? (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-xl w-48">
          <ComponentEditor component={component} onClose={() => { setEditing(false); onClose(); }} />
        </div>
      ) : (
        <div className="min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-xl">
          <div className="px-2 py-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{component.label}</span>
          </div>
          <div className="h-px bg-border my-0.5" />
          {items.map((item) => (
            <button key={item.label} onClick={item.action}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-colors ${
                item.variant === "destructive"
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-zinc-300 hover:bg-accent"
              }`}>
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && <span className="text-[9px] text-zinc-600">{item.shortcut}</span>}
            </button>
          ))}
          {showInputs && isMultiGate && (
            <>
              <div className="h-px bg-border my-0.5" />
              <div className="px-2 py-1.5">
                <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Input Count</span>
                <div className="flex items-center gap-1 mt-1">
                  {[2, 3, 4, 5].map((n) => (
                    <button key={n}
                      onClick={() => { setGateInputCount(nodeId, n); onClose(); }}
                      className={`w-6 h-6 rounded text-[10px] font-mono border transition-colors ${
                        currentInputCount === n
                          ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                          : "border-zinc-800 text-zinc-600 bg-transparent hover:border-zinc-600"
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {showColors && (
            <>
              <div className="h-px bg-border my-0.5" />
              <div className="px-2 py-1.5 flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    title={preset.label}
                    onClick={() => { setNodeColor(nodeId, preset.color); onClose(); }}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                    style={{
                      background: preset.color || "#3f3f46",
                      borderColor: currentColor === preset.color ? "#fff" : "transparent",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { COLOR_PRESETS };
