import { MasterDataContent } from "./MasterDataContent";

export function MasterData({ defaultTab = "samsat" }: { defaultTab?: string }) {
  return (
    <div className="flex-1 flex flex-col min-h-full space-y-5 w-full min-w-0 text-left content-fluid">
      <MasterDataContent tab={defaultTab} />
    </div>
  );
}

