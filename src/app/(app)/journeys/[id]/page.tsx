"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const JourneyCanvas = dynamic(
  () => import("@/components/journeys/journey-canvas"),
  { ssr: false }
);

export default function JourneyBuilderPage() {
  const params = useParams<{ id: string }>();
  const journeyId = params.id ?? "new";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <JourneyCanvas journeyId={journeyId} />
    </div>
  );
}
