"use client";

import { type DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PALETTE_ITEMS, type ComponentCategory } from "@/types/circuit";
import { PaletteIcon } from "@/components/palette-icons";

const CATEGORY_META: Record<ComponentCategory, { label: string; order: number }> = {
  source:      { label: "Sources",     order: 0 },
  passive:     { label: "Passive",     order: 1 },
  active:      { label: "Active",      order: 2 },
  logic:       { label: "Logic",       order: 3 },
  measurement: { label: "Meters",      order: 4 },
  ic:          { label: "ICs",         order: 5 },
};

const CATEGORY_ORDER = (Object.keys(CATEGORY_META) as ComponentCategory[])
  .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);

export function ComponentPalette() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_META[cat].label,
    items: PALETTE_ITEMS.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const onDragStart = (e: DragEvent, item: (typeof PALETTE_ITEMS)[number]) => {
    e.dataTransfer.setData("application/voltlogic-component", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="h-full rounded-none border-r border-t-0 border-b-0 border-l-0 bg-card">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Components
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-7rem)]">
          <div className="px-2 pb-3 space-y-3">
            {grouped.map((group) => (
              <div key={group.category}>
                <p className="px-1 mb-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-cyan-400/70">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => (
                    <Tooltip key={item.type}>
                      <TooltipTrigger
                        draggable
                        onDragStart={(e: DragEvent) => onDragStart(e, item)}
                        className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-transparent p-1.5 text-center transition-all hover:border-cyan-500/40 hover:bg-cyan-950/10 cursor-grab active:cursor-grabbing"
                      >
                        <PaletteIcon type={item.type} />
                        <span className="text-[8px] font-mono text-foreground/70 leading-tight">
                          {item.label}
                        </span>
                        <Badge variant="secondary"
                          className="h-3.5 px-1 text-[7px] font-mono bg-transparent border-border/30">
                          {item.defaultValue}{item.unit}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-mono">
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-muted-foreground text-[10px]">
                          Drag to canvas · {item.pins.length} pin{item.pins.length > 1 ? "s" : ""}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <Separator className="mt-2 opacity-30" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
