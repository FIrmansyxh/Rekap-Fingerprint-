import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Info,
  Layers,
  Clock,
  ArrowRight,
  ClipboardPaste,
  Users,
  Check,
  ShieldCheck,
  AlertCircle,
  X,
  Moon,
  ArrowRightLeft,
  HelpCircle,
} from 'lucide-react';
import { PeriodConfig, UploadedFileInfo, RawTap, Employee, MachineMapping, SystemSettings } from '../types';
import { getPeriodDates, getIndonesianDayName, formatDate, dedupTaps } from '../utils/engine';
import { parseFingerprintFile, parseFingerprintText, extractAvailablePeriods } from '../utils/parser';

interface UploadAndPeriodProps {
  period: PeriodConfig;
  setPeriod: (p: PeriodConfig) => void;
  uploadedFiles: UploadedFileInfo[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFileInfo[]>>;
  rawTaps: RawTap[];
  setRawTaps: React.Dispatch<React.SetStateAction<RawTap[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  machineMappings: MachineMapping[];
  setMachineMappings: React.Dispatch<React.SetStateAction<MachineMapping[]>>;
  isDateComplete: boolean;
  missingDates: string[];
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  onLoadSampleData: () => void;
  onNavigateToDashboard: () => void;
  onClearAllData: () => void;
  isLocked: boolean;
}

export const UploadAndPeriod: React.FC<UploadAndPeriodProps> = ({
  period,
  setPeriod,
  uploadedFiles,
  setUploadedFiles,
  rawTaps,
  setRawTaps,
  employees,
  setEmployees,
  machineMappings,
  setMachineMappings,
  isDateComplete,
  missingDates,
  settings,
  setSettings,
  onLoadSampleData,
  onNavigateToDashboard,
  onClearAllData,
  isLocked,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedMachineFallback, setSelectedMachineFallback] = useState('FINGER1');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pasteFileName, setPasteFileName] = useState('ekspor_fingerprint.csv');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastImportStats, setLastImportStats] = useState<{
    newEmployees: number;
    newTaps: number;
    dates: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const periodDates = getPeriodDates(period.startDate);

  // Compute all unique dates in the uploaded rawTaps
  const allUniqueDates: string[] = Array.from(new Set<string>(rawTaps.map((t) => formatDate(new Date(t.timestamp))))).sort();
  const availablePeriods = extractAvailablePeriods(allUniqueDates);

  // Compute auto-cleaned redundant taps statistics across all raw taps
  const cleanedTapsStats = useMemo(() => {
    if (rawTaps.length === 0) return { totalRaw: 0, cleaned: 0, valid: 0, ratePercent: 0 };
    const windowMinutes = settings?.dedup_window_minutes || 15;
    const dedupedList = dedupTaps(rawTaps, windowMinutes);
    const cleaned = dedupedList.filter((t) => t.is_deduped).length;
    const valid = dedupedList.length - cleaned;
    const ratePercent = dedupedList.length > 0 ? Math.round((cleaned / dedupedList.length) * 100) : 0;
    return {
      totalRaw: dedupedList.length,
      cleaned,
      valid,
      ratePercent,
    };
  }, [rawTaps, settings?.dedup_window_minutes]);

  // Handle Saturday picker change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const newStart = e.target.value;
    if (!newStart) return;

    const startDateObj = new Date(newStart + 'T00:00:00');
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + 6);

    setPeriod({
      startDate: newStart,
      endDate: formatDate(endDateObj),
    });
  };

  const syncEmployeesAndMappings = (
    newExtractedEmployees: Employee[],
    newExtractedMappings: MachineMapping[]
  ) => {
    let addedEmpCount = 0;
    setEmployees((prev) => {
      const existingIds = new Set(prev.map((e) => e.employee_id));
      const existingNames = new Set(prev.map((e) => e.nama.toLowerCase()));
      const toAdd: Employee[] = [];

      newExtractedEmployees.forEach((emp) => {
        if (!existingIds.has(emp.employee_id) && !existingNames.has(emp.nama.toLowerCase())) {
          toAdd.push(emp);
          addedEmpCount++;
        }
      });

      return [...prev, ...toAdd];
    });

    setMachineMappings((prev) => {
      const existingKeys = new Set(prev.map((m) => `${m.machine_id}-${m.machine_user_id}`));
      const toAdd: MachineMapping[] = [];

      newExtractedMappings.forEach((mapping) => {
        const key = `${mapping.machine_id}-${mapping.machine_user_id}`;
        if (!existingKeys.has(key)) {
          toAdd.push(mapping);
        }
      });

      return [...prev, ...toAdd];
    });

    return addedEmpCount;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isLocked) return;

    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      const newFileInfoList: UploadedFileInfo[] = [];
      const newTaps: RawTap[] = [];
      const allExtractedEmployees: Employee[] = [];
      const allExtractedMappings: MachineMapping[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let mFallback = selectedMachineFallback;
        if (file.name.toLowerCase().includes('pos') || file.name.toLowerCase().includes('security') || file.name.toLowerCase().includes('finger1')) {
          mFallback = 'FINGER1';
        } else if (file.name.toLowerCase().includes('admin') || file.name.toLowerCase().includes('pabrik') || file.name.toLowerCase().includes('finger2')) {
          mFallback = 'FINGER2';
        } else if (file.name.toLowerCase().includes('kantor') || file.name.toLowerCase().includes('finger3')) {
          mFallback = 'FINGER3';
        }

        const parseResult = await parseFingerprintFile(file, mFallback);
        newFileInfoList.push(parseResult.fileInfo);
        newTaps.push(...parseResult.rawTaps);
        allExtractedEmployees.push(...parseResult.extractedEmployees);
        allExtractedMappings.push(...parseResult.extractedMappings);
      }

      const addedEmpCount = syncEmployeesAndMappings(allExtractedEmployees, allExtractedMappings);

      setUploadedFiles((prev) => [...prev, ...newFileInfoList]);
      setRawTaps((prev) => [...prev, ...newTaps]);

      // Adjust period if available
      const datesFound = Array.from(new Set(newTaps.map((t) => formatDate(new Date(t.timestamp))))).sort();
      if (datesFound.length > 0) {
        const detectedWeeks = extractAvailablePeriods(datesFound);
        if (detectedWeeks.length > 0) {
          const currentTapsInPeriod = newTaps.filter((t) => {
            const d = formatDate(new Date(t.timestamp));
            return d >= period.startDate && d <= period.endDate;
          }).length;

          if (currentTapsInPeriod === 0) {
            setPeriod({
              startDate: detectedWeeks[0].startDate,
              endDate: detectedWeeks[0].endDate,
            });
          }
        }
      }

      setLastImportStats({
        newEmployees: addedEmpCount,
        newTaps: newTaps.length,
        dates: datesFound,
      });
    } catch (err) {
      console.error('Error parsing files:', err);
      setErrorMessage('Gagal memproses file. Pastikan format file adalah XLSX atau CSV fingerprint yang valid.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim() || isLocked) return;

    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      const parseResult = parseFingerprintText(pastedText, pasteFileName || 'data_paste.csv', selectedMachineFallback);
      
      const addedEmpCount = syncEmployeesAndMappings(
        parseResult.extractedEmployees,
        parseResult.extractedMappings
      );

      setUploadedFiles((prev) => [...prev, parseResult.fileInfo]);
      setRawTaps((prev) => [...prev, ...parseResult.rawTaps]);

      const datesFound = parseResult.fileInfo.datesCovered;
      if (datesFound.length > 0) {
        const detectedWeeks = extractAvailablePeriods(datesFound);
        if (detectedWeeks.length > 0) {
          const currentTapsInPeriod = parseResult.rawTaps.filter((t) => {
            const d = formatDate(new Date(t.timestamp));
            return d >= period.startDate && d <= period.endDate;
          }).length;

          if (currentTapsInPeriod === 0) {
            setPeriod({
              startDate: detectedWeeks[0].startDate,
              endDate: detectedWeeks[0].endDate,
            });
          }
        }
      }

      setLastImportStats({
        newEmployees: addedEmpCount,
        newTaps: parseResult.rawTaps.length,
        dates: datesFound,
      });

      setShowPasteModal(false);
      setPastedText('');
    } catch (err) {
      console.error('Error parsing pasted text:', err);
      setErrorMessage('Gagal memproses teks CSV. Pastikan struktur CSV sesuai format.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const isSaturday = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDay() === 6;
  };

  // Count taps per date in active period
  const tapsPerDate: Record<string, number> = {};
  periodDates.forEach((d) => {
    tapsPerDate[d] = 0;
  });
  rawTaps.forEach((tap) => {
    const dStr = formatDate(new Date(tap.timestamp));
    if (tapsPerDate[dStr] !== undefined) {
      tapsPerDate[dStr] += 1;
    }
  });

  return (
    <div className="space-y-4 w-full pb-16 text-slate-900">
      
      {/* Top Banner with Action Controls - Clean Pure White Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Unggah File Mesin Fingerprint
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Impor Fingerprint & Penetapan Periode Gaji
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Siklus penggajian PR Sekar Anom: <strong>Sabtu s.d. Jumat</strong>. Karyawan dan log absensi otomatis disinkronisasi ke Master.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowPasteModal(true)}
            disabled={isLocked}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
            <span>Tempel Teks CSV</span>
          </button>

          {rawTaps.length > 0 && (
            <button
              onClick={onClearAllData}
              disabled={isLocked}
              className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-3 py-2 rounded-xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-rose-900 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-rose-950">Terjadi Kesalahan</p>
              <p className="text-rose-800 text-[11px] mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-950 text-xs font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification after import */}
      {lastImportStats && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-emerald-950">Data Fingerprint Berhasil Dimuat!</p>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Terbaca <strong>{lastImportStats.newTaps} tap kehadiran</strong> dan <strong>{lastImportStats.dates.length} tanggal</strong>. 
                {lastImportStats.newEmployees > 0 && ` Ditambahkan ${lastImportStats.newEmployees} karyawan baru ke Master.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastImportStats(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Smart Shift Malam & Lintas Periode Guide Banner */}
      <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4.5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Moon className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Panduan Cerdas: Shift Malam Lintas Periode (Jumat Malam ⇄ Sabtu Pagi)</span>
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                Siklus Mingguan Sabtu–Jumat
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Siklus kerja pabrik berjalan <strong>Sabtu s.d. Jumat</strong>. Karyawan yang masuk shift malam di <strong>Jumat sore/malam (pukul 16:00 s.d. 24:00)</strong> biasanya baru check-out di <strong>Sabtu pagi</strong> (awal periode minggu berikutnya). Begitu pula tap tunggal di <strong>Sabtu pagi</strong> bisa jadi merupakan kepulangan dari shift Jumat malam minggu lalu.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-1 shadow-2xs">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>Jumat Malam (Pukul 16:00 – 24:00)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Jika tap keluarnya ada di hari Sabtu besok (periode minggu depan), Anda dapat mengunggah file minggu depan untuk sinkronisasi otomatis, atau di dashboard klik <strong>"Bawa ke Minggu Depan (Stop di Sini)"</strong> agar tidak memblokir penutupan periode saat ini.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-1 shadow-2xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sabtu Pagi (Pukul 00:00 – 10:00)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Merupakan tap kepulangan shift Jumat minggu lalu. Anda dapat <strong>mengunggah file minggu lalu</strong> untuk pencocokan otomatis, atau di dashboard klik <strong>"Sudah Masuk Slip Minggu Lalu"</strong> jika sudah beres di slip sebelumnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Period Picker & Available Weeks */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Period Selector Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Periode Kerja (Sabtu s.d. Jumat)
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tanggal Mulai (Hari Sabtu)
                </label>
                <input
                  id="input-period-start"
                  type="date"
                  value={period.startDate}
                  onChange={handleStartDateChange}
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {!isSaturday(period.startDate) && (
                  <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Peringatan: Bukan hari Sabtu (Standar: Sabtu s.d. Jumat).
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Mulai:</span>
                  <span className="font-bold text-slate-900">
                    {getIndonesianDayName(period.startDate)}, {period.startDate}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Selesai:</span>
                  <span className="font-bold text-slate-900">
                    {getIndonesianDayName(period.endDate)}, {period.endDate}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200">
                  <span>Hari Bayar:</span>
                  <span className="font-bold text-blue-700">
                    Sabtu Berikutnya
                  </span>
                </div>
              </div>

              {/* Detected Payroll Weeks from Uploaded Data */}
              {availablePeriods.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Pilihan Periode dari Data ({availablePeriods.length})
                  </label>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {availablePeriods.map((p) => {
                      const isCurrent = p.startDate === period.startDate && p.endDate === period.endDate;
                      return (
                        <button
                          key={p.startDate}
                          onClick={() => !isLocked && setPeriod({ startDate: p.startDate, endDate: p.endDate })}
                          disabled={isLocked}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border transition ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[11px]">{p.label}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Completeness Status Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Kelengkapan 7 Hari Periode
              </h4>
              {isDateComplete && rawTaps.length > 0 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                  Lengkap 7/7
                </span>
              ) : (
                <span className="text-[10px] bg-rose-50 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-300">
                  {rawTaps.length === 0 ? 'Belum Ada Data' : `${7 - missingDates.length}/7 Hari`}
                </span>
              )}
            </div>

            {/* List of 7 days */}
            <div className="space-y-1 text-xs">
              {periodDates.map((dateStr) => {
                const dayName = getIndonesianDayName(dateStr);
                const count = tapsPerDate[dateStr] || 0;
                const hasData = count > 0;

                return (
                  <div
                    key={dateStr}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
                      hasData
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-rose-50/60 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {hasData ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{dayName}, {dateStr.substring(5)}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-700">
                      {count} tap
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Auto-Clean / Jitter Debounce Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Pembersihan Tap Ganda
              </h4>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                Dedup Aktif
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-tight">
              Otomatis membersihkan tap berulang dalam rentang waktu dekat (jitter). Tap pertama dipertahankan.
            </p>

            {/* Quick Interval Selection */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Jendela Filter:</span>
                <span className="font-mono font-bold text-blue-700">{settings.dedup_window_minutes} Menit</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setSettings?.((prev) => ({ ...prev, dedup_window_minutes: mins }))}
                    className={`text-[11px] py-1 px-1 rounded-md font-semibold border transition text-center ${
                      settings.dedup_window_minutes === mins
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mins} Mnt
                  </button>
                ))}
              </div>
            </div>

            {/* Cleaning Statistics */}
            {rawTaps.length > 0 && (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Total</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{cleanedTapsStats.totalRaw}</span>
                </div>
                <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                  <span className="text-[9px] text-rose-600 block">Jitter</span>
                  <span className="font-mono font-bold text-rose-700 text-xs">
                    {cleanedTapsStats.cleaned}
                  </span>
                </div>
                <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                  <span className="text-[9px] text-emerald-700 block">Valid</span>
                  <span className="font-mono font-bold text-emerald-800 text-xs">{cleanedTapsStats.valid}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upload Box & Uploaded Files Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload Dropzone */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Unggah File Ekspor Fingerprint (.csv / .xlsx)
                </h3>
                <p className="text-[11px] text-slate-600">
                  Mendukung format 'Daftar Catatan' dan 'Lap. Detail Absensi' (waktu dipisahkan tanda |) serta format kolom log.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] text-slate-700 font-semibold">Label Mesin:</label>
                <select
                  value={selectedMachineFallback}
                  onChange={(e) => setSelectedMachineFallback(e.target.value)}
                  disabled={isLocked}
                  className="bg-white border border-slate-300 text-xs font-semibold rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FINGER1">FINGER1 (Pos Security)</option>
                  <option value="FINGER2">FINGER2 (Pabrik / Admin)</option>
                  <option value="FINGER3">FINGER3 (Gedung Lain)</option>
                </select>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => !isLocked && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={isLocked}
              />
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isProcessingFile
                    ? 'Sedang Memproses & Mengekstrak Data...'
                    : 'Tarik & Letakkan File CSV/XLSX di Sini, atau Klik untuk Memilih'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Bisa memilih beberapa file mesin sekaligus (FINGER1, FINGER2, dst.)
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Files List & Stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Riwayat File Dimuat ({uploadedFiles.length})
                </h4>
              </div>
              {uploadedFiles.length > 0 && !isLocked && (
                <button
                  id="btn-clear-files"
                  onClick={onClearAllData}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus Semua Data
                </button>
              )}
            </div>

            {uploadedFiles.length === 0 && rawTaps.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs space-y-2">
                <FileSpreadsheet className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-700 text-xs">Belum Ada File Absensi yang Diunggah</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Silakan unggah file CSV/XLSX atau gunakan tombol di bawah.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tempel Teks CSV</span>
                  </button>
                  <button
                    onClick={onLoadSampleData}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs border border-blue-200 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Muat Data Contoh</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 gap-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{f.fileName}</span>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-mono font-medium">
                            {f.formatDetected}
                          </span>
                          <span>• {(f.fileSize / 1024).toFixed(1)} KB</span>
                          <span>• {f.totalRowsParsed} tap</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:self-center">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {f.datesCovered.length} tgl terdeteksi
                      </span>
                    </div>
                  </div>
                ))}

                {/* Summary badge */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Database: <strong>{employees.length} Karyawan</strong></span>
                  </div>
                  <span className="font-mono text-blue-700 font-bold text-xs">
                    {rawTaps.length} Total Tap
                  </span>
                </div>
              </div>
            )}

            {/* Continue to Dashboard Button */}
            {rawTaps.length > 0 && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  id="btn-goto-dashboard"
                  onClick={onNavigateToDashboard}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition active:scale-[0.98]"
                >
                  <span>Buka Dashboard Tinjauan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paste CSV Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Tempel Teks Ekspor CSV Fingerprint</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Label File / Sumber:
                </label>
                <input
                  type="text"
                  value={pasteFileName}
                  onChange={(e) => setPasteFileName(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ekspor_mesin_pos1.csv"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tempelkan Isi Teks CSV di Bawah:
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full font-mono text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Daftar Catatan,,,,,,,,,,,,
Waktu Cetak:2026/08/26 08:58:31,,,,
Tanggal:2026/08/01-2026/08/31,,,,
No,Nama,Dept.,1,2,3,4,5...
2,HERUL,Admin. Dept.,08:02 | 16:04,08:05 | 16:18,...`}
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleProcessPastedText}
                disabled={!pastedText.trim() || isProcessingFile}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isProcessingFile ? 'Memproses...' : 'Proses & Muat Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
