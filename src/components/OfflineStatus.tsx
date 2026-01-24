import { WifiOff, Repeat, CheckCircle2 } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { cn } from '@/lib/utils';

const OfflineStatus = () => {
    const { isOnline, isSyncing, pendingCount } = useSync();

    if (isOnline && !isSyncing && pendingCount === 0) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border backdrop-blur-md transition-all duration-500",
                !isOnline
                    ? "bg-orange-50/90 border-orange-200 text-orange-800 shadow-orange-200/50"
                    : isSyncing
                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-800 shadow-emerald-200/50"
                        : "bg-white/90 border-gray-200 text-gray-800 shadow-gray-200/50"
            )}>
                {!isOnline ? (
                    <>
                        <WifiOff className="w-5 h-5 text-orange-600 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider">Offline Mode</span>
                            {pendingCount > 0 && (
                                <span className="text-[10px] font-bold opacity-80">{pendingCount} pending updates</span>
                            )}
                        </div>
                    </>
                ) : isSyncing ? (
                    <>
                        <Repeat className="w-5 h-5 text-emerald-600 animate-spin" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider">Syncing...</span>
                            <span className="text-[10px] font-bold opacity-80">Saving offline data to server</span>
                        </div>
                    </>
                ) : pendingCount > 0 ? (
                    <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider">System Ready</span>
                            <span className="text-[10px] font-bold opacity-80">{pendingCount} items queued for sync</span>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default OfflineStatus;
