"use client";

import dynamic from "next/dynamic";

const JourneyCanvas = dynamic(
  () => import("@/components/journeys/journey-canvas"),
  { ssr: false }
);

export default function NewJourneyPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <JourneyCanvas journeyId="new" />
    </div>
  );
}
