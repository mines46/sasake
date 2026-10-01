import React from 'react';
import { Clock, MapPin, Users, ChevronRight, Calendar } from 'lucide-react';
import type { EnrichedScheduleItem } from '../types';
import { formatTime } from '../utils/formatters';

interface TodayScheduleProps {
  schedules: EnrichedScheduleItem[];
  onTakeAttendance?: (schedule: EnrichedScheduleItem) => void;
  onViewAll?: () => void;
}

export const TodaySchedule: React.FC<TodayScheduleProps> = ({
  schedules,
  onTakeAttendance,
  onViewAll,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Today's Schedule</h2>
            <p className="text-xs text-slate-500">
              {schedules.length} classes scheduled for today
            </p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          Full Timetable
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Schedule list */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {schedules.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No classes scheduled for today.
          </div>
        ) : (
          schedules.map((item) => {
            const fillRatio = Math.round((item.enrolled_students / item.capacity) * 100);
            const isNearCapacity = fillRatio >= 90;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Class Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {item.class_name}
                    </h3>
                    {item.room && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.room}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTime(item.start_time)} – {formatTime(item.end_time)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Instructor: <strong className="text-slate-700 font-medium">{item.instructor_name}</strong></span>
                  </div>
                </div>

                {/* Right: Capacity & Action */}
                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="w-32">
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        Enrolled
                      </span>
                      <span className={isNearCapacity ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                        {item.enrolled_students} / {item.capacity}
                      </span>
                    </div>
                    {/* Capacity bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isNearCapacity ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(fillRatio, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTakeAttendance?.(item)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors shrink-0"
                  >
                    Attendance
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
