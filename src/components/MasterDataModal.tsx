import React, { useState } from 'react';
import {
  Users,
  Fingerprint,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Employee, MachineMapping } from '../types';
import { formatRupiah } from '../utils/engine';

interface MasterDataModalProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  machineMappings: MachineMapping[];
  setMachineMappings: React.Dispatch<React.SetStateAction<MachineMapping[]>>;
  isLocked: boolean;
  onResetToDefault: () => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  employees,
  setEmployees,
  machineMappings,
  setMachineMappings,
  isLocked,
  onResetToDefault,
}) => {
  const [tab, setTab] = useState<'employees' | 'mappings'>('employees');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee Form State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [empFormError, setEmpFormError] = useState('');
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    employee_id: '',
    nama: '',
    bagian: 'SECURITY',
    jabatan: '',
    upah_harian: 150000,
    upah_lembur_per_jam: 12500,
    status: 'aktif',
  });

  // Mapping Form State
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [isAddingMap, setIsAddingMap] = useState(false);
  const [mapFormError, setMapFormError] = useState('');
  const [mapForm, setMapForm] = useState<Partial<MachineMapping>>({
    machine_id: 'FINGER1',
    machine_user_id: '',
    employee_id: '',
    machine_name: 'Pos Security',
  });

  // In-App Confirm Dialog State
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [mapToDelete, setMapToDelete] = useState<MachineMapping | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Handle Employee Save
  const handleSaveEmployee = () => {
    if (!empForm.employee_id || !empForm.nama || !empForm.bagian || !empForm.upah_harian) {
      setEmpFormError('Mohon lengkapi ID Karyawan, Nama, Bagian, dan Upah Harian.');
      return;
    }

    const lembur = empForm.upah_lembur_per_jam || Math.round((empForm.upah_harian || 150000) / 12);
    const newEmp: Employee = {
      employee_id: empForm.employee_id.trim().toUpperCase(),
      nama: empForm.nama.trim().toUpperCase(),
      bagian: empForm.bagian.trim().toUpperCase(),
      jabatan: empForm.jabatan?.trim() || '',
      upah_harian: Number(empForm.upah_harian),
      upah_lembur_per_jam: Number(lembur),
      status: empForm.status || 'aktif',
    };

    if (isAddingEmp) {
      if (employees.some((e) => e.employee_id === newEmp.employee_id)) {
        setEmpFormError('ID Karyawan sudah terdaftar. Gunakan ID yang berbeda.');
        return;
      }
      setEmployees((prev) => [...prev, newEmp]);
    } else if (editingEmpId) {
      setEmployees((prev) => prev.map((e) => (e.employee_id === editingEmpId ? newEmp : e)));
    }

    setIsAddingEmp(false);
    setEditingEmpId(null);
    setEmpFormError('');
  };

  // Handle Mapping Save
  const handleSaveMapping = () => {
    if (!mapForm.machine_id || !mapForm.machine_user_id || !mapForm.employee_id) {
      setMapFormError('Mohon lengkapi ID Mesin, User ID di Mesin, dan Karyawan Tujuan.');
      return;
    }

    const newMap: MachineMapping = {
      id: editingMapId || `MAP-${Date.now()}`,
      machine_id: mapForm.machine_id.trim().toUpperCase(),
      machine_user_id: mapForm.machine_user_id.trim(),
      employee_id: mapForm.employee_id.trim().toUpperCase(),
      machine_name: mapForm.machine_name?.trim() || mapForm.machine_id,
    };

    if (isAddingMap) {
      setMachineMappings((prev) => [...prev, newMap]);
    } else if (editingMapId) {
      setMachineMappings((prev) => prev.map((m) => (m.id === editingMapId ? newMap : m)));
    }

    setIsAddingMap(false);
    setEditingMapId(null);
    setMapFormError('');
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.bagian.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMappings = machineMappings.filter(
    (m) =>
      m.machine_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.machine_user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full pb-12 text-slate-900">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Master Data Karyawan & Pemetaan Mesin
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Data tarif upah harian standar dan aturan pemetaan User ID mesin fingerprint ke ID Karyawan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isLocked && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl transition border border-slate-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Reset Data Standar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setTab('employees')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            tab === 'employees'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Master Karyawan & Tarif Upah ({employees.length})</span>
        </button>

        <button
          onClick={() => setTab('mappings')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            tab === 'mappings'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>Pemetaan ID Mesin Fingerprint ({machineMappings.length})</span>
        </button>
      </div>

      {/* TAB 1: MASTER EMPLOYEES */}
      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, ID, atau bagian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!isLocked && !isAddingEmp && !editingEmpId && (
              <button
                onClick={() => {
                  setIsAddingEmp(true);
                  setEditingEmpId(null);
                  setEmpFormError('');
                  setEmpForm({
                    employee_id: `EMP-00${employees.length + 1}`,
                    nama: '',
                    bagian: 'SECURITY',
                    jabatan: '',
                    upah_harian: 150000,
                    upah_lembur_per_jam: 12500,
                    status: 'aktif',
                  });
                }}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Karyawan
              </button>
            )}
          </div>

          {/* Form Create / Edit */}
          {(isAddingEmp || editingEmpId) && (
            <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                {isAddingEmp ? 'Tambah Karyawan Baru' : 'Edit Data Karyawan'}
              </h3>

              {empFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                  {empFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    ID Karyawan (Global) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={empForm.employee_id}
                    onChange={(e) => setEmpForm({ ...empForm, employee_id: e.target.value })}
                    disabled={Boolean(editingEmpId)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Nama Lengkap <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={empForm.nama}
                    onChange={(e) => setEmpForm({ ...empForm, nama: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 uppercase font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Bagian / Unit <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={empForm.bagian}
                    onChange={(e) => setEmpForm({ ...empForm, bagian: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 uppercase text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Upah Harian (Rp) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={empForm.upah_harian}
                    onChange={(e) => {
                      const harian = Number(e.target.value);
                      setEmpForm({
                        ...empForm,
                        upah_harian: harian,
                        upah_lembur_per_jam: Math.round(harian / 12),
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Upah Lembur / Jam (Default: Upah/12)
                  </label>
                  <input
                    type="number"
                    value={empForm.upah_lembur_per_jam}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, upah_lembur_per_jam: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={empForm.status}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, status: e.target.value as 'aktif' | 'nonaktif' })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsAddingEmp(false);
                    setEditingEmpId(null);
                    setEmpFormError('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
                >
                  Simpan Karyawan
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Karyawan</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Bagian</th>
                  <th className="p-3 text-right">Upah Harian (Rp)</th>
                  <th className="p-3 text-right">Upah Lembur/Jam (Rp)</th>
                  <th className="p-3">Status</th>
                  {!isLocked && <th className="p-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredEmployees.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{e.employee_id}</td>
                    <td className="p-3 font-bold text-slate-900">{e.nama}</td>
                    <td className="p-3 text-slate-700">{e.bagian}</td>
                    <td className="p-3 text-right font-mono text-slate-900 font-bold">{formatRupiah(e.upah_harian)}</td>
                    <td className="p-3 text-right font-mono text-slate-800">{formatRupiah(e.upah_lembur_per_jam)}</td>
                    <td className="p-3">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        {e.status.toUpperCase()}
                      </span>
                    </td>
                    {!isLocked && (
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingEmpId(e.employee_id);
                            setIsAddingEmp(false);
                            setEmpFormError('');
                            setEmpForm(e);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                          title="Edit Karyawan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEmpToDelete(e)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition"
                          title="Hapus Karyawan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MACHINE ID MAPPINGS */}
      {tab === 'mappings' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-slate-800">
            <strong>PENTING:</strong> Pemetaan wajib berbasis kombinasi ID Mesin + User ID Mesin, <strong>BUKAN NAMA</strong>. Nama dapat terduplikasi di beberapa mesin dengan orang berbeda.
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">
              Daftar {machineMappings.length} pemetaan aktif
            </span>
            {!isLocked && !isAddingMap && !editingMapId && (
              <button
                onClick={() => {
                  setIsAddingMap(true);
                  setEditingMapId(null);
                  setMapFormError('');
                  setMapForm({
                    machine_id: 'FINGER1',
                    machine_user_id: '',
                    employee_id: employees[0]?.employee_id || '',
                    machine_name: 'Pos Security',
                  });
                }}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Pemetaan
              </button>
            )}
          </div>

          {/* Form Add / Edit Mapping */}
          {(isAddingMap || editingMapId) && (
            <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-600" />
                {isAddingMap ? 'Tambah Pemetaan ID Mesin' : 'Edit Pemetaan'}
              </h3>

              {mapFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                  {mapFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    ID Mesin Fingerprint <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: FINGER1"
                    value={mapForm.machine_id}
                    onChange={(e) => setMapForm({ ...mapForm, machine_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    User ID di Mesin <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 6, 7, 101"
                    value={mapForm.machine_user_id}
                    onChange={(e) => setMapForm({ ...mapForm, machine_user_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Karyawan Tujuan <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={mapForm.employee_id}
                    onChange={(e) => setMapForm({ ...mapForm, employee_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="">Pilih Karyawan...</option>
                    {employees.map((e) => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.nama} ({e.employee_id} - {e.bagian})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Lokasi / Keterangan Mesin
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pos Security Gerbang"
                    value={mapForm.machine_name}
                    onChange={(e) => setMapForm({ ...mapForm, machine_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsAddingMap(false);
                    setEditingMapId(null);
                    setMapFormError('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMapping}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
                >
                  Simpan Pemetaan
                </button>
              </div>
            </div>
          )}

          {/* Mappings Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Mesin</th>
                  <th className="p-3">User ID Mesin</th>
                  <th className="p-3">Dipetakan ke Karyawan</th>
                  <th className="p-3">Lokasi / Keterangan Mesin</th>
                  {!isLocked && <th className="p-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredMappings.map((m) => {
                  const targetEmp = employees.find((e) => e.employee_id === m.employee_id);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {m.machine_id}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">
                        {m.machine_user_id}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">
                          {targetEmp?.nama || 'Unknown'}
                        </span>{' '}
                        <span className="text-[11px] font-mono text-slate-500">
                          ({m.employee_id} - {targetEmp?.bagian})
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{m.machine_name || '-'}</td>
                      {!isLocked && (
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingMapId(m.id);
                              setIsAddingMap(false);
                              setMapFormError('');
                              setMapForm(m);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                            title="Edit Pemetaan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setMapToDelete(m)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition"
                            title="Hapus Pemetaan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-App Delete Employee Modal */}
      {empToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Data Karyawan?</h3>
                <p className="text-xs text-slate-500">
                  {empToDelete.nama} ({empToDelete.employee_id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus data karyawan ini dari master data?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEmpToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setEmployees((prev) => prev.filter((item) => item.employee_id !== empToDelete.employee_id));
                  setEmpToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Hapus Karyawan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Mapping Modal */}
      {mapToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Pemetaan Mesin?</h3>
                <p className="text-xs text-slate-500">
                  Mesin {mapToDelete.machine_id} - User ID {mapToDelete.machine_user_id}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus aturan pemetaan ID mesin ini?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMapToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setMachineMappings((prev) => prev.filter((item) => item.id !== mapToDelete.id));
                  setMapToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Ya, Hapus Pemetaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Reset to Default Confirm Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reset Master Data ke Standar?</h3>
                <p className="text-xs text-slate-500">Kembalikan data 4 karyawan PR Sekar Anom</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tindakan ini akan mengembalikan daftar master karyawan dan pemetaan mesin ke konfigurasi default PR Sekar Anom (AMIR, EDY, HERUL, ANTON).
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onResetToDefault();
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                Ya, Reset Master Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
