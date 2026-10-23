import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { DashboardMetrics } from '../types';

interface AttendanceSummaryProps {
  metrics: DashboardMetrics;
  onOpenAttendanceModal?: () => void;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({
  metrics,
  onOpenAttendanceModal,
}) => {
  const { present, absent, late, excused } = metrics.today_attendance_counts;
  const total = present + absent + late + excused;

  const presentPct = total ? Math.round((present / total) * 100) : 0;
  const latePct = total ? Math.round((late / total) * 100) : 0;
  const excusedPct = total ? Math.round((excused / total) * 100) : 0;
  const absentPct = total ? Math.max(0, 100 - presentPct - latePct - excusedPct) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Attendance Today</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            total > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {total > 0 ? `${metrics.attendance_rate_today}% Rate` : 'No Data'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {total > 0
            ? `Summary across all completed & active sessions today (${total} total recorded).`
            : 'No attendance records registered for today.'}
        </p>

        {/* Stacked Progress Bar */}
        <div className="mt-4 h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {total > 0 ? (
            <>
              <div
                style={{ width: `${presentPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Present: ${present} (${presentPct}%)`}
              />
              <div
                style={{ width: `${latePct}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Late: ${late} (${latePct}%)`}
              />
              <div
                style={{ width: `${excusedPct}%` }}
                className="bg-sky-400 h-full transition-all"
                title={`Excused: ${excused} (${excusedPct}%)`}
              />
              <div
                style={{ width: `${absentPct}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Absent: ${absent} (${absentPct}%)`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200/50 h-full" />
          )}
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-700">Present</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{present}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-slate-700">Late</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{late}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-medium text-slate-700">Excused</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{excused}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-medium text-slate-700">Absent</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{absent}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Unrecorded sessions: <strong>0</strong></span>
        <button
          onClick={onOpenAttendanceModal}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-colors"
        >
          Daily Log Detail
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
