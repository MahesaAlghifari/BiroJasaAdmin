import { MasterDataContent } from "./MasterDataContent";

export function MasterData({ defaultTab = "samsat" }: { defaultTab?: string }) {
  return (
    <div className="flex-1 flex flex-col min-h-full space-y-6 p-4 md:p-6 w-full min-w-0 text-left">
      <MasterDataContent tab={defaultTab} />
    </div>
  );
}

