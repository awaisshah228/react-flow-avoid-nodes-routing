import { useState } from "react";
import type { LayoutDirection, LayoutAlgorithmName } from "./utils/auto-layout";

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

const getPanelStyle = (): React.CSSProperties => ({
  position: "absolute",
  top: isMobile() ? 90 : 12,
  right: 12,
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  zIndex: 10,
  minWidth: 240,
  maxWidth: "min(320px, calc(100vw - 24px))",
  maxHeight: isMobile() ? "calc(100vh - 100px)" : "calc(100vh - 40px)",
  overflowY: "auto",
  fontSize: 13,
});

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

export type Settings = {
  edgeRounding: number;
  edgeToEdgeSpacing: number;
  edgeToNodeSpacing: number;
  diagramGridSize: number;
  shouldSplitEdgesNearHandle: boolean;
  autoBestSideConnection: boolean;
  resolveCollisions: boolean;
};

export type AutoLayoutSettings = Settings & {
  layoutDirection: LayoutDirection;
  layoutAlgorithm: LayoutAlgorithmName;
  layoutSpacing: number;
};

function BooleanToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div style={rowStyle}>
      <label>{label}</label>
      <div style={{ display: "flex", gap: 4 }}>
        {[true, false].map((val) => (
          <button
            key={String(val)}
            onClick={() => onChange(val)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: value === val ? "#333" : "#fff",
              color: value === val ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (key: string, value: number | boolean) => void;
}) {
  const [open, setOpen] = useState(() => !isMobile());
  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
    { key: "diagramGridSize", label: "Diagram Grid Size", min: 0, max: 48 },
  ] as const;

  return (
    <div style={getPanelStyle()}>
      <div
        style={{ fontWeight: 600, marginBottom: open ? 12 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? "Settings" : "\u2699\uFE0F Settings"}</span>
        <span style={{ fontSize: 11, color: "#888" }}>{open ? "\u2715" : ""}</span>
      </div>
      {open && (
        <>
          {sliders.map(({ key, label, min, max }) => (
            <div key={key} style={rowStyle}>
              <label>{label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => onChange(key, Number(e.target.value))}
                  style={{ width: 100 }}
                />
                <span style={{ minWidth: 28, textAlign: "right" }}>{settings[key]}</span>
              </div>
            </div>
          ))}
          <BooleanToggle label="Split Edges Near Handle" value={settings.shouldSplitEdgesNearHandle} onChange={(val) => onChange("shouldSplitEdgesNearHandle", val)} />
          <BooleanToggle label="Resolve Collisions" value={settings.resolveCollisions} onChange={(val) => onChange("resolveCollisions", val)} />
          <BooleanToggle label="Auto Best Side" value={settings.autoBestSideConnection} onChange={(val) => onChange("autoBestSideConnection", val)} />
        </>
      )}
    </div>
  );
}

export function AutoLayoutSettingsPanel({
  settings,
  onChange,
  onLayoutChange,
  onReLayout,
}: {
  settings: AutoLayoutSettings;
  onChange: (key: string, value: number | boolean) => void;
  onLayoutChange: (key: string, value: string | number) => void;
  onReLayout: () => void;
}) {
  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
  ] as const;

  const [open, setOpen] = useState(() => !isMobile());

  return (
    <div style={getPanelStyle()}>
      <div
        style={{ fontWeight: 600, marginBottom: open ? 12 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? "Auto Layout + libavoid" : "\u2699\uFE0F Auto Layout"}</span>
        <span style={{ fontSize: 11, color: "#888" }}>{open ? "\u2715" : ""}</span>
      </div>
      {!open ? null : (
      <>
      <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 12, color: "#888" }}>Layout Engine</div>
      <div style={rowStyle}>
        <label>Algorithm</label>
        <select
          value={settings.layoutAlgorithm}
          onChange={(e) => onLayoutChange("layoutAlgorithm", e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="elk">ELK (Layered)</option>
          <option value="dagre">Dagre</option>
          <option value="d3-hierarchy">D3 Hierarchy</option>
        </select>
      </div>
      <div style={rowStyle}>
        <label>Direction</label>
        <select
          value={settings.layoutDirection}
          onChange={(e) => onLayoutChange("layoutDirection", e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="LR">Left to Right</option>
          <option value="TB">Top to Bottom</option>
          <option value="RL">Right to Left</option>
          <option value="BT">Bottom to Top</option>
        </select>
      </div>
      <div style={rowStyle}>
        <label>Node Spacing</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={20}
            max={120}
            value={settings.layoutSpacing}
            onChange={(e) => onLayoutChange("layoutSpacing", Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ minWidth: 28, textAlign: "right" }}>{settings.layoutSpacing}</span>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onReLayout}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid #818cf8",
            background: "#818cf8",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            width: "100%",
          }}
        >
          Re-Layout
        </button>
      </div>

      <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 12, color: "#888" }}>libavoid Routing</div>
      {sliders.map(({ key, label, min, max }) => (
        <div key={key} style={rowStyle}>
          <label>{label}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min={min}
              max={max}
              value={settings[key]}
              onChange={(e) => onChange(key, Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ minWidth: 28, textAlign: "right" }}>{settings[key]}</span>
          </div>
        </div>
      ))}
      <BooleanToggle label="Auto Best Side" value={settings.autoBestSideConnection} onChange={(val) => onChange("autoBestSideConnection", val)} />
      <BooleanToggle label="Resolve Collisions" value={settings.resolveCollisions} onChange={(val) => onChange("resolveCollisions", val)} />
      </>
      )}
    </div>
  );
}
