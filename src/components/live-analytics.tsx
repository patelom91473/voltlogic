"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCircuitStore } from "@/store/circuit-store";

function fmt(value: number, unit: string, d = 3): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M${unit}`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}k${unit}`;
  if (Math.abs(value) < 0.001 && value !== 0) return `${(value * 1e3).toFixed(1)}m${unit}`;
  return `${value.toFixed(d)}${unit}`;
}

function Metric({ label, value, unit, color }: {
  label: string; value: number | null; unit: string; color: string;
}) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-2">
      <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-mono font-bold leading-none ${color}`}>
          {value !== null ? fmt(value, "", 2) : "—"}
        </span>
        <span className="text-[9px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function SchematicView() {
  const analysis = useCircuitStore((s) => s.analysis);
  const components = useCircuitStore((s) => s.components);
  const isPowered = useCircuitStore((s) => s.isPowered);

  if (!isPowered) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <svg width="24" height="24" viewBox="0 0 24 24" className="mb-2 text-zinc-600">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <p className="text-[10px] font-mono">POWER OFF</p>
      </div>
    );
  }
  if (!analysis || components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <p className="text-[10px] font-mono">NO COMPONENTS</p>
      </div>
    );
  }

  const timer555s = Object.entries(analysis.timer555States);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <Metric label="Vsrc" value={analysis.sourceVoltage} unit="V" color="text-cyan-300" />
        <Metric label="Veff" value={analysis.terminalVoltage} unit="V" color="text-sky-300" />
        <Metric label="Itot" value={analysis.totalCurrent} unit="A" color="text-amber-300" />
        <Metric label="Req" value={analysis.totalResistance} unit="Ω" color="text-emerald-300" />
        <Metric label="Ptot" value={analysis.power} unit="W" color="text-rose-300" />
        {analysis.internalResistance > 0 && (
          <Metric label="Rint" value={analysis.internalResistance} unit="Ω" color="text-orange-300" />
        )}
      </div>

      <Separator className="opacity-30" />

      {/* Node voltages */}
      <div>
        <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Node Voltages
        </p>
        <div className="space-y-px">
          {Object.entries(analysis.nodeVoltages).map(([node, v]) => (
            <div key={node} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-background/20">
              <span className="text-[9px] font-mono text-muted-foreground truncate mr-2">{node}</span>
              <span className="text-[9px] font-mono text-cyan-300 shrink-0">{fmt(v, "V")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 555 Timer states */}
      {timer555s.length > 0 && (
        <>
          <Separator className="opacity-30" />
          <div>
            <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">
              555 Timer
            </p>
            {timer555s.map(([id, state]) => (
              <div key={id} className="rounded border border-border/30 p-1.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-zinc-500">{id}</span>
                  <Badge variant="outline" className="text-[7px] font-mono h-3.5 px-1 border-cyan-800 text-cyan-400 uppercase">
                    {state.mode}
                  </Badge>
                </div>
                <div className="flex gap-2 text-[8px] font-mono">
                  <span className={state.output ? "text-emerald-400" : "text-zinc-600"}>
                    OUT:{state.output ? "H" : "L"}
                  </span>
                  <span className={state.flipFlop ? "text-amber-400" : "text-zinc-600"}>
                    FF:{state.flipFlop ? "1" : "0"}
                  </span>
                  <span className={state.dischargeOpen ? "text-rose-400" : "text-zinc-600"}>
                    DIS:{state.dischargeOpen ? "OPEN" : "GND"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TruthTableView() {
  const analysis = useCircuitStore((s) => s.analysis);
  const isPowered = useCircuitStore((s) => s.isPowered);
  const components = useCircuitStore((s) => s.components);

  const livingIds = new Set(components.map((c) => c.id));
  const tables = analysis?.truthTables.filter((tt) => livingIds.has(tt.gateId)) ?? [];

  if (!isPowered || tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <p className="text-[10px] font-mono">NO LOGIC GATES</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tables.map((tt) => (
        <div key={tt.gateId}>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="secondary" className="text-[8px] font-mono uppercase h-4 px-1">
              {tt.gateType.replace(/_/g, " ")}
            </Badge>
            <span className="text-[8px] text-muted-foreground font-mono">{tt.gateId}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50">
                {tt.inputLabels.map((l) => (
                  <TableHead key={l} className="text-[8px] font-mono text-cyan-400 h-6 px-1.5">{l}</TableHead>
                ))}
                <TableHead className="text-[8px] font-mono text-zinc-700 h-6 px-0.5">│</TableHead>
                {tt.outputLabels.map((l) => (
                  <TableHead key={l} className="text-[8px] font-mono text-emerald-400 h-6 px-1.5">{l}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tt.rows.map((row, i) => (
                <TableRow key={i} className="border-zinc-800/30">
                  {tt.inputLabels.map((l) => (
                    <TableCell key={l} className="text-[9px] font-mono px-1.5 py-0.5">
                      <span className={row.inputs[l] ? "text-cyan-300" : "text-zinc-700"}>
                        {row.inputs[l] ? "1" : "0"}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-zinc-800 px-0.5 py-0.5">│</TableCell>
                  {tt.outputLabels.map((l) => (
                    <TableCell key={l} className="text-[9px] font-mono font-bold px-1.5 py-0.5">
                      <span className={row.outputs[l] ? "text-emerald-300" : "text-zinc-700"}>
                        {row.outputs[l] ? "1" : "0"}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

export function LiveAnalytics() {
  const isPowered = useCircuitStore((s) => s.isPowered);
  const togglePower = useCircuitStore((s) => s.togglePower);
  const components = useCircuitStore((s) => s.components);

  return (
    <Card className="h-full rounded-none border-l border-t-0 border-b-0 border-r-0 bg-card">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Analytics
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-mono font-bold uppercase ${
              isPowered ? "text-emerald-400" : "text-zinc-600"
            }`}>
              {isPowered ? "ON" : "OFF"}
            </span>
            <Switch
              checked={isPowered}
              onCheckedChange={togglePower}
              className="data-[state=checked]:bg-cyan-600 scale-75"
            />
          </div>
        </div>
        <Badge variant="outline" className="text-[7px] font-mono h-3.5 px-1 w-fit mt-1">
          {components.length} component{components.length !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="schematic" className="w-full">
          <div className="px-3">
            <TabsList className="w-full h-7 bg-background/30">
              <TabsTrigger value="schematic"
                className="text-[9px] font-mono flex-1 data-[state=active]:bg-zinc-800">
                Schematic
              </TabsTrigger>
              <TabsTrigger value="truthtable"
                className="text-[9px] font-mono flex-1 data-[state=active]:bg-zinc-800">
                Truth Table
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="h-[calc(100vh-11rem)]">
            <div className="px-3 py-2">
              <TabsContent value="schematic" className="mt-0">
                <SchematicView />
              </TabsContent>
              <TabsContent value="truthtable" className="mt-0">
                <TruthTableView />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
