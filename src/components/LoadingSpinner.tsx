import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`${className} animate-spin text-primary`} />
    </div>
  );
};
