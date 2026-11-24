import { BeerDetail } from "./BeerDetail";

export default async function BeerPage({ params }: { params: Promise<{ beerId: string }> }) {
  const { beerId } = await params;
  return <BeerDetail beerId={beerId} />;
}
