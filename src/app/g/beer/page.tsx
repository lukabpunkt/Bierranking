"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BeerDetail } from "./BeerDetail";
import { SkeletonBlock } from "@/components/Skeleton";

function Beer() {
  const beerId = useSearchParams().get("beer") ?? "";
  return <BeerDetail key={beerId} beerId={beerId} />;
}

export default function BeerPage() {
  return (
    <Suspense fallback={<SkeletonBlock className="h-64" />}>
      <Beer />
    </Suspense>
  );
}
