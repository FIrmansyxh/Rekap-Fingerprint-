import React, { useState } from 'react';
import {
  X,
  Clock,
  Fingerprint,
  AlertOctagon,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  RotateCcw,
  Link2,
  Check,
  Info,
} from 'lucide-react';
import { EmployeeRecap, WorkSession, RawTap, SystemSettings } from '../types';
import { formatRupiah, formatDecimal, getIndonesianDayName } from '../utils/engine';

interface EmployeeDetailModalProps {
  recap: EmployeeRecap | null;
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  settings: SystemSettings;
  onUpdateSessions: (
    employeeId: string,
    updatedSessions: WorkSession[],
    actionType: 'EDIT_SESSION' | 'ADD_SESSION' | 'DELETE_SESSION',
    beforeVal: string,
    afterVal: string,
    reason: string
  ) => void;
  onDeleteRawTap?: (tapId: string, reason: string) => void;
  onRestoreRawTap?: (tapId: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  recap,
  isOpen,
  onClose,
  isLocked,
  settings,
  onUpdateSessions,
  onDeleteRawTap,
  onRestoreRawTap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'raw_taps' | 'anomalies'>('sessions');
  const [rawTapFilter, setRawTapFilter] = useState<'all' | 'valid' | 'deduped'>('all');

  // Edit / Add Form State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);

  // Form Fields
  const [formDate, setFormDate] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState('');

  // In-App Modal for Deleting a Work Session
  const [sessionToDelete, setSessionToDelete] = useState<WorkSession | null>(null);
  const [deleteSessionReasonOption, setDeleteSessionReasonOption] = useState('Data sesi ganda / salah tap');
  const [customDeleteSessionReason, setCustomDeleteSessionReason] = useState('');
  const [deleteSessionError, setDeleteSessionError] = useState('');

  // Inline Delete Raw Tap Confirmation State
  const [tapToDelete, setTapToDelete] = useState<RawTap | null>(null);
  const [deleteTapReason, setDeleteTapReason] = useState('Tap salah / ganda tak sengaja');
  const [customDeleteTapReason, setCustomDeleteTapReason] = useState('');

  if (!isOpen || !recap) return null;

  const { employee, sessions, raw_taps, flags } = recap;
  const orphanTaps = raw_taps.filter(
    (t) => !t.is_deduped && !sessions.some((s) => s.check_in === t.timestamp || s.check_out === t.timestamp)
  );

  // Open Edit Form
  const handleStartEdit = (session: WorkSession) => {
    if (isLocked) return;
    setActiveSubTab('sessions');
    setEditingSessionId(session.id);
    setIsAddingSession(false);
    setFormDate(session.date_str);
    setFormCheckIn(session.check_in);
    setFormCheckOut(session.check_out);
    setFormReason(session.manual_edit_reason || '');
    setFormError('');
  };

  // Open Add Form & Switch to Sessions Tab
  const handleStartAdd = (prefillDate?: string, prefillCheckIn?: string) => {
    if (isLocked) return;
    setActiveSubTab('sessions');
    setIsAddingSession(true);
    setEditingSessionId(null);

    const baseDate = prefillDate || (prefillCheckIn ? prefillCheckIn.split(' ')[0] : '2026-08-15');
    const checkInVal = prefillCheckIn || `${baseDate} 07:00`;

    // Calculate default 12 hours check-out
    let checkOutVal = `${baseDate} 19:00`;
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

    setFormDate(baseDate);
    setFormCheckIn(checkInVal);
    setFormCheckOut(checkOutVal);
    setFormReason(prefillCheckIn ? `Pemasangan manual dari tap tak berpasangan (${prefillCheckIn})` : 'Penambahan sesi kerja manual oleh HR');
    setFormError('');
  };

  // Cancel Form
  const handleCancelForm = () => {
    setEditingSessionId(null);
    setIsAddingSession(false);
    setFormError('');
  };

  // Save Session Edit or Add
  const handleSaveSession = () => {
    if (!formReason.trim()) {
      setFormError('Alasan koreksi WAJIB diisi untuk kebutuhan jejak audit log.');
      return;
    }

    const tIn = new Date(formCheckIn.replace(' ', 'T')).getTime();
    const tOut = new Date(formCheckOut.replace(' ', 'T')).getTime();

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
    const H = Math.min(durationHours / settings.standard_hours, 1.0);
    const L = Math.max(0, durationHours - settings.overtime_threshold_hours);

    if (isAddingSession) {
      const newSession: WorkSession = {
        id: `sess-manual-${Date.now()}`,
        employee_id: employee.employee_id,
        date_str: formDate || formCheckIn.split(' ')[0],
        check_in: formCheckIn,
        check_out: formCheckOut,
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        H,
        L,
        is_anomaly: false,
        anomaly_reasons: [],
        is_manually_edited: true,
        manual_edit_reason: formReason,
      };

      const updated = [...sessions, newSession].sort(
        (a, b) => new Date(a.check_in.replace(' ', 'T')).getTime() - new Date(b.check_in.replace(' ', 'T')).getTime()
      );
      onUpdateSessions(
        employee.employee_id,
        updated,
        'ADD_SESSION',
        '- (Sesi Baru)',
        `${formCheckIn} s.d. ${formCheckOut} (${durationHours.toFixed(2)}j, H:${H.toFixed(2)}, L:${L.toFixed(2)})`,
        formReason
      );
    } else if (editingSessionId) {
      const targetOld = sessions.find((s) => s.id === editingSessionId);
      const beforeStr = targetOld
        ? `${targetOld.check_in} s.d. ${targetOld.check_out} (Durasi: ${targetOld.duration_hours.toFixed(2)}j)`
        : 'Tidak diketahui';

      const updated = sessions.map((s) => {
        if (s.id === editingSessionId) {
          return {
            ...s,
            date_str: formDate || formCheckIn.split(' ')[0],
            check_in: formCheckIn,
            check_out: formCheckOut,
            duration_minutes: durationMinutes,
            duration_hours: durationHours,
            H,
            L,
            is_manually_edited: true,
            manual_edit_reason: formReason,
          };
        }
        return s;
      });

      onUpdateSessions(
        employee.employee_id,
        updated,
        'EDIT_SESSION',
        beforeStr,
        `${formCheckIn} s.d. ${formCheckOut} (${durationHours.toFixed(2)}j, H:${H.toFixed(2)}, L:${L.toFixed(2)})`,
        formReason
      );
    }

    handleCancelForm();
  };

  // Delete Session In-App Confirmation
  const handleConfirmDeleteSession = () => {
    if (!sessionToDelete || isLocked) return;
    const finalReason = deleteSessionReasonOption === 'Lainnya' ? customDeleteSessionReason.trim() : deleteSessionReasonOption;
    if (!finalReason) {
      setDeleteSessionError('Alasan penghapusan sesi wajib diisi.');
      return;
    }

    const beforeStr = `${sessionToDelete.check_in} s.d. ${sessionToDelete.check_out} (${sessionToDelete.duration_hours.toFixed(2)} jam)`;
    const updated = sessions.filter((s) => s.id !== sessionToDelete.id);

    onUpdateSessions(
      employee.employee_id,
      updated,
      'DELETE_SESSION',
      beforeStr,
      'Sesi Dihapus',
      finalReason
    );

    setSessionToDelete(null);
    setCustomDeleteSessionReason('');
    setDeleteSessionError('');
  };

  // Confirm and execute delete/ignore raw tap
  const handleConfirmDeleteRawTap = () => {
    if (!tapToDelete) return;
    const finalReason = deleteTapReason === 'Lainnya' ? customDeleteTapReason.trim() : deleteTapReason;
    if (!finalReason) {
      return;
    }

    if (onDeleteRawTap) {
      onDeleteRawTap(tapToDelete.id, finalReason);
    }
    setTapToDelete(null);
    setCustomDeleteTapReason('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Top Modal Header */}
        <div className="bg-white text-slate-900 p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 border border-blue-500/30 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {employee.nama.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{employee.nama}</h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                  {employee.employee_id}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  {employee.bagian}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
                <span>Upah Harian: <strong className="text-slate-900">{formatRupiah(employee.upah_harian)}</strong></span>
                <span>• Upah Lembur: <strong className="text-slate-900">{formatRupiah(employee.upah_lembur_per_jam)}/jam</strong></span>
                <span>• Mesin: <strong className="text-slate-900 font-mono">{recap.machines_used.join(', ') || 'Belum Ada Tap'}</strong></span>
              </div>
            </div>
          </div>

          <button
            id="btn-close-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Summary & Flags Alert Bar */}
        <div className="bg-slate-50/90 p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 block font-medium">Total Hari Masuk (H)</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {formatDecimal(recap.total_H)} <span className="text-xs font-normal text-slate-500">Hari</span>
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 block font-medium">Total Jam Lembur (L)</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {formatDecimal(recap.total_L)} <span className="text-xs font-normal text-slate-500">Jam</span>
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 block font-medium">Total Honor Minggu Ini</span>
            <span className="text-lg font-bold text-blue-600 font-mono">
              {formatRupiah(recap.total_honor)}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 block font-medium">Status Penanda</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {recap.status_color === 'red' && (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4" /> Ada Penanda Merah
                </span>
              )}
              {recap.status_color === 'yellow' && (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Perhatian (Kuning)
                </span>
              )}
              {recap.status_color === 'green' && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Lengkap & Valid
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Flag Badges Description (if any) */}
        {flags.length > 0 && (
          <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-200 space-y-1.5">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Penanda Anomali Terdeteksi:
            </span>
            <div className="flex flex-wrap gap-2">
              {flags.map((f, i) => (
                <div
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                    f.level === 'red'
                      ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
                      : 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
                  }`}
                >
                  <span className="font-mono font-bold">{f.code}:</span>
                  <span>{f.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-slate-200 px-5 pt-3 bg-white gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'sessions'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Sesi Kerja Terbentuk ({sessions.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('raw_taps')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'raw_taps'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Data Tap Mentah Asli ({raw_taps.length})</span>
          </button>
          {orphanTaps.length > 0 && (
            <button
              onClick={() => setActiveSubTab('anomalies')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
                activeSubTab === 'anomalies'
                  ? 'border-rose-600 text-rose-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span>Tak Berpasangan ({orphanTaps.length})</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-white">
          
          {/* TAB 1: SESSIONS VIEW */}
          {activeSubTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  Berikut adalah sesi kerja yang dihitung sistem berdasarkan pemasangan tap masuk dan keluar.
                </p>
                {!isLocked && !editingSessionId && !isAddingSession && (
                  <button
                    id="btn-add-session"
                    onClick={() => handleStartAdd()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Sesi Manual
                  </button>
                )}
              </div>

              {/* Edit / Add Session Form Container */}
              {(isAddingSession || editingSessionId) && (
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      {isAddingSession ? 'Tambah Sesi Kerja Baru' : 'Edit Jam Sesi Kerja'}
                    </h4>
                    <span className="text-[11px] text-slate-500">Koreksi akan disimpan ke Audit Log</span>
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-800 font-semibold mb-1">
                        Tanggal Sesi
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-800 font-semibold mb-1">
                        Jam Masuk (Check-In)
                      </label>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD HH:mm"
                        value={formCheckIn}
                        onChange={(e) => setFormCheckIn(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-800 font-semibold mb-1">
                        Jam Keluar (Check-Out)
                      </label>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD HH:mm"
                        value={formCheckOut}
                        onChange={(e) => setFormCheckOut(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-800 font-bold mb-1">
                      Alasan Koreksi Manual <span className="text-rose-600">* (Wajib diisi)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Karyawan lupa tap keluar karena mesin mati / Mandor konfirmasi hadir"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={handleCancelForm}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveSession}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Simpan & Hitung Ulang
                    </button>
                  </div>
                </div>
              )}

              {/* Sessions Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal / Hari</th>
                      <th className="py-2.5 px-3">Jam Masuk</th>
                      <th className="py-2.5 px-3">Jam Keluar</th>
                      <th className="py-2.5 px-3">Durasi</th>
                      <th className="py-2.5 px-3">H (Hari)</th>
                      <th className="py-2.5 px-3">L (Lembur)</th>
                      <th className="py-2.5 px-3">Status</th>
                      {!isLocked && <th className="py-2.5 px-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Belum ada sesi kerja valid yang terbentuk.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((s, idx) => (
                        <tr
                          key={s.id || idx}
                          className={`hover:bg-slate-50 transition ${
                            s.is_manually_edited ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{s.date_str}</div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {getIndonesianDayName(s.date_str)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                            {s.check_in.split(' ')[1] || s.check_in}
                            <span className="block text-[10px] text-slate-500 font-sans">{s.check_in.split(' ')[0]}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                            {s.check_out.split(' ')[1] || s.check_out}
                            <span className="block text-[10px] text-slate-500 font-sans">{s.check_out.split(' ')[0]}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {s.duration_hours.toFixed(2)} jam
                            <span className="block text-[10px] text-slate-500 font-sans">({Math.round(s.duration_minutes)} mnt)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {formatDecimal(s.H)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-600">
                            {formatDecimal(s.L)}
                          </td>
                          <td className="py-2.5 px-3">
                            {s.is_manually_edited ? (
                              <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-300" title={s.manual_edit_reason}>
                                Koreksi Manual
                              </span>
                            ) : (
                              <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200">
                                Otomatis
                              </span>
                            )}
                          </td>
                          {!isLocked && (
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button
                                onClick={() => handleStartEdit(s)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition"
                                title="Edit Sesi"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSessionToDelete(s);
                                  setDeleteSessionReasonOption('Data sesi ganda / salah tap');
                                  setCustomDeleteSessionReason('');
                                  setDeleteSessionError('');
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition"
                                title="Hapus Sesi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RAW TAPS VIEW */}
          {activeSubTab === 'raw_taps' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <div>
                  <p className="font-bold text-slate-900">
                    Log Tap Mentah & Hasil Pembersihan Otomatis
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tap ganda dalam interval ≤ {settings.dedup_window_minutes} menit otomatis disaring dan ditandai agar tidak merusak sesi.
                  </p>
                </div>

                {/* Sub-filter tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setRawTapFilter('all')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      rawTapFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({raw_taps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawTapFilter('valid')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      rawTapFilter === 'valid'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    Aktif / Valid ({raw_taps.filter((t) => !t.is_deduped).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawTapFilter('deduped')}
                    className={`px-2.5 py-1 rounded font-medium transition ${
                      rawTapFilter === 'deduped'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Dibersihkan / Dihapus ({raw_taps.filter((t) => t.is_deduped).length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Timestamp Mentah</th>
                      <th className="py-2.5 px-3">ID Mesin</th>
                      <th className="py-2.5 px-3">ID User Mesin</th>
                      <th className="py-2.5 px-3">Status Pembersihan</th>
                      {!isLocked && <th className="py-2.5 px-3 text-right">Aksi HR</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {raw_taps.filter((t) => {
                      if (rawTapFilter === 'valid') return !t.is_deduped;
                      if (rawTapFilter === 'deduped') return t.is_deduped;
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Tidak ada data tap untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      raw_taps
                        .filter((t) => {
                          if (rawTapFilter === 'valid') return !t.is_deduped;
                          if (rawTapFilter === 'deduped') return t.is_deduped;
                          return true;
                        })
                        .map((tap, idx) => (
                          <tr
                            key={tap.id || idx}
                            className={`hover:bg-slate-50 transition ${
                              tap.is_deduped ? 'bg-slate-100/70 opacity-80' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                              {tap.timestamp}
                            </td>
                            <td className="py-2 px-3">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                                {tap.machine_id}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-800">{tap.machine_user_id}</td>
                            <td className="py-2 px-3">
                              {tap.is_deduped ? (
                                <span
                                  className="inline-block bg-rose-50 text-rose-800 text-[10px] font-medium px-2 py-0.5 rounded border border-rose-200"
                                  title={tap.dedup_reason}
                                >
                                  {tap.dedup_reason || 'Otomatis Dibersihkan'}
                                </span>
                              ) : (
                                <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                  ✓ Aktif / Valid
                                </span>
                              )}
                            </td>
                            {!isLocked && (
                              <td className="py-2 px-3 text-right space-x-1.5">
                                {!tap.is_deduped ? (
                                  <>
                                    <button
                                      onClick={() => handleStartAdd(tap.timestamp.split(' ')[0], tap.timestamp)}
                                      className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                                      title="Pasangkan Jadi Sesi"
                                    >
                                      <Link2 className="w-3 h-3" />
                                      Pasangkan
                                    </button>
                                    <button
                                      onClick={() => setTapToDelete(tap)}
                                      className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                                      title="Hapus / Abaikan Tap"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Hapus
                                    </button>
                                  </>
                                ) : (
                                  onRestoreRawTap && (
                                    <button
                                      onClick={() => onRestoreRawTap(tap.id)}
                                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-2 py-1 rounded text-[11px] font-semibold transition"
                                      title="Pulihkan tap ini kembali menjadi aktif"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Pulihkan
                                    </button>
                                  )
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TAK BERPASANGAN VIEW */}
          {activeSubTab === 'anomalies' && (
            <div className="space-y-4">
              {/* Informative explanation banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    Informasi & Solusi Data Tak Berpasangan ({orphanTaps.length} Tap)
                  </h4>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  Data di bawah ini adalah tap absensi yang <strong>tidak memiliki pasangan jam masuk atau jam keluar</strong> yang valid (misal: karyawan lupa tap saat pulang, salah menempelkan jari dua kali di hari lain, atau jeda antar-tap &gt; 24 jam).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                    <div>
                      <strong className="text-slate-900 block">Pasangkan Jadi Sesi</strong>
                      <span className="text-slate-600">Klik untuk membuka form dan melengkapi jam keluar (check-out) sehingga dihitung menjadi jam kerja.</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                    <div>
                      <strong className="text-slate-900 block">Hapus / Abaikan</strong>
                      <span className="text-slate-600">Jika tap ini merupakan tap salah/tak sengaja, hapus agar penanda merah anomali langsung hilang.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orphan Taps List */}
              <div className="space-y-3">
                {orphanTaps.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-800 text-xs">Semua tap sudah berpasangan dengan rapi!</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tidak ada anomali tap tak berpasangan pada karyawan ini.</p>
                  </div>
                ) : (
                  orphanTaps.map((tap, idx) => {
                    const datePart = tap.timestamp.split(' ')[0];
                    const timePart = tap.timestamp.split(' ')[1];
                    const dayName = getIndonesianDayName(datePart);

                    return (
                      <div
                        key={tap.id || idx}
                        className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs hover:border-blue-300 transition"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-base text-slate-900">
                              {timePart}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {dayName}, {datePart}
                            </span>
                            <span className="text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-semibold border border-rose-200">
                              Tak Berpasangan
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                            <span>ID Mesin: <strong className="font-mono text-slate-900">{tap.machine_id}</strong></span>
                            <span>• ID User Mesin: <strong className="font-mono text-slate-900">{tap.machine_user_id}</strong></span>
                            <span>• Status: <span className="text-amber-700 font-medium">Menunggu Tindakan HR</span></span>
                          </div>
                        </div>

                        {!isLocked && (
                          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                            <button
                              onClick={() => handleStartAdd(datePart, tap.timestamp)}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg shadow-xs transition active:scale-95"
                              title="Buka form untuk memasangkan tap ini menjadi sesi kerja"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>Pasangkan Jadi Sesi</span>
                            </button>
                            
                            <button
                              onClick={() => setTapToDelete(tap)}
                              className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-3 py-2 rounded-lg transition active:scale-95"
                              title="Abaikan atau hapus tap ini dari kalkulasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus / Abaikan</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* In-App Dialog: Delete Work Session Confirmation */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Hapus Sesi Kerja Karyawan
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sesi ini akan dihapus dan tercatat ke audit log
                  </p>
                </div>
              </div>

              {deleteSessionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                  {deleteSessionError}
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-mono text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Tanggal:</span>
                  <strong className="text-slate-900">{sessionToDelete.date_str}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Jam:</span>
                  <strong className="text-slate-900">{sessionToDelete.check_in} s.d. {sessionToDelete.check_out}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Durasi:</span>
                  <strong className="text-slate-900">{sessionToDelete.duration_hours.toFixed(2)} Jam</strong>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block font-bold text-slate-800">
                  Alasan Penghapusan Sesi <span className="text-rose-600">* (Wajib)</span>:
                </label>
                <select
                  value={deleteSessionReasonOption}
                  onChange={(e) => setDeleteSessionReasonOption(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Data sesi ganda / salah tap">Data sesi ganda / salah tap</option>
                  <option value="Karyawan konfirmasi izin / tidak masuk riil">Karyawan konfirmasi izin / tidak masuk riil</option>
                  <option value="Koreksi kesalahan input manual sebelumnya">Koreksi kesalahan input manual sebelumnya</option>
                  <option value="Lainnya">Alasan Lainnya...</option>
                </select>

                {deleteSessionReasonOption === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Tuliskan alasan spesifik..."
                    value={customDeleteSessionReason}
                    onChange={(e) => setCustomDeleteSessionReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 mt-1 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSessionToDelete(null);
                    setDeleteSessionError('');
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDeleteSession}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                >
                  Konfirmasi Hapus Sesi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Raw Tap Confirmation Modal Dialog */}
        {tapToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Hapus / Abaikan Tap Absensi
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tap ini akan dikeluarkan dari perhitungan aktif.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-mono text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Waktu Tap:</span>
                  <strong className="text-slate-900">{tapToDelete.timestamp}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Mesin & User:</span>
                  <strong className="text-slate-900">{tapToDelete.machine_id} (ID {tapToDelete.machine_user_id})</strong>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block font-bold text-slate-800">
                  Pilih Alasan Penghapusan / Pengabaian:
                </label>
                <select
                  value={deleteTapReason}
                  onChange={(e) => setDeleteTapReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Tap salah / ganda tak sengaja">Tap salah / ganda tak sengaja</option>
                  <option value="Karyawan salah tap mesin lain">Karyawan salah tap mesin lain</option>
                  <option value="Data uji coba / tap error mesin">Data uji coba / tap error mesin</option>
                  <option value="Karyawan tidak hadir riil (Batal)">Karyawan tidak hadir riil (Batal)</option>
                  <option value="Lainnya">Alasan Lainnya...</option>
                </select>

                {deleteTapReason === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Tuliskan alasan lengkap..."
                    value={customDeleteTapReason}
                    onChange={(e) => setCustomDeleteTapReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 mt-1 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setTapToDelete(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDeleteRawTap}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                >
                  Konfirmasi Hapus / Abaikan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">
            {isLocked ? 'Periode terkunci (Hanya lihat / Read-only)' : 'Perubahan tersimpan otomatis dan tercatat ke audit log.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
