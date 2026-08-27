import React, { useState } from 'react';
import { History, Search, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.employee_name.toLowerCase().includes(q) ||
        l.employee_id.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownloadCSV = () => {
    if (logs.length === 0) return;
    const header = ['Waktu', 'ID Karyawan', 'Nama Karyawan', 'Aksi', 'Nilai Sebelum', 'Nilai Sesudah', 'Alasan', 'Petugas'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.employee_id}"`,
      `"${l.employee_name}"`,
      `"${l.action}"`,
      `"${l.before_value.replace(/"/g, '""')}"`,
      `"${l.after_value.replace(/"/g, '""')}"`,
      `"${l.reason.replace(/"/g, '""')}"`,
      `"${l.actor}"`,
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Log_Sekar_Anom_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full pb-12 text-slate-900">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Log Audit & Jejak Perubahan HR
            </h2>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-0.5 rounded">
              {logs.length} Entri Tercatat
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Setiap penambahan, pengeditan, atau penghapusan sesi kerja dan tap mentah wajib menyertakan alasan dan tersimpan permanen di jejak audit.
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Log CSV</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 text-xs">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, ID, aksi, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">Filter Aksi:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Aksi</option>
              <option value="EDIT_SESSION">Edit Sesi</option>
              <option value="ADD_SESSION">Tambah Sesi</option>
              <option value="DELETE_SESSION">Hapus Sesi</option>
              <option value="LOCK_PERIOD">Kunci Periode</option>
              <option value="UNLOCK_PERIOD">Buka Kunci</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Karyawan</th>
                <th className="p-3">Jenis Aksi</th>
                <th className="p-3">Nilai Sebelum</th>
                <th className="p-3">Nilai Sesudah</th>
                <th className="p-3 min-w-[200px]">Alasan Koreksi (Wajib)</th>
                <th className="p-3">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    Belum ada riwayat koreksi manual yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-bold whitespace-nowrap text-slate-900">
                      {log.employee_name}{' '}
                      <span className="block text-[11px] font-mono font-normal text-slate-500">
                        {log.employee_id}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          log.action === 'EDIT_SESSION'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : log.action === 'ADD_SESSION'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.action === 'DELETE_SESSION'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">{log.before_value}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 text-[11px]">
                      {log.after_value}
                    </td>
                    <td className="p-3 font-medium text-slate-900 bg-slate-50/50">
                      {log.reason}
                    </td>
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                      {log.actor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
