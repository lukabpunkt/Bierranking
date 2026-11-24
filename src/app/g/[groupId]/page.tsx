import { Suspense } from "react";
import { BeerList } from "@/components/BeerList";
import { SkeletonList } from "@/components/Skeleton";

export default function GroupPage() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <BeerList />
    </Suspense>
  );
}
