/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Employee,
  MachineMapping,
  RawTap,
  WorkSession,
  SystemSettings,
  PeriodConfig,
  AuditLogEntry,
  UploadedFileInfo,
} from './types';
import {
  DEFAULT_SETTINGS,
  processEmployeeRecap,
  validateDateCompleteness,
} from './utils/engine';
import {
  INITIAL_EMPLOYEES,
  INITIAL_MACHINE_MAPPINGS,
  SAMPLE_PERIOD,
  generateSampleTaps,
} from './utils/sampleData';

import { Sidebar, TopBar } from './components/Header';
import { DashboardHITL } from './components/DashboardHITL';
import { UploadAndPeriod } from './components/UploadAndPeriod';
import { RekapOutput } from './components/RekapOutput';
import { MasterDataModal } from './components/MasterDataModal';
import { AuditLogView } from './components/AuditLogView';
import { SettingsModal } from './components/SettingsModal';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { Lock, Unlock, AlertTriangle, AlertOctagon, Trash2, X, Check } from 'lucide-react';

export default function App() {
  // Navigation Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'upload' | 'rekap' | 'master' | 'audit' | 'settings'
  >('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // In-Memory Core State
  const [period, setPeriod] = useState<PeriodConfig>({
    startDate: '2026-08-15',
    endDate: '2026-08-21',
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [machineMappings, setMachineMappings] = useState<MachineMapping[]>(INITIAL_MACHINE_MAPPINGS);
  const [rawTaps, setRawTaps] = useState<RawTap[]>(() => generateSampleTaps());
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  // Manual session overrides per employee (maps employee_id -> WorkSession[])
  const [manualOverrides, setManualOverrides] = useState<Record<string, WorkSession[]>>({});

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init-sample',
      timestamp: '2026-08-22 08:00:00',
      employee_id: 'ALL',
      employee_name: 'Sistem PR Sekar Anom',
      action: 'BULK_CORRECTION',
      before_value: '-',
      after_value: 'Inisialisasi Data',
      reason: 'Sistem siap memproses rekap absensi periode 15-21 Agustus 2026',
      actor: 'System Admin',
    },
  ]);

  // Selected Employee for Detailed HITL Modal
  const [selectedEmployeeIdForModal, setSelectedEmployeeIdForModal] = useState<string | null>(null);

  // In-App Dialog Modals
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [isLockConfirmModalOpen, setIsLockConfirmModalOpen] = useState(false);
  const [isClearDataConfirmModalOpen, setIsClearDataConfirmModalOpen] = useState(false);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Recalculate recaps automatically whenever any input or state changes
  const recaps = useMemo(() => {
    return employees.map((emp) =>
      processEmployeeRecap(
        emp,
        rawTaps,
        machineMappings,
        period,
        settings,
        manualOverrides[emp.employee_id]
      )
    );
  }, [employees, rawTaps, machineMappings, period, settings, manualOverrides]);

  // Date completeness validation
  const { isComplete: isDateComplete, missingDates } = useMemo(() => {
    return validateDateCompleteness(period, rawTaps);
  }, [period, rawTaps]);

  // Flag counts
  const redCount = recaps.filter((r) => r.status_color === 'red').length;
  const yellowCount = recaps.filter((r) => r.status_color === 'yellow').length;
  const greenCount = recaps.filter((r) => r.status_color === 'green').length;

  // Handler: Load Sample Data
  const handleLoadSampleData = () => {
    if (isLocked) {
      showToast('Periode sedang terkunci. Buka kunci terlebih dahulu untuk memuat data.', 'error');
      return;
    }
    setPeriod(SAMPLE_PERIOD);
    setEmployees(INITIAL_EMPLOYEES);
    setMachineMappings(INITIAL_MACHINE_MAPPINGS);
    setRawTaps(generateSampleTaps());
    setUploadedFiles([]);
    setManualOverrides({});
    setSettings(DEFAULT_SETTINGS);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: 'ALL',
      employee_name: 'Semua Karyawan',
      action: 'BULK_CORRECTION',
      before_value: '-',
      after_value: 'Data Contoh Dimuat',
      reason: 'Muat data contoh PR Sekar Anom (AMIR, EDY, HERUL, ANTON)',
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast('Data contoh PR Sekar Anom berhasil dimuat.', 'success');
  };

  // Handler: Clear All Data
  const handleConfirmClearAllData = () => {
    if (isLocked) {
      showToast('Periode terkunci. Buka kunci terlebih dahulu.', 'error');
      setIsClearDataConfirmModalOpen(false);
      return;
    }
    setEmployees([]);
    setMachineMappings([]);
    setRawTaps([]);
    setUploadedFiles([]);
    setManualOverrides({});
    setAuditLogs([]);
    setIsClearDataConfirmModalOpen(false);
    showToast('Seluruh data berhasil dibersihkan.', 'info');
  };

  // Handler: Reset Master Data to Default
  const handleResetMasterData = () => {
    if (isLocked) {
      showToast('Periode terkunci. Master data tidak dapat direset.', 'error');
      return;
    }
    setEmployees(INITIAL_EMPLOYEES);
    setMachineMappings(INITIAL_MACHINE_MAPPINGS);
    showToast('Master data karyawan dan mesin berhasil direset ke standar.', 'success');
  };

  // Handler: Lock Period (Process Final)
  const handleConfirmLockPeriod = () => {
    if (redCount > 0) {
      showToast(`Tidak dapat mengunci periode karena masih ada ${redCount} penanda merah. Selesaikan koreksi terlebih dahulu.`, 'error');
      setIsLockConfirmModalOpen(false);
      return;
    }
    if (!isDateComplete) {
      showToast(`Tidak dapat mengunci periode karena tanggal belum lengkap: ${missingDates.join(', ')}.`, 'error');
      setIsLockConfirmModalOpen(false);
      return;
    }

    setIsLocked(true);
    setIsLockConfirmModalOpen(false);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: 'ALL',
      employee_name: 'Persetujuan Final',
      action: 'LOCK_PERIOD',
      before_value: 'Draf Terbuka',
      after_value: 'Periode Terkunci (Approved)',
      reason: 'Persetujuan akhir rekapitulasi gaji mingguan',
      actor: 'Admin HR & Manajer',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast('Periode berhasil dikunci dan siap dicetak / diekspor.', 'success');
    setActiveTab('rekap');
  };

  // Handler: Unlock Period
  const handleConfirmUnlockPeriod = () => {
    if (!unlockReason.trim()) {
      setUnlockError('Alasan pembukaan kunci wajib diisi untuk log audit.');
      return;
    }

    setIsLocked(false);
    setIsUnlockModalOpen(false);
    setUnlockError('');

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: 'ALL',
      employee_name: 'Buka Kunci',
      action: 'UNLOCK_PERIOD',
      before_value: 'Periode Terkunci',
      after_value: 'Draf Terbuka',
      reason: unlockReason.trim(),
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    setUnlockReason('');
    showToast('Kunci periode berhasil dibuka. Anda dapat mengedit kembali.', 'info');
  };

  // Handler: Update Employee Sessions from Detail Modal
  const handleUpdateSessions = (
    employeeId: string,
    updatedSessions: WorkSession[],
    actionType: 'EDIT_SESSION' | 'ADD_SESSION' | 'DELETE_SESSION',
    beforeVal: string,
    afterVal: string,
    reason: string
  ) => {
    const emp = employees.find((e) => e.employee_id === employeeId);
    setManualOverrides((prev) => ({
      ...prev,
      [employeeId]: updatedSessions,
    }));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: employeeId,
      employee_name: emp?.nama || employeeId,
      action: actionType,
      before_value: beforeVal,
      after_value: afterVal,
      reason: reason,
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast('Perubahan sesi berhasil disimpan dan dihitung ulang.', 'success');
  };

  // Handler: Delete / Ignore Raw Tap
  const handleDeleteRawTap = (tapId: string, reason: string) => {
    const tap = rawTaps.find((t) => t.id === tapId);
    if (!tap) return;

    const emp = employees.find((e) => e.employee_id === tap.employee_id);
    const empName = emp?.nama || tap.machine_user_id;

    setRawTaps((prev) =>
      prev.map((t) => {
        if (t.id === tapId) {
          return {
            ...t,
            is_deduped: true,
            dedup_reason: `Dihapus/Diabaikan manual oleh HR: ${reason}`,
          };
        }
        return t;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: tap.employee_id || 'UNKNOWN',
      employee_name: empName,
      action: 'DELETE_SESSION',
      before_value: `Tap Aktif: ${tap.timestamp} (Mesin: ${tap.machine_id})`,
      after_value: `Diabaikan / Dihapus: ${reason}`,
      reason: reason,
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast('Tap berhasil dihapus/diabaikan dari kalkulasi.', 'info');
  };

  // Handler: Restore Raw Tap
  const handleRestoreRawTap = (tapId: string) => {
    const tap = rawTaps.find((t) => t.id === tapId);
    if (!tap) return;

    const emp = employees.find((e) => e.employee_id === tap.employee_id);
    const empName = emp?.nama || tap.machine_user_id;

    setRawTaps((prev) =>
      prev.map((t) => {
        if (t.id === tapId) {
          return {
            ...t,
            is_deduped: false,
            dedup_reason: undefined,
          };
        }
        return t;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: tap.employee_id || 'UNKNOWN',
      employee_name: empName,
      action: 'EDIT_SESSION',
      before_value: `Tap Terabaikan: ${tap.timestamp}`,
      after_value: 'Tap Dipulihkan Kembali Aktif',
      reason: 'Pemulihan data tap oleh HR',
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast('Tap berhasil dipulihkan kembali menjadi aktif.', 'success');
  };

  // Handler: Resolve Boundary Tap (Friday night forward / Saturday morning previous)
  const handleResolveBoundaryTap = (
    tapId: string,
    action: 'DEFER_TO_NEXT' | 'SETTLE_WITH_PREVIOUS',
    reason?: string
  ) => {
    const tap = rawTaps.find((t) => t.id === tapId);
    if (!tap) return;

    const emp = employees.find((e) => e.employee_id === tap.employee_id);
    const empName = emp?.nama || tap.machine_user_id;

    setRawTaps((prev) =>
      prev.map((t) => {
        if (t.id === tapId) {
          if (action === 'DEFER_TO_NEXT') {
            return {
              ...t,
              is_deferred_to_next: true,
              is_settled_in_previous: false,
              boundary_note: reason || 'Diteruskan ke slip periode minggu depan (Sabtu besok)',
            };
          } else {
            return {
              ...t,
              is_settled_in_previous: true,
              is_deferred_to_next: false,
              boundary_note: reason || 'Telah diselesaikan pada slip periode minggu lalu',
            };
          }
        }
        return t;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      employee_id: tap.employee_id || 'UNKNOWN',
      employee_name: empName,
      action: 'EDIT_SESSION',
      before_value: `Tap Batas Periode: ${tap.timestamp}`,
      after_value: action === 'DEFER_TO_NEXT' ? 'Bawa ke Minggu Depan (Stop di Sini)' : 'Selesai di Slip Minggu Lalu',
      reason: reason || (action === 'DEFER_TO_NEXT' ? 'Dihitung pada payroll minggu berikutnya' : 'Sudah terhitung di slip periode sebelumnya'),
      actor: 'Admin HR',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(
      action === 'DEFER_TO_NEXT'
        ? 'Tap Jumat malam ditandai untuk minggu depan (tidak memblokir approval periode ini).'
        : 'Tap Sabtu pagi ditandai sebagai penyelesaian slip minggu lalu.',
      'success'
    );
  };

  // Modal active employee recap
  const activeRecapForModal = recaps.find(
    (r) => r.employee.employee_id === selectedEmployeeIdForModal
  ) || null;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        period={period}
        isLocked={isLocked}
        redCount={redCount}
        yellowCount={yellowCount}
        greenCount={greenCount}
        onLoadSampleData={handleLoadSampleData}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden bg-slate-50">
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          period={period}
          isLocked={isLocked}
          redCount={redCount}
          yellowCount={yellowCount}
          greenCount={greenCount}
          onLoadSampleData={handleLoadSampleData}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-60 max-w-md animate-in slide-in-from-top-2 duration-200">
            <div
              className={`p-3.5 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-xs font-semibold ${
                toastMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : toastMessage.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <span>{toastMessage.text}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 w-full p-4 sm:p-5 lg:p-6 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardHITL
              recaps={recaps}
              period={period}
              settings={settings}
              onSelectEmployee={(empId) => setSelectedEmployeeIdForModal(empId)}
              isLocked={isLocked}
              onLockPeriod={() => setIsLockConfirmModalOpen(true)}
              onUnlockPeriod={() => {
                setUnlockReason('');
                setUnlockError('');
                setIsUnlockModalOpen(true);
              }}
              onLoadSampleData={handleLoadSampleData}
              isDateComplete={isDateComplete}
              missingDates={missingDates}
              onUpdateSessions={handleUpdateSessions}
              onDeleteRawTap={handleDeleteRawTap}
              onRestoreRawTap={handleRestoreRawTap}
              onResolveBoundaryTap={handleResolveBoundaryTap}
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'upload' && (
            <UploadAndPeriod
              period={period}
              setPeriod={setPeriod}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              rawTaps={rawTaps}
              setRawTaps={setRawTaps}
              employees={employees}
              setEmployees={setEmployees}
              machineMappings={machineMappings}
              setMachineMappings={setMachineMappings}
              isDateComplete={isDateComplete}
              missingDates={missingDates}
              settings={settings}
              setSettings={setSettings}
              onLoadSampleData={handleLoadSampleData}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              onClearAllData={() => setIsClearDataConfirmModalOpen(true)}
              isLocked={isLocked}
            />
          )}

          {activeTab === 'rekap' && (
            <RekapOutput
              recaps={recaps}
              period={period}
              auditLogs={auditLogs}
              isLocked={isLocked}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataModal
              employees={employees}
              setEmployees={setEmployees}
              machineMappings={machineMappings}
              setMachineMappings={setMachineMappings}
              isLocked={isLocked}
              onResetToDefault={handleResetMasterData}
            />
          )}

          {activeTab === 'audit' && <AuditLogView logs={auditLogs} />}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              setSettings={setSettings}
              isLocked={isLocked}
            />
          )}
        </main>
      </div>

      {/* Employee Detail & Manual Correction Modal (HITL) */}
      <EmployeeDetailModal
        recap={activeRecapForModal}
        isOpen={Boolean(selectedEmployeeIdForModal)}
        onClose={() => setSelectedEmployeeIdForModal(null)}
        isLocked={isLocked}
        settings={settings}
        period={period}
        onUpdateSessions={handleUpdateSessions}
        onDeleteRawTap={handleDeleteRawTap}
        onRestoreRawTap={handleRestoreRawTap}
        onResolveBoundaryTap={handleResolveBoundaryTap}
      />

      {/* In-App Modal: Lock Period Confirmation */}
      {isLockConfirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Kunci & Proses Akhir</h3>
                <p className="text-xs text-slate-500">Periode: {period.startDate} s.d. {period.endDate}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah dikunci, seluruh data rekap akan berstatus <strong>Read-Only</strong> dan siap dicetak sebagai slip gaji karyawan atau diekspor ke Excel.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Karyawan:</span>
                <span className="font-bold text-slate-900">{recaps.length} Orang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Anomali:</span>
                <span className="font-bold text-emerald-600">0 Merah (Bersih)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLockConfirmModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLockPeriod}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                Kunci & Setujui Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Modal: Unlock Period Dialog */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Buka Kunci Periode</h3>
                <p className="text-xs text-slate-500">Koreksi ulang data absensi</p>
              </div>
            </div>

            {unlockError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                {unlockError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Alasan Pembukaan Kunci <span className="text-rose-600">* (Wajib diisi)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Koreksi jam lembur karyawan EDY setelah konfirmasi mandor..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  setUnlockReason('');
                  setUnlockError('');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmUnlockPeriod}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition"
              >
                Buka Kunci & Simpan Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Modal: Clear All Data Confirmation */}
      {isClearDataConfirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Seluruh Data?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengosongkan seluruh database aktif</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Semua data karyawan, tap absensi, file yang diunggah, dan log audit akan dihapus. Anda dapat memuat data baru dari file mesin atau menekan tombol 'Muat Data Contoh'.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsClearDataConfirmModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClearAllData}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Bersihkan Semua Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
