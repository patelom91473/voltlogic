"use client";

import { ComponentPalette } from "@/components/component-palette";
import { CircuitCanvas } from "@/components/circuit-canvas";
import { LiveAnalytics } from "@/components/live-analytics";
import { GlobalHeader } from "@/components/global-header";
import { Oscilloscope } from "@/components/oscilloscope";

export default function Home() {
  return (
    <div className="flex h-screen w-screen">
      <GlobalHeader />

      {/* Three-panel layout */}
      <div className="flex w-full h-[calc(100vh-2.25rem)] mt-9">
        <aside className="w-52 shrink-0 h-full">
          <ComponentPalette />
        </aside>
        <main className="flex-1 min-w-0 h-full relative">
          <CircuitCanvas />
        </main>
        <aside className="w-64 shrink-0 h-full">
          <LiveAnalytics />
        </aside>
      </div>

      <Oscilloscope />
    </div>
  );
}
