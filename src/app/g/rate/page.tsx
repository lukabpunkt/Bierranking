"use client";

import { Suspense } from "react";
import { RateFlow } from "./RateFlow";
import { SkeletonBlock } from "@/components/Skeleton";

export default function RatePage() {
  return (
    <Suspense fallback={<SkeletonBlock className="h-64" />}>
      <RateFlow />
    </Suspense>
  );
}
