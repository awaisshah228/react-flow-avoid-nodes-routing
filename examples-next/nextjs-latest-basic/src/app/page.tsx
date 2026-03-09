"use client";

import dynamic from "next/dynamic";

const Flow = dynamic(() => import("@/components/Flow"), { ssr: false });

export default function Home() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Flow />
    </div>
  );
}
