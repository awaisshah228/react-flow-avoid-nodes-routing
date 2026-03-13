"use client";

import dynamic from "next/dynamic";

const DiagramView = dynamic(() => import("@/components/DiagramView"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      Loading...
    </div>
  ),
});

export default function Page() {
  return <DiagramView />;
}
