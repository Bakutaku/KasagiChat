import Link from "next/link";
import { LuMap } from "react-icons/lu";
import { ImmersiveMapShell } from "@/components/map";

export default function HomePage() {
  return (
    <ImmersiveMapShell
      mapId="home-interior"
      interaction="fixed"
      characters={[]}
    >
      <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100/85 p-3 backdrop-blur">
        <p className="font-medium">家</p>
        <Link href="/map" className="btn btn-primary btn-sm">
          <LuMap aria-hidden="true" />
          街へ出る
        </Link>
      </div>
    </ImmersiveMapShell>
  );
}
