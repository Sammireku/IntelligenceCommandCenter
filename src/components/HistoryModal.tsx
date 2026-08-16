import React, { useState, useEffect } from 'react';
import { Download, History, X } from 'lucide-react';
import { SweepHistorySummary, SweepPayload } from '../types.js';
import { exportSweepAsJson, exportSweepAsMarkdown } from '../utils/export.js';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSweep: (sweep: SweepPayload) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectSweep,
}) => {
  const [historyList, setHistoryList] = useState<SweepHistorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSweepId, setSelectedSweepId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sweep/history');
      if (res.ok) {
        const list = await res.json();
        setHistoryList(list);
      }
    } catch (err) {
      console.warn('Failed to load history list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistoricalSweep = async (sweepId: string) => {
    setSelectedSweepId(sweepId);
    try {
      const res = await fetch(`/api/sweep/history/${sweepId}`);
      if (res.ok) {
        const sweep: SweepPayload = await res.json();
        onSelectSweep(sweep);
        onClose();
      }
    } catch (err) {
      console.warn('Failed to load full sweep:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg max-w-2xl w-full p-4 font-mono shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00ff41]" />
            <h3 className="text-sm font-bold uppercase text-white tracking-wider">
              SWEEP COLD ARCHIVE // HISTORY
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#737373] hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-[#737373]">
            Scanning local history archives...
          </div>
        ) : historyList.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#525252]">
            No previous historical sweeps stored yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {historyList.map((item) => (
              <div
                key={item.sweepId}
                className="p-3 rounded bg-[#0c0c0c] border border-[#1a1a1a] hover:border-[#262626] transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#00ff41]">{item.sweepId}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                        item.status === 'CRITICAL'
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                          : item.status === 'WARNING'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="text-[#a3a3a3] text-[11px] font-sans line-clamp-1">
                    {item.topHeadline}
                  </div>

                  <div className="text-[10px] text-[#666666] flex items-center gap-3">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span>Duration: {item.durationMs}ms</span>
                    <span>Alerts: 🔴 {item.alertsCount.flash} | 🟡 {item.alertsCount.priority}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadHistoricalSweep(item.sweepId)}
                  disabled={selectedSweepId === item.sweepId}
                  className="px-3 py-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] text-[#00ff41] text-xs font-bold uppercase transition-colors shrink-0"
                >
                  Load Snapshot
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
