import React, { useState } from 'react';
import { Settings as SettingsIcon, RotateCcw, Save, Info, Sliders, CheckCircle2 } from 'lucide-react';
import { SystemSettings } from '../types';
import { DEFAULT_SETTINGS } from '../utils/engine';

interface SettingsModalProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  isLocked: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  setSettings,
  isLocked,
}) => {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleChange = (field: keyof SystemSettings, val: number) => {
    if (isLocked) return;
    setSettings((prev) => ({
      ...prev,
      [field]: val,
    }));
    setSuccessNotice(true);
    setTimeout(() => setSuccessNotice(false), 2000);
  };

  const handleReset = () => {
    if (isLocked) return;
    setSettings(DEFAULT_SETTINGS);
    setIsResetConfirmOpen(false);
    setSuccessNotice(true);
    setTimeout(() => setSuccessNotice(false), 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-5xl pb-16 text-slate-900">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Pengaturan Parameter Perhitungan & Validasi
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Konfigurasi jendela dedup tap ganda, batas durasi sesi, standar jam kerja harian, dan ambang lembur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {successNotice && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan Otomatis
            </span>
          )}

          {!isLocked && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Reset ke Standar</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Form Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* Section 1: Dedup Window */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                1. Jendela Dedup Tap Ganda (DEDUP_WINDOW)
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Menyaring tap ganda yang berjarak kurang dari interval ini dari tap valid sebelumnya. Yang diambil adalah tap pertama.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="1"
                max="60"
                value={settings.dedup_window_minutes}
                onChange={(e) => handleChange('dedup_window_minutes', Number(e.target.value))}
                disabled={isLocked}
                className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-xs font-semibold text-slate-700">Menit</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 block">Nilai Standar: 5 Menit</span>
        </div>

        {/* Section 2: Session Min & Max Duration */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              2. Batas Validasi Durasi Sesi & Reset Fase (SESSION_MIN & SESSION_MAX)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Jika durasi di luar rentang ini, sesi dianggap anomali dan sistem mereset fase agar tap yang hilang tidak merusak pasangan sesi berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-xs text-slate-900">
                  SESSION_MIN (Durasi Minimum)
                </span>
                <span className="text-[11px] text-slate-500">Standar: 1.0 Jam (60 mnt)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={settings.session_min_hours}
                  onChange={(e) => handleChange('session_min_hours', Number(e.target.value))}
                  disabled={isLocked}
                  className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-700">Jam</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-xs text-slate-900">
                  SESSION_MAX (Durasi Maksimum)
                </span>
                <span className="text-[11px] text-slate-500">Standar: 24.0 Jam</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="8"
                  max="24"
                  value={settings.session_max_hours}
                  onChange={(e) => handleChange('session_max_hours', Number(e.target.value))}
                  disabled={isLocked}
                  className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-700">Jam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Standard Hours & Overtime Threshold */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              3. Standar Jam Kerja & Ambang Lembur (STANDARD_HOURS & OVERTIME_THRESHOLD)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Rumus: <code>H = MIN(jam_kerja / STANDARD_HOURS, 1.00)</code> dan{' '}
              <code>L = MAX(0, jam_kerja - OVERTIME_THRESHOLD)</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-xs text-slate-900">
                  STANDARD_HOURS (Standar 1 Hari)
                </span>
                <span className="text-[11px] text-slate-500">Standar PR Sekar Anom: 12.0 Jam</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="4"
                  max="24"
                  value={settings.standard_hours}
                  onChange={(e) => handleChange('standard_hours', Number(e.target.value))}
                  disabled={isLocked}
                  className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-700">Jam</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-xs text-slate-900">
                  OVERTIME_THRESHOLD (Ambang Lembur)
                </span>
                <span className="text-[11px] text-slate-500">Standar: 12.0 Jam</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="4"
                  max="24"
                  value={settings.overtime_threshold_hours}
                  onChange={(e) => handleChange('overtime_threshold_hours', Number(e.target.value))}
                  disabled={isLocked}
                  className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-700">Jam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Variance Threshold */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                4. Ambang Variansi Penanda Kuning Y01 (VARIANCE_THRESHOLD)
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Memicu penanda kuning jika total honor karyawan berbeda melebihi persentase ini dibanding riwayat rata-rata.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="5"
                max="100"
                value={settings.variance_threshold_percent}
                onChange={(e) => handleChange('variance_threshold_percent', Number(e.target.value))}
                disabled={isLocked}
                className="w-20 bg-white border border-slate-300 text-sm font-bold text-slate-900 rounded-lg px-2.5 py-1.5 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-xs font-semibold text-slate-700">%</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 block">Nilai Standar: 30%</span>
        </div>
      </div>

      {/* In-App Confirmation Modal: Reset Settings */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kembalikan Pengaturan Standar?</h3>
                <p className="text-xs text-slate-500">Dedup 5 mnt, Standar 12 jam, Ambang lembur 12 jam</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin mengembalikan seluruh parameter perhitungan ke konfigurasi standar pabrik?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                Ya, Reset Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
