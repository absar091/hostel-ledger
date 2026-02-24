import { useCallback } from 'react';
import { useFirebaseData } from '@/contexts/FirebaseDataContext';
import { toast } from 'sonner';

export const useFileExport = () => {
  const { groups, transactions } = useFirebaseData();

  const exportData = useCallback(async () => {
    const data = {
      groups,
      transactions,
      exportedAt: new Date().toISOString(),
      version: 1
    };

    const fileName = `hostel-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(data, null, 2);

    try {
      // @ts-expect-error - File System Access API types might not be available
      if (window.showSaveFilePicker) {
        // use File System Access API
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        toast.success("Data exported successfully using File System Access API");
      } else {
        // Fallback to Blob download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Data exported successfully");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Export failed:', error);
        toast.error("Failed to export data");
      }
    }
  }, [groups, transactions]);

  return { exportData };
};
