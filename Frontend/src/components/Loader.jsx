import { Loader2 } from "lucide-react";

const Loader = () => {
  return <Loader2 className="animate-spin" />;
};

export default Loader;

export const PageLoader = () => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4">
      <div className="relative flex size-12 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
        <div className="size-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
      </div>
      <p className="text-sm font-medium text-gray-500">Loading…</p>
    </div>
  );
};
