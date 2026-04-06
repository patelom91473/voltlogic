"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCircuitStore } from "@/store/circuit-store";
import type { CircuitComponent } from "@/types/circuit";

interface Props {
  component: CircuitComponent;
  onClose: () => void;
}

export function ComponentEditor({ component, onClose }: Props) {
  const updateValue = useCircuitStore((s) => s.updateComponentValue);
  const set555 = useCircuitStore((s) => s.set555Property);
  const [value, setValue] = useState(String(component.value));
  const [intR, setIntR] = useState(String(component.properties["internalResistance"] ?? 0));
  const inputRef = useRef<HTMLInputElement>(null);
  const isSource = component.type === "voltage_source";

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) updateValue(component.id, num);
    if (isSource) {
      const r = parseFloat(intR);
      if (!isNaN(r) && r >= 0) set555(component.id, "internalResistance", r);
    }
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
        {component.label}
      </Label>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Input ref={inputRef} type="number" value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
          className="h-7 text-xs font-mono" min={0} step="any" />
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{component.unit}</span>
      </div>
      {isSource && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Label className="text-[8px] font-mono text-zinc-600 shrink-0">r_int</Label>
          <Input type="number" value={intR}
            onChange={(e) => setIntR(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
            className="h-6 text-[10px] font-mono" min={0} step="any" />
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">Ω</span>
        </div>
      )}
      <div className="flex justify-end gap-1 mt-1">
        <button onClick={onClose}
          className="px-2 py-0.5 text-[9px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">ESC</button>
        <button onClick={handleSubmit}
          className="px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-600/20 text-cyan-300 border border-cyan-700 hover:bg-cyan-600/30 transition-colors">SET</button>
      </div>
    </div>
  );
}
