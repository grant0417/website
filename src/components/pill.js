import React from 'react';

export function Pill({ name }) {
  return (
    <div className="bg-white text-gray-900 rounded-full px-1.5 text-sm font-bold whitespace-nowrap tracking-tight">
      {name}
    </div>
  );
}

export function RustPill() {
  return <Pill name="🦀 Rust" />;
}

export function TypescriptPill() {
  return <Pill name="🦄 Typescript" />;
}

export function ReactPill() {
  return <Pill name="🦋 React" />;
}

export function NodePill() {
  return <Pill name="🌎 Node" />;
}

export function ExpressPill() {
  return <Pill name="🚀 Express" />;
}

export function PostgresPill() {
  return <Pill name="💾 Postgres" />;
}

export function WasmPill() {
  return <Pill name="🕸 Wasm" />;
}

export function KicadPill() {
  return <Pill name="📦 Kicad" />;
}

export function GitPill() {
  return <Pill name="🗃 Git" />;
}

export function DockerPill() {
  return <Pill name="🐳 Docker" />;
}

export function LinuxPill() {
  return <Pill name="🐧 Linux" />;
}
