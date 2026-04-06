"use client";

import { useCallback, useRef, useState, useEffect, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  useUpdateNodeInternals,
  type ReactFlowInstance,
  type Node,
  type Edge,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCircuitStore } from "@/store/circuit-store";
import { nodeTypes } from "@/components/circuit-nodes";
import { edgeTypes } from "@/components/custom-edge";
import { NodeContextMenu, COLOR_PRESETS } from "@/components/node-context-menu";
import type { PaletteItem } from "@/types/circuit";

const PAN_THRESHOLD = 5;

interface CtxMenu { nodeId: string; x: number; y: number }
interface EdgeCtx { edgeId: string; x: number; y: number }

function EdgeContextMenu({ edgeId, x, y, onClose }: EdgeCtx & { onClose: () => void }) {
  const setEdgeColor = useCircuitStore((s) => s.setEdgeColor);
  const addProbe = useCircuitStore((s) => s.addProbe);
  const edge = useCircuitStore((s) => s.edges.find((e) => e.id === edgeId));
  const components = useCircuitStore((s) => s.components);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentColor = ((edge?.data as Record<string, unknown>)?.customColor as string) || "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleProbe = () => {
    if (!edge) return;
    const nodeKey = `${edge.source}:${edge.sourceHandle}`;
    const comp = components.find((c) => c.id === edge.source);
    const label = comp ? `${comp.label} · ${edge.sourceHandle}` : nodeKey;
    addProbe(nodeKey, label);
    onClose();
  };

  return (
    <div ref={menuRef} className="fixed z-[100]" style={{ left: x, top: y }}>
      <div className="min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-xl">
        <div className="px-2 py-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Wire</span>
        </div>
        <div className="h-px bg-border my-0.5" />
        <button onClick={handleProbe}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono text-emerald-400 hover:bg-emerald-500/10 transition-colors">
          <svg width="13" height="13" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
          Probe
        </button>
        <div className="h-px bg-border my-0.5" />
        <div className="px-2 py-1">
          <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Color</span>
        </div>
        <div className="px-2 py-1.5 flex items-center gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              title={preset.label}
              onClick={() => { setEdgeColor(edgeId, preset.color); onClose(); }}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
              style={{
                background: preset.color || "#3f3f46",
                borderColor: currentColor === preset.color ? "#fff" : "transparent",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CanvasInner() {
  const nodes = useCircuitStore((s) => s.nodes);
  const edges = useCircuitStore((s) => s.edges);
  const onNodesChange = useCircuitStore((s) => s.onNodesChange);
  const onEdgesChange = useCircuitStore((s) => s.onEdgesChange);
  const onConnect = useCircuitStore((s) => s.onConnect);
  const addComponent = useCircuitStore((s) => s.addComponent);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const rotateComponent = useCircuitStore((s) => s.rotateComponent);
  const rotateNodes = useCircuitStore((s) => s.rotateNodes);
  const removeComponent = useCircuitStore((s) => s.removeComponent);
  const copySelected = useCircuitStore((s) => s.copySelected);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const simRunning = useCircuitStore((s) => s.simRunning);
  const simTick = useCircuitStore((s) => s.simTick);

  const fitViewToken = useCircuitStore((s) => s._fitViewToken);

  const updateNodeInternals = useUpdateNodeInternals();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [edgeCtx, setEdgeCtx] = useState<EdgeCtx | null>(null);

  const prevFitToken = useRef(fitViewToken);
  useEffect(() => {
    if (fitViewToken !== prevFitToken.current && rfInstance) {
      prevFitToken.current = fitViewToken;
      setTimeout(() => rfInstance.fitView({ padding: 0.2, duration: 300 }), 50);
    }
  }, [fitViewToken, rfInstance]);

  useEffect(() => {
    if (!simRunning) return;
    const id = setInterval(simTick, 20);
    return () => clearInterval(id);
  }, [simRunning, simTick]);

  const rmbOrigin = useRef<{ x: number; y: number } | null>(null);
  const rmbDragged = useRef(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button === 2) { rmbOrigin.current = { x: e.clientX, y: e.clientY }; rmbDragged.current = false; }
    };
    const onMove = (e: MouseEvent) => {
      if (rmbOrigin.current && !rmbDragged.current) {
        const dx = e.clientX - rmbOrigin.current.x;
        const dy = e.clientY - rmbOrigin.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > PAN_THRESHOLD) rmbDragged.current = true;
      }
    };
    const onUp = () => { rmbOrigin.current = null; };
    const onCtx = (e: MouseEvent) => { if (rmbDragged.current) { e.preventDefault(); rmbDragged.current = false; } };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("contextmenu", onCtx, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("contextmenu", onCtx, true);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const currentNodes = useCircuitStore.getState().nodes;
        const rfSelected = currentNodes.filter((n) => n.selected).map((n) => n.id);
        const currentSelId = useCircuitStore.getState().selectedComponentId;
        const ids = rfSelected.length > 0 ? rfSelected : currentSelId ? [currentSelId] : [];
        if (ids.length > 0) {
          rotateNodes(ids);
          requestAnimationFrame(() => ids.forEach((id) => updateNodeInternals(id)));
        }
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "c" || e.key === "C")) { e.preventDefault(); copySelected(); }
      if (mod && (e.key === "v" || e.key === "V")) { e.preventDefault(); pasteClipboard(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rotateNodes, updateNodeInternals, copySelected, pasteClipboard]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/voltlogic-component");
    if (!raw || !rfInstance) return;
    const item: PaletteItem = JSON.parse(raw);
    const pos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    pos.x = Math.round(pos.x / 20) * 20;
    pos.y = Math.round(pos.y / 20) * 20;
    addComponent(item, pos);
  }, [rfInstance, addComponent]);

  const onNodeContextMenu = useCallback((e: ReactMouseEvent, node: Node) => {
    e.preventDefault();
    if (rmbDragged.current) return;
    setCtxMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
    setEdgeCtx(null);
    selectComponent(node.id);
  }, [selectComponent]);

  const onEdgeContextMenu = useCallback((e: ReactMouseEvent, edge: Edge) => {
    e.preventDefault();
    if (rmbDragged.current) return;
    setEdgeCtx({ edgeId: edge.id, x: e.clientX, y: e.clientY });
    setCtxMenu(null);
  }, []);

  const closeCtx = useCallback(() => { setCtxMenu(null); setEdgeCtx(null); }, []);

  const handleRotateFromCtx = useCallback((nodeId: string) => {
    rotateComponent(nodeId);
    requestAnimationFrame(() => updateNodeInternals(nodeId));
    closeCtx();
  }, [rotateComponent, updateNodeInternals, closeCtx]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_, node) => { selectComponent(node.id); closeCtx(); }}
        onPaneClick={() => { selectComponent(null); closeCtx(); }}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panOnScroll
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-zinc-950"
        defaultEdgeOptions={{
          type: "voltlogicEdge",
          style: { stroke: "#3f3f46", strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls
          className="!bg-zinc-900/90 !border-zinc-800 !rounded-md [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-500 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-300"
        />
        <MiniMap className="!bg-zinc-900/90 !border-zinc-800 !rounded-md" nodeColor="#22d3ee" maskColor="rgba(0,0,0,0.8)" />
      </ReactFlow>

      {ctxMenu && (
        <NodeContextMenu
          nodeId={ctxMenu.nodeId}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={closeCtx}
          onRotate={() => handleRotateFromCtx(ctxMenu.nodeId)}
          onDelete={() => { removeComponent(ctxMenu.nodeId); closeCtx(); }}
        />
      )}

      {edgeCtx && (
        <EdgeContextMenu
          edgeId={edgeCtx.edgeId}
          x={edgeCtx.x}
          y={edgeCtx.y}
          onClose={closeCtx}
        />
      )}
    </>
  );
}

export function CircuitCanvas() {
  return (
    <div className="absolute inset-0">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
