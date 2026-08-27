import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileCheck,
  Receipt,
  Search,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { EmployeeRecap, PeriodConfig, AuditLogEntry } from '../types';
import {
  getPeriodDates,
  getIndonesianDayName,
  formatRupiah,
  formatDecimal,
} from '../utils/engine';
import {
  generateRecapWorkbook,
  downloadWorkbookAsXLSX,
  downloadRecapAsCSV,
} from '../utils/export';

interface RekapOutputProps {
  recaps: EmployeeRecap[];
  period: PeriodConfig;
  auditLogs: AuditLogEntry[];
  isLocked: boolean;
}

export const RekapOutput: React.FC<RekapOutputProps> = ({
  recaps,
  period,
  auditLogs,
  isLocked,
}) => {
  const [outputTab, setOutputTab] = useState<'rekap_table' | 'session_details' | 'salary_slip'>('rekap_table');
  const [selectedSlipEmployeeId, setSelectedSlipEmployeeId] = useState<string>(
    recaps[0]?.employee.employee_id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  const periodDates = getPeriodDates(period.startDate);

  // Download XLSX
  const handleDownloadXLSX = () => {
    const wb = generateRecapWorkbook(recaps, period, auditLogs);
    downloadWorkbookAsXLSX(wb, `Rekap_Gaji_PR_Sekar_Anom_${period.startDate}_sd_${period.endDate}`);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    downloadRecapAsCSV(recaps, period, `Rekap_Gaji_PR_Sekar_Anom_${period.startDate}_sd_${period.endDate}`);
  };

  // Print Salary Slip
  const handlePrint = () => {
    window.print();
  };

  // Filtered recaps for table
  const filteredRecaps = recaps.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employee.nama.toLowerCase().includes(q) ||
      r.employee.bagian.toLowerCase().includes(q) ||
      r.employee.employee_id.toLowerCase().includes(q)
    );
  });

  // Calculate Grand Totals
  const grandTotalH = recaps.reduce((acc, r) => acc + (Math.round(r.total_H * 100) / 100), 0);
  const grandTotalL = recaps.reduce((acc, r) => acc + (Math.round(r.total_L * 100) / 100), 0);
  const grandTotalHonor = recaps.reduce((acc, r) => acc + r.total_honor, 0);

  // Selected Employee for Slip Gaji
  const activeSlipRecap = recaps.find((r) => r.employee.employee_id === selectedSlipEmployeeId) || recaps[0];

  return (
    <div className="space-y-6 w-full pb-16 text-slate-900">
      
      {/* Top Banner with Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Rekapitulasi Gaji Karyawan Harian Final
            </h2>
            {isLocked ? (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Periode Terkunci
              </span>
            ) : (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pratinjau Draf
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Format sesuai daftar hadir fisik PR Sekar Anom (Sabtu s.d. Jumat) dengan total H, L, dan honor mingguan.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-download-xlsx"
            onClick={handleDownloadXLSX}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Excel (.xlsx)</span>
          </button>
          <button
            id="btn-download-csv"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setOutputTab('rekap_table')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            outputTab === 'rekap_table'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Tabel Rekapitulasi Format Fisik</span>
        </button>

        <button
          onClick={() => setOutputTab('session_details')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            outputTab === 'session_details'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rincian Sesi & Riwayat Koreksi</span>
        </button>

        <button
          onClick={() => setOutputTab('salary_slip')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            outputTab === 'salary_slip'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Slip Gaji Karyawan (Cetak)</span>
        </button>
      </div>

      {/* VIEW 1: REKAP TABLE (Exact PR Sekar Anom Manual Format) */}
      {outputTab === 'rekap_table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Saring karyawan pada rekap..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-slate-600">
              Periode: <strong className="text-slate-900">{period.startDate}</strong> s.d. <strong className="text-slate-900">{period.endDate}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              {/* Complex 2-tier Header */}
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-300 text-[11px] font-semibold">
                <tr>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-center w-10">
                    NO
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300">
                    JABATAN / BAGIAN
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 min-w-[140px]">
                    NAMA KARYAWAN
                  </th>

                  {/* 7 Days: Sabtu to Jumat */}
                  {periodDates.map((dateStr) => {
                    const day = getIndonesianDayName(dateStr);
                    return (
                      <th
                        key={dateStr}
                        colSpan={2}
                        className="py-1.5 px-2 text-center border-r border-slate-300 bg-slate-100 font-bold text-slate-900"
                      >
                        {day.toUpperCase()}
                        <span className="block text-[9px] font-normal text-slate-500">
                          {dateStr.substring(5)}
                        </span>
                      </th>
                    );
                  })}

                  {/* Total Columns */}
                  <th colSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-blue-50 font-bold text-blue-900">
                    JUMLAH MASUK
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-right">
                    UPAH HARIAN (Rp)
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-right">
                    UPAH LEMBUR (Rp)
                  </th>
                  <th rowSpan={2} className="py-2.5 px-4 text-right bg-blue-50 text-blue-950 font-bold">
                    JUMLAH HONOR (Rp)
                  </th>
                </tr>

                {/* Sub-headers for H & L */}
                <tr className="border-t border-slate-300 text-[10px] text-center font-mono">
                  {periodDates.map((d) => (
                    <React.Fragment key={d}>
                      <th className="py-1 px-1.5 border-r border-slate-200 text-slate-700">
                        H
                      </th>
                      <th className="py-1 px-1.5 border-r border-slate-300 text-amber-700">
                        L
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="py-1 px-1.5 border-r border-slate-300 text-blue-900 font-bold">
                    Harian
                  </th>
                  <th className="py-1 px-1.5 border-r border-slate-300 text-amber-800 font-bold">
                    Lembur
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredRecaps.length === 0 ? (
                  <tr>
                    <td colSpan={22} className="py-8 text-center text-slate-400">
                      Tidak ada data rekap.
                    </td>
                  </tr>
                ) : (
                  filteredRecaps.map((r, idx) => {
                    const roundedH = Math.round(r.total_H * 100) / 100;
                    const roundedL = Math.round(r.total_L * 100) / 100;

                    return (
                      <tr key={r.employee.employee_id} className="hover:bg-slate-50 transition">
                        {/* No */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Jabatan / Bagian */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
                          {r.employee.bagian}
                        </td>

                        {/* Nama */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                          {r.employee.nama}
                        </td>

                        {/* 7 Daily H & L Values */}
                        {periodDates.map((dateStr) => {
                          const dayData = r.daily_breakdown[dateStr];
                          const hVal = dayData ? dayData.H : 0;
                          const lVal = dayData ? dayData.L : 0;

                          return (
                            <React.Fragment key={dateStr}>
                              <td className="py-2 px-1.5 text-center font-mono border-r border-slate-100">
                                {hVal > 0 ? (
                                  <span className="font-semibold text-slate-900">
                                    {formatDecimal(hVal)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 bg-amber-50/20">
                                {lVal > 0 ? (
                                  <span className="font-semibold text-amber-700">
                                    {formatDecimal(lVal)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Total H & L */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700 border-r border-slate-200 bg-blue-50/40">
                          {formatDecimal(roundedH)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-700 border-r border-slate-200 bg-amber-50/40">
                          {formatDecimal(roundedL)}
                        </td>

                        {/* Upah Harian */}
                        <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200 text-slate-700">
                          {formatRupiah(r.employee.upah_harian)}
                        </td>

                        {/* Upah Lembur */}
                        <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200 text-slate-700">
                          {formatRupiah(r.employee.upah_lembur_per_jam)}
                        </td>

                        {/* Total Honor */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-sm text-blue-700 bg-blue-50/60 whitespace-nowrap">
                          {formatRupiah(r.total_honor)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Summary Footer */}
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 border-r border-slate-300 text-center uppercase tracking-wider text-xs">
                    TOTAL KESELURUHAN ({recaps.length} Karyawan)
                  </td>
                  {/* Empty cells for 7 days */}
                  {periodDates.map((d) => (
                    <React.Fragment key={d}>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-300"></td>
                    </React.Fragment>
                  ))}
                  <td className="py-3 px-2 text-center font-mono text-blue-700 border-r border-slate-300 text-sm">
                    {formatDecimal(grandTotalH)}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-amber-700 border-r border-slate-300 text-sm">
                    {formatDecimal(grandTotalL)}
                  </td>
                  <td className="border-r border-slate-300"></td>
                  <td className="border-r border-slate-300"></td>
                  <td className="py-3 px-4 text-right font-mono text-base text-blue-700 bg-blue-100/50">
                    {formatRupiah(grandTotalHonor)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SESSION DETAILS & CORRECTIONS SHEET */}
      {outputTab === 'session_details' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Rincian Seluruh Sesi Kerja & Catatan Koreksi HR
            </h3>
            <span className="text-xs text-slate-600">
              Total {recaps.reduce((acc, r) => acc + r.sessions.length, 0)} Sesi Kerja Terhitung
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Karyawan</th>
                  <th className="py-2.5 px-3">Bagian</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Jam Keluar</th>
                  <th className="py-2.5 px-3">Durasi</th>
                  <th className="py-2.5 px-3 text-center">H (Hari)</th>
                  <th className="py-2.5 px-3 text-center">L (Lembur)</th>
                  <th className="py-2.5 px-3">Sumber & Koreksi</th>
                  <th className="py-2.5 px-3">Alasan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {recaps.flatMap((r) =>
                  r.sessions.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50 transition ${
                        s.is_manually_edited ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold">{r.employee.nama}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.employee.bagian}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {s.date_str}{' '}
                        <span className="text-[10px] text-slate-500">
                          ({getIndonesianDayName(s.date_str)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{s.check_in}</td>
                      <td className="py-2.5 px-3 font-mono">{s.check_out}</td>
                      <td className="py-2.5 px-3 font-mono">{s.duration_hours.toFixed(2)} jam</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                        {formatDecimal(s.H)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                        {formatDecimal(s.L)}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.is_manually_edited ? (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                            KOREKSI MANUAL
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Otomatis Fingerprint</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 italic">
                        {s.manual_edit_reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: SALARY SLIP (SLIP GAJI KARYAWAN) */}
      {outputTab === 'salary_slip' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Selector List */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">
              Pilih Karyawan ({recaps.length})
            </h3>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {recaps.map((r) => (
                <button
                  key={r.employee.employee_id}
                  onClick={() => setSelectedSlipEmployeeId(r.employee.employee_id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between text-xs ${
                    r.employee.employee_id === activeSlipRecap?.employee.employee_id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <span className="block font-bold">{r.employee.nama}</span>
                    <span className="text-[11px] font-normal text-slate-500">{r.employee.bagian}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">{formatRupiah(r.total_honor)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Printable Salary Slip Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Slip Gaji</span>
              </button>
            </div>

            {activeSlipRecap && (
              <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-md space-y-6 print:m-0 print:border-none print:shadow-none font-sans">
                {/* Company Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">PR SEKAR ANOM</h1>
                    <p className="text-xs text-slate-600">Industri Rokok & Tembakau</p>
                    <p className="text-xs text-slate-500">Bukti Pembayaran Gaji Karyawan Harian</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 rounded">
                      SLIP GAJI MINGGUAN
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Periode: <strong>{period.startDate}</strong> s.d. <strong>{period.endDate}</strong>
                    </p>
                  </div>
                </div>

                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Nama Karyawan:</span>
                    <span className="font-bold text-base text-slate-900">{activeSlipRecap.employee.nama}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ID Karyawan:</span>
                    <span className="font-mono font-semibold text-slate-900">{activeSlipRecap.employee.employee_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bagian / Jabatan:</span>
                    <span className="font-semibold text-slate-900">
                      {activeSlipRecap.employee.bagian} {activeSlipRecap.employee.jabatan ? `(${activeSlipRecap.employee.jabatan})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tanggal Pembayaran:</span>
                    <span className="font-semibold text-slate-900">Sabtu, {period.endDate}</span>
                  </div>
                </div>

                {/* Calculation Breakdown Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-semibold border-b border-slate-200 text-slate-800">
                      <tr>
                        <th className="p-3">Komponen Gaji</th>
                        <th className="p-3 text-center">Jumlah / Waktu</th>
                        <th className="p-3 text-right">Tarif Satuan</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-900">Hari Kerja Standar (H)</td>
                        <td className="p-3 text-center font-bold">{formatDecimal(activeSlipRecap.total_H)} Hari</td>
                        <td className="p-3 text-right">{formatRupiah(activeSlipRecap.employee.upah_harian)}</td>
                        <td className="p-3 text-right font-bold">
                          {formatRupiah(
                            (Math.round(activeSlipRecap.total_H * 100) / 100) * activeSlipRecap.employee.upah_harian
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-900">Lembur Kerja (L)</td>
                        <td className="p-3 text-center font-bold">{formatDecimal(activeSlipRecap.total_L)} Jam</td>
                        <td className="p-3 text-right">{formatRupiah(activeSlipRecap.employee.upah_lembur_per_jam)}</td>
                        <td className="p-3 text-right font-bold">
                          {formatRupiah(
                            (Math.round(activeSlipRecap.total_L * 100) / 100) * activeSlipRecap.employee.upah_lembur_per_jam
                          )}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="p-3 font-sans text-sm uppercase text-slate-900">
                          Total Diterima (Take Home Pay)
                        </td>
                        <td className="p-3 text-right font-mono text-base text-blue-700">
                          {formatRupiah(activeSlipRecap.total_honor)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 pt-8 text-xs text-center text-slate-900">
                  <div>
                    <p className="text-slate-500 mb-14">Diterima oleh Karyawan,</p>
                    <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1 text-slate-900">
                      {activeSlipRecap.employee.nama}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-14">Kasir / HR PR Sekar Anom,</p>
                    <p className="font-bold border-t border-slate-400 inline-block px-8 pt-1 text-slate-900">
                      ( Admin Payroll )
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
