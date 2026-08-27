import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Search,
  Filter,
  DollarSign,
  Users,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Trash2,
  Plus,
  Link2,
  Calendar,
  X,
  Check,
  Layers,
  ArrowRight,
  HelpCircle,
  Moon,
  ArrowRightLeft,
  ArrowUpRight,
  UserPlus,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { EmployeeRecap, FlagBadge, PeriodConfig, SystemSettings, WorkSession, RawTap } from '../types';
import {
  formatRupiah,
  formatDecimal,
  getPeriodDates,
  getIndonesianDayName,
  getBoundaryShiftInfo,
} from '../utils/engine';

interface DashboardHITLProps {
  recaps: EmployeeRecap[];
  period: PeriodConfig;
  settings: SystemSettings;
  onSelectEmployee: (employeeId: string) => void;
  isLocked: boolean;
  onLockPeriod: () => void;
  onUnlockPeriod: () => void;
  onLoadSampleData: () => void;
  isDateComplete: boolean;
  missingDates: string[];
  onUpdateSessions?: (
    employeeId: string,
    updatedSessions: WorkSession[],
    actionType: 'EDIT_SESSION' | 'ADD_SESSION' | 'DELETE_SESSION',
    beforeVal: string,
    afterVal: string,
    reason: string
  ) => void;
  onDeleteRawTap?: (tapId: string, reason: string) => void;
  onRestoreRawTap?: (tapId: string) => void;
  onResolveBoundaryTap?: (
    tapId: string,
    action: 'DEFER_TO_NEXT' | 'SETTLE_WITH_PREVIOUS',
    reason?: string
  ) => void;
  onSetAttendanceNote?: (employeeId: string, note: string) => void;
  onDeleteUnmappedEmployee?: (rawIdOrEmpId: string, reason?: string) => void;
  onQuickRegisterUnmappedEmployee?: (
    rawId: string,
    nama: string,
    bagian: string,
    upahHarian: number,
    upahLembur: number
  ) => void;
  onNavigateToUpload?: () => void;
}

export const DashboardHITL: React.FC<DashboardHITLProps> = ({
  recaps,
  period,
  settings,
  onSelectEmployee,
  isLocked,
  onLockPeriod,
  onUnlockPeriod,
  onLoadSampleData,
  isDateComplete,
  missingDates,
  onUpdateSessions,
  onDeleteRawTap,
  onRestoreRawTap,
  onResolveBoundaryTap,
  onSetAttendanceNote,
  onDeleteUnmappedEmployee,
  onQuickRegisterUnmappedEmployee,
  onNavigateToUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'summary'>('matrix');

  // Quick Day Review Modal State
  const [selectedDayContext, setSelectedDayContext] = useState<{
    recap: EmployeeRecap;
    dateStr: string;
  } | null>(null);

  // Form states inside Quick Day Modal
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [isAddingNewSession, setIsAddingNewSession] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [formError, setFormError] = useState('');

  // Delete session confirmation inside Quick Day Modal
  const [sessionToDelete, setSessionToDelete] = useState<WorkSession | null>(null);
  const [deleteSessionReason, setDeleteSessionReason] = useState('Data sesi ganda / salah tap');
  const [customDeleteSessionReason, setCustomDeleteSessionReason] = useState('');

  // Delete raw tap confirmation inside Quick Day Modal
  const [tapToDelete, setTapToDelete] = useState<RawTap | null>(null);
  const [deleteTapReason, setDeleteTapReason] = useState('Tap salah / ganda tak sengaja');
  const [customDeleteTapReason, setCustomDeleteTapReason] = useState('');

  // Quick Register Unmapped Employee Modal State
  const [quickRegisterContext, setQuickRegisterContext] = useState<{
    rawId: string;
    nama: string;
    bagian: string;
    upahHarian: number | '';
    upahLembur: number | '';
  } | null>(null);
  const [quickRegisterError, setQuickRegisterError] = useState('');

  // Delete Unmapped Employee Modal State
  const [deleteUnmappedContext, setDeleteUnmappedContext] = useState<{
    rawIdOrEmpId: string;
    nama: string;
  } | null>(null);

  // Quick Attendance / Leave Note Modal State
  const [noteModalContext, setNoteModalContext] = useState<{
    employeeId: string;
    employeeName: string;
    currentNote: string;
  } | null>(null);
  const [noteModalInput, setNoteModalInput] = useState('');

  const periodDates = useMemo(() => {
    return getPeriodDates(period?.startDate || '2026-08-15');
  }, [period?.startDate]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set(recaps.map((r) => r.employee.bagian).filter(Boolean));
    return Array.from(set);
  }, [recaps]);

  // Sorting: RED FIRST, then YELLOW, then GREEN!
  const sortedAndFilteredRecaps = useMemo(() => {
    return recaps
      .filter((r) => {
        if (statusFilter !== 'all' && r.status_color !== statusFilter) return false;
        if (departmentFilter !== 'all' && r.employee.bagian !== departmentFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.employee.nama.toLowerCase().includes(q);
          const matchId = r.employee.employee_id.toLowerCase().includes(q);
          const matchDept = r.employee.bagian.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchDept) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priority: Record<string, number> = { red: 0, yellow: 1, green: 2 };
        const colorDiff = priority[a.status_color] - priority[b.status_color];
        if (colorDiff !== 0) return colorDiff;
        return a.employee.nama.localeCompare(b.employee.nama);
      });
  }, [recaps, statusFilter, departmentFilter, searchQuery]);

  // Overall Statistics
  const totalEmployees = recaps.length;
  const redCount = recaps.filter((r) => r.status_color === 'red').length;
  const yellowCount = recaps.filter((r) => r.status_color === 'yellow').length;
  const greenCount = recaps.filter((r) => r.status_color === 'green').length;
  const grandTotalHonor = recaps.reduce((acc, r) => acc + r.total_honor, 0);
  const grandTotalH = recaps.reduce((acc, r) => acc + (Math.round(r.total_H * 100) / 100), 0);
  const grandTotalL = recaps.reduce((acc, r) => acc + (Math.round(r.total_L * 100) / 100), 0);
  const totalDedupedTaps = recaps.reduce((acc, r) => acc + r.raw_taps.filter((t) => t.is_deduped).length, 0);

  // Problem breakdown
  const unmappedEmployees = recaps.filter(
    (r) => r.employee.is_unmapped_new_name || r.flags.some((f) => f.code === 'R04')
  );
  const orphanTapRecaps = recaps.filter((r) => r.flags.some((f) => f.code === 'R01'));
  const zeroTapRecaps = recaps.filter((r) => r.total_taps === 0 || r.flags.some((f) => f.code === 'Y05'));
  const boundaryRecaps = recaps.filter((r) => r.flags.some((f) => f.code === 'Y03' || f.code === 'Y04'));
  const totalProblems = redCount + yellowCount;

  const canFinalize = redCount === 0 && isDateComplete && recaps.length > 0;

  // Active recap in modal (kept fresh if parent recaps updates)
  const currentModalRecap = useMemo(() => {
    if (!selectedDayContext) return null;
    return recaps.find((r) => r.employee.employee_id === selectedDayContext.recap.employee.employee_id) || selectedDayContext.recap;
  }, [selectedDayContext, recaps]);

  // Open Quick Day Modal
  const handleOpenDayModal = (recap: EmployeeRecap, dateStr: string) => {
    setSelectedDayContext({ recap, dateStr });
    setEditingSession(null);
    setIsAddingNewSession(false);
    setSessionToDelete(null);
    setTapToDelete(null);
    setFormError('');
  };

  // Close Quick Day Modal
  const handleCloseDayModal = () => {
    setSelectedDayContext(null);
    setEditingSession(null);
    setIsAddingNewSession(false);
    setSessionToDelete(null);
    setTapToDelete(null);
    setFormError('');
  };

  // Start Edit Session Form
  const handleStartEditSession = (session: WorkSession) => {
    if (isLocked) return;
    setEditingSession(session);
    setIsAddingNewSession(false);
    setEditCheckIn(session.check_in);
    setEditCheckOut(session.check_out);
    setEditReason(session.manual_edit_reason || '');
    setFormError('');
  };

  // Start Add Session Form for selected date
  const handleStartAddSession = (dateStr: string, prefillCheckIn?: string) => {
    if (isLocked) return;
    setIsAddingNewSession(true);
    setEditingSession(null);

    const checkInVal = prefillCheckIn || `${dateStr} 07:00`;
    let checkOutVal = `${dateStr} 19:00`;
    try {
      const inDate = new Date(checkInVal.replace(' ', 'T'));
      if (!isNaN(inDate.getTime())) {
        const outDate = new Date(inDate.getTime() + 12 * 60 * 60 * 1000);
        const y = outDate.getFullYear();
        const m = String(outDate.getMonth() + 1).padStart(2, '0');
        const d = String(outDate.getDate()).padStart(2, '0');
        const hh = String(outDate.getHours()).padStart(2, '0');
        const mm = String(outDate.getMinutes()).padStart(2, '0');
        checkOutVal = `${y}-${m}-${d} ${hh}:${mm}`;
      }
    } catch {
      // fallback
    }

    setEditCheckIn(checkInVal);
    setEditCheckOut(checkOutVal);
    setEditReason(prefillCheckIn ? `Pemasangan otomatis dari tap tunggal (${prefillCheckIn})` : 'Penambahan sesi kerja manual');
    setFormError('');
  };

  // Save Session Edit / Add
  const handleSaveSessionForm = () => {
    if (!currentModalRecap || isLocked || !onUpdateSessions) return;

    if (!editReason.trim()) {
      setFormError('Alasan koreksi WAJIB diisi untuk jejak audit.');
      return;
    }

    const tIn = new Date(editCheckIn.replace(' ', 'T')).getTime();
    const tOut = new Date(editCheckOut.replace(' ', 'T')).getTime();

    if (isNaN(tIn) || isNaN(tOut)) {
      setFormError('Format tanggal/jam tidak valid. Gunakan format YYYY-MM-DD HH:mm');
      return;
    }

    if (tOut <= tIn) {
      setFormError('Jam keluar harus lebih besar dari jam masuk.');
      return;
    }

    const durationMinutes = (tOut - tIn) / (1000 * 60);
    const durationHours = durationMinutes / 60;
    const stdHours = settings?.standard_hours || 12;
    const otThresh = settings?.overtime_threshold_hours || 12;
    const H = Math.min(durationHours / stdHours, 1.0);
    const L = Math.max(0, durationHours - otThresh);

    const employeeId = currentModalRecap.employee.employee_id;
    const allSessions = currentModalRecap.sessions;

    if (isAddingNewSession) {
      const newSession: WorkSession = {
        id: `sess-quick-${Date.now()}`,
        employee_id: employeeId,
        date_str: selectedDayContext?.dateStr || editCheckIn.split(' ')[0],
        check_in: editCheckIn,
        check_out: editCheckOut,
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        H,
        L,
        is_anomaly: false,
        anomaly_reasons: [],
        is_manually_edited: true,
        manual_edit_reason: editReason,
      };

      const updated = [...allSessions, newSession].sort(
        (a, b) => new Date(a.check_in.replace(' ', 'T')).getTime() - new Date(b.check_in.replace(' ', 'T')).getTime()
      );

      onUpdateSessions(
        employeeId,
        updated,
        'ADD_SESSION',
        '- (Sesi Baru)',
        `${editCheckIn} s.d. ${editCheckOut} (${durationHours.toFixed(2)}j, H:${H.toFixed(2)}, L:${L.toFixed(2)})`,
        editReason
      );
    } else if (editingSession) {
      const targetOld = allSessions.find((s) => s.id === editingSession.id);
      const beforeStr = targetOld
        ? `${targetOld.check_in} s.d. ${targetOld.check_out} (Durasi: ${targetOld.duration_hours.toFixed(2)}j)`
        : 'Tidak diketahui';

      const updated = allSessions.map((s) => {
        if (s.id === editingSession.id) {
          return {
            ...s,
            date_str: selectedDayContext?.dateStr || editCheckIn.split(' ')[0],
            check_in: editCheckIn,
            check_out: editCheckOut,
            duration_minutes: durationMinutes,
            duration_hours: durationHours,
            H,
            L,
            is_anomaly: false,
            anomaly_reasons: [],
            is_manually_edited: true,
            manual_edit_reason: editReason,
          };
        }
        return s;
      });

      onUpdateSessions(
        employeeId,
        updated,
        'EDIT_SESSION',
        beforeStr,
        `${editCheckIn} s.d. ${editCheckOut} (${durationHours.toFixed(2)}j, H:${H.toFixed(2)}, L:${L.toFixed(2)})`,
        editReason
      );
    }

    setEditingSession(null);
    setIsAddingNewSession(false);
    setFormError('');
  };

  // Confirm Delete Session
  const handleConfirmDeleteSession = () => {
    if (!currentModalRecap || !sessionToDelete || isLocked || !onUpdateSessions) return;

    const reason = deleteSessionReason === 'Lainnya' ? customDeleteSessionReason.trim() : deleteSessionReason;
    if (!reason) return;

    const employeeId = currentModalRecap.employee.employee_id;
    const updated = currentModalRecap.sessions.filter((s) => s.id !== sessionToDelete.id);

    onUpdateSessions(
      employeeId,
      updated,
      'DELETE_SESSION',
      `Sesi Dihapus: ${sessionToDelete.check_in} s.d. ${sessionToDelete.check_out} (${sessionToDelete.duration_hours.toFixed(2)}j)`,
      '- (Dihapus dari kalkulasi)',
      reason
    );

    setSessionToDelete(null);
  };

  // Confirm Delete / Ignore Raw Tap
  const handleConfirmDeleteRawTap = () => {
    if (!tapToDelete || isLocked || !onDeleteRawTap) return;

    const reason = deleteTapReason === 'Lainnya' ? customDeleteTapReason.trim() : deleteTapReason;
    if (!reason) return;

    onDeleteRawTap(tapToDelete.id, reason);
    setTapToDelete(null);
  };

  return (
    <div className="space-y-4 w-full pb-32">
      
      {/* Top Metrics Cards - Compact & High-Density */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Honor Card */}
        <div className="col-span-2 bg-white text-slate-800 p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-blue-700 font-bold tracking-wider uppercase">
              Total Honor Mingguan
            </span>
            {totalDedupedTaps > 0 && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0">
                ✨ {totalDedupedTaps} Jitter Bersih
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 mt-1">
            {formatRupiah(grandTotalHonor)}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100">
            <span>Total H: <strong className="text-slate-900">{formatDecimal(grandTotalH)} Hari</strong></span>
            <span>• Lembur: <strong className="text-amber-700">{formatDecimal(grandTotalL)} Jam</strong></span>
            <span>• Karyawan: <strong className="text-slate-900">{totalEmployees} Orang</strong></span>
          </div>
        </div>

        {/* Red Flags Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'red' ? 'all' : 'red')}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'red'
              ? 'ring-2 ring-rose-500 bg-rose-50 border-rose-300'
              : 'bg-white border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Baris Merah (Blokir)
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${redCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
              <AlertOctagon className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 my-1">
            {redCount} <span className="text-xs font-medium text-slate-500">orang</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {redCount > 0 ? 'Wajib dikoreksi sebelum approval' : 'Semua anomali merah bersih'}
          </p>
        </div>

        {/* Yellow / Orange Flags Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'yellow' ? 'all' : 'yellow')}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'yellow'
              ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-300'
              : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Baris Oranye (Perhatian)
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${yellowCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 my-1">
            {yellowCount} <span className="text-xs font-medium text-slate-500">orang</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Boleh diproses, perlu ditinjau / ada catatan
          </p>
        </div>

        {/* Green Flags Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'green' ? 'all' : 'green')}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'green'
              ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Baris Hijau (Valid)
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${greenCount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 my-1">
            {greenCount} <span className="text-xs font-medium text-slate-500">orang</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Lengkap dan siap dibayar
          </p>
        </div>
      </div>

      {/* STATUS & DETAIL MASALAH YANG ADA DI DASHBOARD TINJAUAN */}
      {totalProblems > 0 && (
        <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Status Masalah & Anomali di Dashboard Tinjauan:</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Cek detail permasalahan pada masing-masing baris yang ditandai warna di bawah.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Unmapped Names */}
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                unmappedEmployees.length > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-950 font-medium'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <AlertOctagon className={`w-4 h-4 shrink-0 mt-0.5 ${unmappedEmployees.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              <div>
                <span className="block font-bold">Nama Baru di File: {unmappedEmployees.length}</span>
                <span className="text-[10px] text-slate-600 leading-tight block">
                  {unmappedEmployees.length > 0
                    ? 'Belum ada di Master. Perlu penyesuaian (Daftarkan / Hapus).'
                    : 'Semua nama terdaftar di Master.'}
                </span>
              </div>
            </div>

            {/* Single / Orphan Taps */}
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                orphanTapRecaps.length > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-950 font-medium'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <AlertOctagon className={`w-4 h-4 shrink-0 mt-0.5 ${orphanTapRecaps.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              <div>
                <span className="block font-bold">Tap Tunggal / Ganjil: {orphanTapRecaps.length}</span>
                <span className="text-[10px] text-slate-600 leading-tight block">
                  {orphanTapRecaps.length > 0
                    ? 'Ada tap masuk tanpa keluar (atau sebaliknya).'
                    : 'Tidak ada tap ganjil.'}
                </span>
              </div>
            </div>

            {/* Zero Taps / Leave */}
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                zeroTapRecaps.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-950 font-medium'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${zeroTapRecaps.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <div>
                <span className="block font-bold">Tanpa Tap (Cuti / Izin): {zeroTapRecaps.length}</span>
                <span className="text-[10px] text-slate-600 leading-tight block">
                  Ditandai Oranye. Opsional tambah catatan (Cuti/Sakit).
                </span>
              </div>
            </div>

            {/* Boundary Shifts */}
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                boundaryRecaps.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-950 font-medium'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${boundaryRecaps.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <div>
                <span className="block font-bold">Shift Batas Periode: {boundaryRecaps.length}</span>
                <span className="text-[10px] text-slate-600 leading-tight block">
                  Tap di Jumat sore/Sabtu pagi lintas batas minggu.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Incompleteness Warning Banner */}
      {!isDateComplete && recaps.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5 shadow-xs">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs text-rose-950">PERINGATAN: Tanggal Absensi Belum Lengkap!</h4>
            <p className="text-[11px] text-rose-800">
              Tanggal <strong>{missingDates.join(', ')}</strong> belum memiliki data tap. Persetujuan akhir terkunci hingga data diunggah lengkap.
            </p>
          </div>
        </div>
      )}

      {/* EMPTY DASHBOARD WHEN NO FILE UPLOADED */}
      {recaps.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Belum Ada File Absensi yang Diunggah
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Dashboard Tinjauan hanya memunculkan nama karyawan yang terdapat di dalam file excel / csv absensi yang diunggah. Nama pada Master Data yang tidak muncul di file otomatis tidak masuk ke Dashboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unggah File Absensi Sekarang</span>
              </button>
            )}
            <button
              onClick={onLoadSampleData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Muat Data Contoh Lengkap</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      {recaps.length > 0 && (
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Filter & Search Toolbar */}
        <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-employee"
                type="text"
                placeholder="Cari nama, ID, atau bagian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Semua Bagian ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pill Selector */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded font-medium transition text-[11px] ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({recaps.length})
              </button>
              <button
                onClick={() => setStatusFilter('red')}
                className={`px-2 py-1 rounded font-medium transition text-[11px] flex items-center gap-1 ${
                  statusFilter === 'red'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Merah ({redCount})
              </button>
              <button
                onClick={() => setStatusFilter('yellow')}
                className={`px-2 py-1 rounded font-medium transition text-[11px] flex items-center gap-1 ${
                  statusFilter === 'yellow'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Oranye ({yellowCount})
              </button>
              <button
                onClick={() => setStatusFilter('green')}
                className={`px-2 py-1 rounded font-medium transition text-[11px] flex items-center gap-1 ${
                  statusFilter === 'green'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Hijau ({greenCount})
              </button>
            </div>
          </div>

          {/* View Mode Switcher (Matrix vs Summary) */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-2.5 py-1 rounded font-bold transition text-[11px] flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan matriks kehadiran 7 hari (Klik sel bermasalah untuk edit/hapus langsung)"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Matriks 7 Hari (Track Masalah)</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-2.5 py-1 rounded font-semibold transition text-[11px] flex items-center gap-1.5 ${
                  viewMode === 'summary'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tabel ringkasan agregat honor"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ringkasan Total</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informational Guidance on Interactive Matrix */}
        {viewMode === 'matrix' && (
          <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Petunjuk:</strong> Klik langsung pada sel hari yang bertanda 
                <span className="inline-block mx-1 px-1.5 py-0.2 bg-rose-100 text-rose-800 font-bold rounded border border-rose-300">Merah</span> 
                atau 
                <span className="inline-block mx-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded border border-amber-300">Oranye</span> 
                untuk membuka opsi <strong>Edit</strong>, <strong>Hapus</strong>, atau <strong>Pasangkan Tap</strong> seketika!
              </span>
            </div>
            <span className="text-[11px] text-blue-700 hidden md:inline font-semibold">
              Periode: {period.startDate} s.d. {period.endDate}
            </span>
          </div>
        )}

        {/* TABLE VIEW 1: MATRIX MINGGUAN INTERAKTIF (DAILY MATRIX) */}
        {viewMode === 'matrix' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center w-10">Status</th>
                  <th className="py-2.5 px-3.5 border-r border-slate-200 min-w-[150px]">Nama & ID Mesin</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">Bagian</th>

                  {/* 7 Days Headers (Sabtu to Jumat) */}
                  {periodDates.map((dateStr) => {
                    const dayName = getIndonesianDayName(dateStr);
                    return (
                      <th
                        key={dateStr}
                        className="py-2 px-2 text-center border-r border-slate-200 bg-slate-200/60 font-bold text-slate-900 min-w-[110px]"
                      >
                        <span className="block text-[11px] uppercase">{dayName}</span>
                        <span className="block text-[10px] font-mono font-normal text-slate-600">
                          {dateStr.substring(5)}
                        </span>
                      </th>
                    );
                  })}

                  {/* Total Metrics */}
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-blue-950 bg-blue-50/50">
                    Total H
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-amber-950 bg-amber-50/50">
                    Total L
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-50">
                    Jumlah Honor
                  </th>
                  <th className="py-2.5 px-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-900">
                {sortedAndFilteredRecaps.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="font-semibold text-xs text-slate-700">Tidak ada karyawan yang sesuai filter.</p>
                      <button
                        onClick={onLoadSampleData}
                        className="text-xs text-blue-600 underline mt-1.5 inline-block font-medium"
                      >
                        Muat data contoh PR Sekar Anom
                      </button>
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredRecaps.map((r) => {
                    const isRed = r.status_color === 'red';
                    const isYellow = r.status_color === 'yellow';
                    const isUnmapped = r.employee.is_unmapped_new_name || r.flags.some((f) => f.code === 'R04');
                    const isZeroTap = r.total_taps === 0 || r.flags.some((f) => f.code === 'Y05');

                    return (
                      <tr
                        key={r.employee.employee_id}
                        className={`hover:bg-slate-50 transition border-l-4 ${
                          isUnmapped
                            ? 'border-l-rose-600 bg-rose-50/40'
                            : isRed
                            ? 'border-l-rose-500 bg-rose-50/20'
                            : isZeroTap
                            ? 'border-l-orange-500 bg-orange-50/20'
                            : isYellow
                            ? 'border-l-amber-400 bg-amber-50/15'
                            : 'border-l-emerald-500'
                        }`}
                      >
                        {/* Status Icon & Flags */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          {isRed ? (
                            <span title="Memblokir persetujuan (Perlu koreksi / penyesuaian)">
                              <AlertOctagon className="w-4 h-4 text-rose-600 mx-auto" />
                            </span>
                          ) : isYellow ? (
                            <span title="Peringatan (Perlu ditinjau / catatan)">
                              <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                            </span>
                          ) : (
                            <span title="Valid & Lengkap">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            </span>
                          )}
                        </td>

                        {/* Name & ID + Quick Actions for Unmapped / Notes */}
                        <td className="py-2.5 px-3.5 border-r border-slate-200">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => onSelectEmployee(r.employee.employee_id)}
                              className="text-left group"
                            >
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition block text-xs">
                                {r.employee.nama}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {isUnmapped ? `ID File: ${r.employee.unmapped_raw_id || r.employee.nama}` : `ID Mesin: ${r.employee.employee_id}`}
                              </span>
                            </button>

                            {/* UNMAPPED NEW NAME ACTIONS */}
                            {isUnmapped && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                  NAMA BARU DI FILE
                                </span>
                                {!isLocked && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setQuickRegisterContext({
                                          rawId: r.employee.unmapped_raw_id || r.employee.employee_id.replace('UNMAPPED_', '') || r.employee.nama,
                                          nama: r.employee.nama,
                                          bagian: r.employee.bagian && r.employee.bagian !== 'Nama Baru (Belum Terdaftar)' && r.employee.bagian !== 'Umum' ? r.employee.bagian : 'PRODUKSI',
                                          upahHarian: '',
                                          upahLembur: '',
                                        });
                                        setQuickRegisterError('');
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 py-0.5 rounded shadow-2xs transition"
                                      title="Daftarkan nama baru ini ke Master Data Karyawan"
                                    >
                                      <UserPlus className="w-2.5 h-2.5" />
                                      <span>Daftarkan</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeleteUnmappedContext({
                                          rawIdOrEmpId: r.employee.employee_id,
                                          nama: r.employee.nama,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded transition"
                                      title="Hapus baris nama ini dari absensi"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Hapus Baris</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* ZERO TAPS / LEAVE NOTE BADGE */}
                            {isZeroTap && !isUnmapped && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                <span className="text-[9px] bg-orange-100 text-orange-800 font-bold border border-orange-300 px-1.5 py-0.5 rounded">
                                  Tanpa Tap
                                </span>
                                {r.attendance_note ? (
                                  <span className="text-[9px] bg-amber-50 text-amber-900 font-semibold border border-amber-200 px-1.5 py-0.5 rounded">
                                    📝 {r.attendance_note}
                                  </span>
                                ) : null}
                                {!isLocked && (
                                  <button
                                    onClick={() => {
                                      setNoteModalContext({
                                        employeeId: r.employee.employee_id,
                                        employeeName: r.employee.nama,
                                        currentNote: r.attendance_note || '',
                                      });
                                      setNoteModalInput(r.attendance_note || '');
                                    }}
                                    className="text-[9px] text-blue-600 hover:text-blue-800 underline font-semibold"
                                  >
                                    {r.attendance_note ? 'Ubah' : '+ Catatan Cuti'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Bagian */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {r.employee.bagian}
                        </td>

                        {/* 7 Day Matrix Interactive Cells */}
                        {periodDates.map((dateStr) => {
                          const sessionsOnDay = r.sessions.filter(
                            (s) => s.date_str === dateStr || s.check_in.startsWith(dateStr)
                          );
                          const tapsOnDay = r.raw_taps.filter((t) => t.timestamp.startsWith(dateStr));
                          const validTapsOnDay = tapsOnDay.filter((t) => !t.is_deduped);
                          
                          // Orphan taps on day (taps not matched into any session)
                          const orphanTapsOnDay = validTapsOnDay.filter(
                            (t) => !r.sessions.some((s) => s.check_in === t.timestamp || s.check_out === t.timestamp)
                          );

                          // Determine cell issues:
                          const hasOrphan = orphanTapsOnDay.length > 0;
                          const hasAnomalySession = sessionsOnDay.some((s) => s.is_anomaly);
                          const hasManualEdit = sessionsOnDay.some((s) => s.is_manually_edited);
                          const totalHoursDay = sessionsOnDay.reduce((acc, s) => acc + s.duration_hours, 0);

                          const isDayRed = hasOrphan || hasAnomalySession;
                          const isDayYellow = !isDayRed && (hasManualEdit || (totalHoursDay > 0 && totalHoursDay > 13) || (totalHoursDay > 0 && totalHoursDay < 4));
                          const isDayGreen = !isDayRed && !isDayYellow && sessionsOnDay.length > 0;
                          const isDayEmpty = sessionsOnDay.length === 0 && tapsOnDay.length === 0;

                          return (
                            <td
                              key={dateStr}
                              onClick={() => handleOpenDayModal(r, dateStr)}
                              className={`p-1.5 border-r border-slate-200 cursor-pointer transition text-center relative group ${
                                isDayRed
                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-300'
                                  : isDayYellow
                                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300'
                                  : isDayGreen
                                  ? 'hover:bg-blue-50/50'
                                  : 'hover:bg-slate-100/60 opacity-60 hover:opacity-100'
                              }`}
                            >
                              {/* RED CELL: Orphan tap or Anomaly session */}
                              {isDayRed && (
                                <div className="p-1 rounded-lg border border-rose-300 bg-white/90 shadow-2xs space-y-0.5">
                                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-rose-700">
                                    <AlertOctagon className="w-3 h-3 text-rose-600 animate-pulse" />
                                    <span>
                                      {hasOrphan
                                        ? `${orphanTapsOnDay.length} Tap Tunggal`
                                        : 'Sesi Anomali'}
                                    </span>
                                  </div>
                                  <div className="text-[9px] font-mono text-rose-900 truncate">
                                    {hasOrphan
                                      ? orphanTapsOnDay[0].timestamp.substring(11, 16)
                                      : `${sessionsOnDay[0]?.check_in.substring(11, 16)} - ${sessionsOnDay[0]?.check_out.substring(11, 16)}`}
                                  </div>
                                  <span className="text-[9px] bg-rose-600 text-white px-1 py-0.2 rounded font-bold inline-block">
                                    Klik Edit / Hapus
                                  </span>
                                </div>
                              )}

                              {/* YELLOW / ORANGE CELL: Warning / Manual Edit */}
                              {isDayYellow && (
                                <div className="p-1 rounded-lg border border-amber-300 bg-white/90 shadow-2xs space-y-0.5">
                                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-700">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>{totalHoursDay.toFixed(1)} Jam</span>
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-700">
                                    {sessionsOnDay[0]?.check_in.substring(11, 16)} - {sessionsOnDay[0]?.check_out.substring(11, 16)}
                                  </div>
                                  {hasManualEdit && (
                                    <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-medium">
                                      Koreksi
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* GREEN CELL: Valid Clean Sessions */}
                              {isDayGreen && (
                                <div className="p-1 rounded-lg border border-slate-200 bg-white/80 space-y-0.5">
                                  <div className="text-[10px] font-mono font-bold text-slate-800">
                                    {sessionsOnDay[0]?.check_in.substring(11, 16)} - {sessionsOnDay[0]?.check_out.substring(11, 16)}
                                  </div>
                                  <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
                                    <span className="font-mono font-bold text-blue-700">{totalHoursDay.toFixed(1)}j</span>
                                    <span>• H: {sessionsOnDay.reduce((a, s) => a + s.H, 0).toFixed(1)}</span>
                                  </div>
                                </div>
                              )}

                              {/* EMPTY / OFF DAY CELL */}
                              {isDayEmpty && (
                                <div className="py-2 text-[11px] text-slate-400 font-mono">
                                  <span>-</span>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total H */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-blue-700 border-r border-slate-200 bg-blue-50/20">
                          {formatDecimal(r.total_H)}
                        </td>

                        {/* Total L */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-amber-700 border-r border-slate-200 bg-amber-50/20">
                          {formatDecimal(r.total_L)}
                        </td>

                        {/* Total Honor */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-slate-900 border-r border-slate-200">
                          {formatRupiah(r.total_honor)}
                        </td>

                        {/* Action Button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => onSelectEmployee(r.employee.employee_id)}
                            className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 transition"
                            title="Tinjau detail lengkap karyawan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE VIEW 2: SUMMARY TABLE (PREVIOUS AGGREGATE VIEW) */}
        {viewMode === 'summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 w-10 text-center">Status</th>
                  <th className="py-2.5 px-3.5">Nama & ID Mesin</th>
                  <th className="py-2.5 px-3.5">Bagian</th>
                  <th className="py-2.5 px-3.5">Penanda Anomali</th>
                  <th className="py-2.5 px-3.5 text-center">Hari Masuk (H)</th>
                  <th className="py-2.5 px-3.5 text-center">Lembur (L)</th>
                  <th className="py-2.5 px-3.5 text-right">Tarif Harian</th>
                  <th className="py-2.5 px-3.5 text-right">Tarif Lembur</th>
                  <th className="py-2.5 px-3.5 text-right">Jumlah Honor</th>
                  <th className="py-2.5 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sortedAndFilteredRecaps.map((r) => {
                  const isRed = r.status_color === 'red';
                  const isYellow = r.status_color === 'yellow';
                  const isUnmapped = r.employee.is_unmapped_new_name || r.flags.some((f) => f.code === 'R04');

                  return (
                    <tr
                      key={r.employee.employee_id}
                      onClick={() => onSelectEmployee(r.employee.employee_id)}
                      className={`cursor-pointer transition border-l-4 ${
                        isUnmapped
                          ? 'border-l-rose-600 bg-rose-50/50 hover:bg-rose-50/80'
                          : isRed
                          ? 'border-l-rose-500 bg-rose-50/40 hover:bg-rose-50/70'
                          : isYellow
                          ? 'border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/60'
                          : 'border-l-emerald-500 hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        {isRed && <AlertOctagon className="w-4 h-4 text-rose-600 mx-auto" />}
                        {isYellow && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
                        {!isRed && !isYellow && <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-slate-900 text-xs">{r.employee.nama}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {isUnmapped ? `ID File: ${r.employee.unmapped_raw_id || r.employee.nama}` : `ID Mesin: ${r.employee.employee_id}`}
                        </div>
                        {isUnmapped && (
                          <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            Nama Baru di File
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800 text-[11px]">{r.employee.bagian}</td>
                      <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1 items-center">
                          {r.flags.length === 0 ? (
                            <span className="text-[10px] text-emerald-600 font-medium">✓ Valid</span>
                          ) : (
                            r.flags.map((flag, fIdx) => (
                              <span
                                key={fIdx}
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  flag.level === 'red'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                                title={flag.description}
                              >
                                {flag.code}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-xs text-slate-900">
                        {formatDecimal(r.total_H)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-xs text-amber-600">
                        {formatDecimal(r.total_L)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-[11px] text-slate-600">
                        {formatRupiah(r.employee.upah_harian)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-[11px] text-slate-600">
                        {formatRupiah(r.employee.upah_lembur_per_jam)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs text-emerald-600">
                        {formatRupiah(r.total_honor)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectEmployee(r.employee.employee_id)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2 py-1 rounded font-semibold text-[11px] border border-slate-200 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Tinjau</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* QUICK REGISTER UNMAPPED EMPLOYEE MODAL */}
      {quickRegisterContext && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-200">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daftarkan Karyawan ke Master Data</h3>
                <p className="text-xs text-slate-500">ID, Nama, dan Divisi terisi otomatis dari file</p>
              </div>
            </div>

            {quickRegisterError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{quickRegisterError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">No / ID Mesin:</label>
                  </div>
                  <input
                    type="text"
                    value={quickRegisterContext.rawId}
                    onChange={(e) =>
                      setQuickRegisterContext({ ...quickRegisterContext, rawId: e.target.value })
                    }
                    placeholder="ID Mesin"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Nama Lengkap:</label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">Otomatis File</span>
                  </div>
                  <input
                    type="text"
                    value={quickRegisterContext.nama}
                    onChange={(e) =>
                      setQuickRegisterContext({ ...quickRegisterContext, nama: e.target.value })
                    }
                    placeholder="Nama Karyawan"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Divisi / Bagian:</label>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">Otomatis File</span>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={['GILING', 'PACKING', 'BANDROL', 'PRODUKSI', 'GUDANG', 'MANDOR'].includes(quickRegisterContext.bagian.toUpperCase()) ? quickRegisterContext.bagian.toUpperCase() : 'OTHER'}
                    onChange={(e) => {
                      if (e.target.value !== 'OTHER') {
                        setQuickRegisterContext({ ...quickRegisterContext, bagian: e.target.value });
                      }
                    }}
                    className="w-1/2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PRODUKSI">PRODUKSI</option>
                    <option value="GILING">GILING</option>
                    <option value="PACKING">PACKING</option>
                    <option value="BANDROL">BANDROL</option>
                    <option value="GUDANG">GUDANG</option>
                    <option value="MANDOR">MANDOR</option>
                    <option value="OTHER">Lainnya / Kustom</option>
                  </select>
                  <input
                    type="text"
                    value={quickRegisterContext.bagian}
                    onChange={(e) =>
                      setQuickRegisterContext({ ...quickRegisterContext, bagian: e.target.value })
                    }
                    placeholder="Nama Divisi/Bagian"
                    className="w-1/2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                  <span>Atur Tarif Upah Karyawan</span>
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded">Wajib Diisi</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-800 font-semibold mb-1">
                      Upah Harian (Rp) <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      value={quickRegisterContext.upahHarian}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setQuickRegisterContext({
                          ...quickRegisterContext,
                          upahHarian: val,
                        });
                        setQuickRegisterError('');
                      }}
                      placeholder="Wajib, misal: 150000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-semibold mb-1">
                      Upah Lembur/Jam (Rp) <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      value={quickRegisterContext.upahLembur}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setQuickRegisterContext({
                          ...quickRegisterContext,
                          upahLembur: val,
                        });
                        setQuickRegisterError('');
                      }}
                      placeholder="Wajib, misal: 12500"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setQuickRegisterContext(null);
                  setQuickRegisterError('');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!quickRegisterContext.rawId.trim()) {
                    setQuickRegisterError('No / ID Mesin tidak boleh kosong.');
                    return;
                  }
                  if (!quickRegisterContext.nama.trim()) {
                    setQuickRegisterError('Nama karyawan tidak boleh kosong.');
                    return;
                  }
                  if (!quickRegisterContext.bagian.trim()) {
                    setQuickRegisterError('Divisi / Bagian tidak boleh kosong.');
                    return;
                  }
                  if (quickRegisterContext.upahHarian === '' || isNaN(Number(quickRegisterContext.upahHarian)) || Number(quickRegisterContext.upahHarian) <= 0) {
                    setQuickRegisterError('Upah Harian wajib diisi dengan nominal lebih dari 0.');
                    return;
                  }
                  if (quickRegisterContext.upahLembur === '' || isNaN(Number(quickRegisterContext.upahLembur)) || Number(quickRegisterContext.upahLembur) < 0) {
                    setQuickRegisterError('Upah Lembur per jam wajib diisi (masukkan 0 jika tidak ada lembur).');
                    return;
                  }

                  if (onQuickRegisterUnmappedEmployee) {
                    onQuickRegisterUnmappedEmployee(
                      quickRegisterContext.rawId.trim(),
                      quickRegisterContext.nama.trim(),
                      quickRegisterContext.bagian.trim(),
                      Number(quickRegisterContext.upahHarian),
                      Number(quickRegisterContext.upahLembur)
                    );
                  }
                  setQuickRegisterContext(null);
                  setQuickRegisterError('');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
              >
                Daftarkan ke Master
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE UNMAPPED EMPLOYEE CONFIRMATION MODAL */}
      {deleteUnmappedContext && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Baris Nama Ini dari File?</h3>
                <p className="text-xs text-slate-500 font-mono">{deleteUnmappedContext.nama}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Baris nama <strong>{deleteUnmappedContext.nama}</strong> beserta seluruh tap absensinya pada periode ini akan dihapus dan tidak dimasukkan ke dalam perhitungan honor maupun rekap akhir.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteUnmappedContext(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDeleteUnmappedEmployee) {
                    onDeleteUnmappedEmployee(
                      deleteUnmappedContext.rawIdOrEmpId,
                      'Dihapus oleh HR dari Dashboard Tinjauan'
                    );
                  }
                  setDeleteUnmappedContext(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Hapus Baris Nama Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE NOTE MODAL */}
      {noteModalContext && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-orange-600">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Catatan Kehadiran / Cuti</h3>
                <p className="text-xs text-slate-500">{noteModalContext.employeeName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tuliskan Catatan:</label>
                <input
                  type="text"
                  value={noteModalInput}
                  onChange={(e) => setNoteModalInput(e.target.value)}
                  placeholder="Misal: Cuti Melahirkan, Cuti Tahunan, Sakit..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <span className="block text-slate-500 text-[11px] mb-1.5 font-medium">Pilihan Cepat (Klik untuk memilih):</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Cuti Melahirkan', 'Cuti Tahunan', 'Sakit', 'Izin Resmi', 'Off / Libur', ''].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNoteModalInput(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        preset === ''
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                          : 'bg-orange-50 hover:bg-orange-100 text-orange-950 border-orange-200 font-medium'
                      }`}
                    >
                      {preset === '' ? 'Kosongkan' : preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setNoteModalContext(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onSetAttendanceNote) {
                    onSetAttendanceNote(noteModalContext.employeeId, noteModalInput.trim());
                  }
                  setNoteModalContext(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DAY REVIEW & EDIT / DELETE MODAL (CLICKED DIRECTLY FROM THE MATRIX) */}
      {selectedDayContext && currentModalRecap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Tinjau & Koreksi Kehadiran: {getIndonesianDayName(selectedDayContext.dateStr)}, {selectedDayContext.dateStr}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Karyawan: <strong>{currentModalRecap.employee.nama}</strong> ({currentModalRecap.employee.employee_id}) • Bagian: <strong>{currentModalRecap.employee.bagian}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDayModal}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Day Summary & Flags */}
              {(() => {
                const dateStr = selectedDayContext.dateStr;
                const sessionsOnDay = currentModalRecap.sessions.filter(
                  (s) => s.date_str === dateStr || s.check_in.startsWith(dateStr)
                );
                const tapsOnDay = currentModalRecap.raw_taps.filter((t) => t.timestamp.startsWith(dateStr));
                const validTapsOnDay = tapsOnDay.filter((t) => !t.is_deduped);
                const orphanTapsOnDay = validTapsOnDay.filter(
                  (t) => !currentModalRecap.sessions.some((s) => s.check_in === t.timestamp || s.check_out === t.timestamp)
                );
                const hasAnomaly = orphanTapsOnDay.length > 0 || sessionsOnDay.some((s) => s.is_anomaly);

                return (
                  <div className="space-y-4">
                    {/* Status Alert Banner */}
                    {hasAnomaly ? (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-rose-950">
                            Ditemukan Anomali Kehadiran pada Hari Ini
                          </p>
                          <p className="text-[11px] text-rose-800 mt-0.5">
                            {orphanTapsOnDay.length > 0
                              ? `Terdapat ${orphanTapsOnDay.length} tap tunggal (tak berpasangan). Anda dapat memasangkan tap menjadi sesi resmi atau menghapus/mengabaikan tap jika salah tempel.`
                              : 'Terdapat durasi sesi kerja yang melebihi atau di bawah batas standar validasi pabrik.'}
                          </p>
                        </div>
                      </div>
                    ) : sessionsOnDay.length > 0 ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-xs">
                            Sesi Kehadiran pada hari ini Valid & Terhitung ({sessionsOnDay.reduce((a, s) => a + s.duration_hours, 0).toFixed(2)} Jam)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 text-xs">
                          {formatRupiah((Math.round(sessionsOnDay.reduce((a, s) => a + s.H, 0) * 100) / 100) * currentModalRecap.employee.upah_harian)}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center justify-between">
                        <span>Tidak ada catatan kehadiran / Hari Libur.</span>
                        {!isLocked && (
                          <button
                            onClick={() => handleStartAddSession(dateStr)}
                            className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Sesi Manual</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Work Sessions List for this day */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Sesi Kerja Hari Ini ({sessionsOnDay.length})
                        </h4>
                        {!isLocked && !editingSession && !isAddingNewSession && (
                          <button
                            onClick={() => handleStartAddSession(dateStr)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Sesi</span>
                          </button>
                        )}
                      </div>

                      {sessionsOnDay.length === 0 ? (
                        <p className="text-slate-400 text-xs italic bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          Belum ada sesi kerja tercatat di hari ini.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sessionsOnDay.map((sess) => (
                            <div
                              key={sess.id}
                              className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                sess.is_manually_edited
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {sess.check_in.substring(11, 16)} ➔ {sess.check_out.substring(11, 16)}
                                  </span>
                                  {sess.is_manually_edited ? (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                                      Koreksi Manual
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded">
                                      Fingerprint
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-3">
                                  <span>Durasi: <strong className="text-slate-900">{sess.duration_hours.toFixed(2)} jam</strong></span>
                                  <span>• H: <strong className="text-blue-700">{formatDecimal(sess.H)}</strong></span>
                                  <span>• L: <strong className="text-amber-700">{formatDecimal(sess.L)} jam</strong></span>
                                </div>
                                {sess.manual_edit_reason && (
                                  <p className="text-[10px] text-slate-500 italic">
                                    Alasan: {sess.manual_edit_reason}
                                  </p>
                                )}
                              </div>

                              {/* Edit / Delete Buttons for this session */}
                              {!isLocked && (
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  <button
                                    onClick={() => handleStartEditSession(sess)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => setSessionToDelete(sess)}
                                    className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Orphan Taps (Unpaired taps on this day) */}
                    {orphanTapsOnDay.length > 0 && (
                      <div className="space-y-2 p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-rose-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                            Tap Tak Berpasangan ({orphanTapsOnDay.length})
                          </h4>
                          <span className="text-[10px] text-rose-700 font-semibold">
                            Wajib Ditindaklanjuti
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {orphanTapsOnDay.map((tap) => (
                            <div
                              key={tap.id}
                              className="bg-white p-2.5 rounded-lg border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono font-bold text-rose-950 text-xs">
                                  {tap.timestamp}
                                </span>
                                <span className="text-[11px] text-slate-500 block">
                                  Mesin: {tap.machine_id} ({tap.machine_user_id})
                                </span>
                              </div>

                              {!isLocked && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleStartAddSession(dateStr, tap.timestamp)}
                                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition"
                                    title="Buat sesi kerja berpasangan dari tap ini"
                                  >
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>Pasangkan Jadi Sesi</span>
                                  </button>
                                  <button
                                    onClick={() => setTapToDelete(tap)}
                                    className="inline-flex items-center gap-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold px-2 py-1.5 rounded-lg border border-rose-300 transition"
                                    title="Hapus / abaikan tap dari perhitungan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Tap</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Form: Edit or Add Session */}
                    {(editingSession || isAddingNewSession) && (
                      <div className="p-4 bg-blue-50/60 border-2 border-blue-300 rounded-xl space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5 uppercase">
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            {isAddingNewSession ? 'Tambah Sesi Kerja Manual' : 'Edit Jam Sesi Kerja'}
                          </h4>
                          <button
                            onClick={() => {
                              setEditingSession(null);
                              setIsAddingNewSession(false);
                              setFormError('');
                            }}
                            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                          >
                            Batal
                          </button>
                        </div>

                        {formError && (
                          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg">
                            {formError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Jam Masuk (Check-In)
                            </label>
                            <input
                              type="text"
                              value={editCheckIn}
                              onChange={(e) => setEditCheckIn(e.target.value)}
                              placeholder="YYYY-MM-DD HH:mm"
                              className="w-full bg-white border border-slate-300 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Jam Keluar (Check-Out)
                            </label>
                            <input
                              type="text"
                              value={editCheckOut}
                              onChange={(e) => setEditCheckOut(e.target.value)}
                              placeholder="YYYY-MM-DD HH:mm"
                              className="w-full bg-white border border-slate-300 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Alasan Koreksi (Wajib Diisi untuk Audit Log HR):
                          </label>
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="Contoh: Lupa tap keluar saat pulang kerja, konfirmasi mandor"
                            className="w-full bg-white border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setEditingSession(null);
                              setIsAddingNewSession(false);
                              setFormError('');
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleSaveSessionForm}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => {
                  const empId = currentModalRecap.employee.employee_id;
                  handleCloseDayModal();
                  onSelectEmployee(empId);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5"
              >
                <span>Buka Rincian Lengkap Seluruh Minggu ({currentModalRecap.employee.nama})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCloseDayModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition w-full sm:w-auto text-center"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION: DELETE WORK SESSION */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Sesi Kerja?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {sessionToDelete.check_in} ➔ {sessionToDelete.check_out}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Alasan Penghapusan Sesi (Wajib):
              </label>
              <select
                value={deleteSessionReason}
                onChange={(e) => setDeleteSessionReason(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Data sesi ganda / salah tap">Data sesi ganda / salah tap</option>
                <option value="Karyawan tidak hadir / salah identifikasi mesin">Karyawan tidak hadir / salah identifikasi mesin</option>
                <option value="Koreksi administratif manual">Koreksi administratif manual</option>
                <option value="Lainnya">Lainnya (Tulis alasan sendiri)</option>
              </select>

              {deleteSessionReason === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Tulis alasan spesifik..."
                  value={customDeleteSessionReason}
                  onChange={(e) => setCustomDeleteSessionReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1.5"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Hapus Sesi Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION: DELETE / IGNORE RAW TAP */}
      {tapToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Abaikan / Hapus Tap Mentah?</h3>
                <p className="text-xs text-slate-500 font-mono">{tapToDelete.timestamp}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Alasan Penghapusan Tap:
              </label>
              <select
                value={deleteTapReason}
                onChange={(e) => setDeleteTapReason(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tap salah / ganda tak sengaja">Tap salah / ganda tak sengaja</option>
                <option value="Salah jari / percobaan berkali-kali">Salah jari / percobaan berkali-kali</option>
                <option value="Tap saat bukan jadwal kerja">Tap saat bukan jadwal kerja</option>
                <option value="Lainnya">Lainnya (Tulis alasan sendiri)</option>
              </select>

              {deleteTapReason === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Tulis alasan spesifik..."
                  value={customDeleteTapReason}
                  onChange={(e) => setCustomDeleteTapReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1.5"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTapToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteRawTap}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Hapus Tap Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar for Final Approval / Locking */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 text-slate-800 py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isLocked ? (
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Periode Sudah Terkunci (Read-Only). Semua data rekap telah disetujui.</span>
              </div>
            ) : redCount > 0 ? (
              <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>
                  Ada <strong>{redCount} penanda merah</strong> yang memblokir persetujuan. Klik sel merah di tabel untuk koreksi langsung.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Semua baris valid! Siap untuk diproses akhir dan dikunci.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isLocked ? (
              <button
                id="btn-unlock-period"
                onClick={onUnlockPeriod}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-amber-800 text-xs font-semibold px-3.5 py-2 rounded-lg border border-amber-300 transition"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                Buka Kunci Periode
              </button>
            ) : (
              <button
                id="btn-lock-period"
                onClick={onLockPeriod}
                disabled={!canFinalize}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition ${
                  canFinalize
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title={
                  !canFinalize
                    ? 'Tidak dapat memproses selama masih ada penanda merah atau tanggal belum lengkap'
                    : 'Kunci periode dan buat rekap final'
                }
              >
                <Lock className="w-3.5 h-3.5" />
                Kunci & Proses Akhir Periode
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
