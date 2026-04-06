"use client";

import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

interface WireEdgeData {
  voltage?: number;
  current?: number;
  customColor?: string;
  [key: string]: unknown;
}

function voltageToColor(v: number): string {
  if (v >= 4.5) return "#22d3ee";
  if (v >= 2.5) return "#06b6d4";
  if (v >= 1.0) return "#0891b2";
  if (v > 0)    return "#155e75";
  return "#3f3f46";
}

function formatSmall(v: number, unit: string): string {
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k${unit}`;
  if (Math.abs(v) < 0.01 && v !== 0) return `${(v * 1e3).toFixed(1)}m${unit}`;
  return `${v.toFixed(2)}${unit}`;
}

export function VoltLogicEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  animated,
  selected,
}: EdgeProps) {
  const wireData = (data ?? {}) as WireEdgeData;
  const voltage = wireData.voltage ?? 0;
  const current = wireData.current ?? 0;
  const customColor = wireData.customColor;
  const baseColor = customColor || voltageToColor(voltage);
  const showLabel = voltage !== 0 || current !== 0;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (dist < 20) {
    edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = (sourceY + targetY) / 2;
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 0,
      offset: 20,
    });
  }

  const hasVoltage = voltage > 0;
  const glowColor = customColor || baseColor;

  return (
    <>
      {/* Invisible fat hitbox for easier click/hover targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ pointerEvents: "stroke" }}
      />
      {hasVoltage && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: glowColor,
            strokeWidth: 8,
            opacity: 0.15,
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        />
      )}
      {selected && (
        <BaseEdge
          id={`${id}-sel`}
          path={edgePath}
          style={{
            stroke: "#22d3ee",
            strokeWidth: 4,
            opacity: 0.3,
            filter: "drop-shadow(0 0 6px rgba(34,211,238,0.5))",
          }}
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#67e8f9" : baseColor,
          strokeWidth: selected ? 2.5 : 2,
          strokeLinecap: "square",
          filter: hasVoltage ? `drop-shadow(0 0 3px ${glowColor}40)` : undefined,
        }}
        className={animated ? "animated" : ""}
      />
      {showLabel && (
        <foreignObject
          x={labelX - 30} y={labelY - 10}
          width={60} height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center h-full">
            <span
              className="px-1 py-px rounded text-[7px] font-mono leading-none"
              style={{
                backgroundColor: "rgba(10,10,15,0.85)",
                color: baseColor,
                border: `1px solid ${baseColor}33`,
              }}
            >
              {formatSmall(voltage, "V")} {formatSmall(current, "A")}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const edgeTypes = {
  voltlogicEdge: VoltLogicEdge,
};
