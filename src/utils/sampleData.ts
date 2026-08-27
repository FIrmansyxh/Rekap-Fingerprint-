import { Employee, MachineMapping, RawTap, PeriodConfig } from '../types';

export const SAMPLE_PERIOD: PeriodConfig = {
  startDate: '2026-08-15', // Sabtu 15 Agustus 2026
  endDate: '2026-08-21', // Jumat 21 Agustus 2026
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    employee_id: 'EMP-001',
    nama: 'AMIR',
    bagian: 'SECURITY',
    jabatan: 'Anggota Jaga',
    upah_harian: 150000,
    upah_lembur_per_jam: 12500, // 150000 / 12
    status: 'aktif',
    previous_period_honor: 600000,
  },
  {
    employee_id: 'EMP-002',
    nama: 'EDY',
    bagian: 'SECURITY',
    jabatan: 'Anggota Jaga',
    upah_harian: 150000,
    upah_lembur_per_jam: 12500,
    status: 'aktif',
    previous_period_honor: 750000,
  },
  {
    employee_id: 'EMP-003',
    nama: 'HERUL',
    bagian: 'SECURITY',
    jabatan: 'Anggota Jaga',
    upah_harian: 127500,
    upah_lembur_per_jam: 10625, // 127500 / 12
    status: 'aktif',
    previous_period_honor: 637500,
  },
  {
    employee_id: 'EMP-004',
    nama: 'ANTON',
    bagian: 'PERUSAHAAN',
    jabatan: 'Staff Lapangan',
    upah_harian: 165000,
    upah_lembur_per_jam: 13750, // 165000 / 12
    status: 'aktif',
    previous_period_honor: 825000,
  },
  {
    employee_id: 'EMP-005',
    nama: 'SLAMET WAHYUDI',
    bagian: 'MESIN 1 SA',
    jabatan: 'Operator Linting',
    upah_harian: 142500,
    upah_lembur_per_jam: 11875,
    status: 'aktif',
    previous_period_honor: 712500,
  },
  {
    employee_id: 'EMP-006',
    nama: 'SITI RAHAYU',
    bagian: 'GARAN SH',
    jabatan: 'Mandor Garan',
    upah_harian: 165000,
    upah_lembur_per_jam: 13750,
    status: 'aktif',
    previous_period_honor: 825000,
  },
  {
    employee_id: 'EMP-007',
    nama: 'BAMBANG SUTRISNO',
    bagian: 'MOLINS SH',
    jabatan: 'Teknisi Mesin',
    upah_harian: 165000,
    upah_lembur_per_jam: 13750,
    status: 'aktif',
    previous_period_honor: 825000,
  },
];

export const INITIAL_MACHINE_MAPPINGS: MachineMapping[] = [
  {
    id: 'MAP-001',
    machine_id: 'FINGER1',
    machine_user_id: '6',
    employee_id: 'EMP-001', // AMIR
    machine_name: 'Pos Security Gerbang Utama',
  },
  {
    id: 'MAP-002',
    machine_id: 'FINGER1',
    machine_user_id: '7',
    employee_id: 'EMP-002', // EDY
    machine_name: 'Pos Security Gerbang Utama',
  },
  {
    id: 'MAP-003',
    machine_id: 'FINGER1',
    machine_user_id: '11',
    employee_id: 'EMP-003', // HERUL
    machine_name: 'Pos Security Gerbang Utama',
  },
  {
    id: 'MAP-004',
    machine_id: 'FINGER2',
    machine_user_id: '2',
    employee_id: 'EMP-003', // HERUL on FINGER2 (Admin Dept.) - multi-machine check Y04
    machine_name: 'Gedung Admin & Produksi',
  },
  {
    id: 'MAP-005',
    machine_id: 'FINGER1',
    machine_user_id: '15',
    employee_id: 'EMP-004', // ANTON
    machine_name: 'Pos Security Gerbang Utama',
  },
  {
    id: 'MAP-006',
    machine_id: 'FINGER2',
    machine_user_id: '101',
    employee_id: 'EMP-005', // SLAMET
    machine_name: 'Gedung Admin & Produksi',
  },
  {
    id: 'MAP-007',
    machine_id: 'FINGER2',
    machine_user_id: '102',
    employee_id: 'EMP-006', // SITI
    machine_name: 'Gedung Admin & Produksi',
  },
  {
    id: 'MAP-008',
    machine_id: 'FINGER2',
    machine_user_id: '103',
    employee_id: 'EMP-007', // BAMBANG
    machine_name: 'Gedung Admin & Produksi',
  },
];

/**
 * Generate sample raw taps from exact prompt specifications
 */
export function generateSampleTaps(): RawTap[] {
  const taps: RawTap[] = [
    // AMIR (EMP-001, FINGER1, ID 6)
    // 15 Agt: 07:04
    { id: 'TAP-AM-1', timestamp: '2026-08-15 07:04', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 16 Agt: 01:45, 01:47 (dedup), 06:45, 19:02
    { id: 'TAP-AM-2', timestamp: '2026-08-16 01:45', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-3', timestamp: '2026-08-16 01:47', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-4', timestamp: '2026-08-16 06:45', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-5', timestamp: '2026-08-16 19:02', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 17 Agt: 06:58, 15:00, 22:54
    { id: 'TAP-AM-6', timestamp: '2026-08-17 06:58', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-7', timestamp: '2026-08-17 15:00', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-8', timestamp: '2026-08-17 22:54', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 18 Agt: 14:52, 22:55
    { id: 'TAP-AM-9', timestamp: '2026-08-18 14:52', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-10', timestamp: '2026-08-18 22:55', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 19 Agt: 15:08, 23:01
    { id: 'TAP-AM-11', timestamp: '2026-08-19 15:08', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-12', timestamp: '2026-08-19 23:01', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 20 Agt: 22:54
    { id: 'TAP-AM-13', timestamp: '2026-08-20 22:54', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    // 21 Agt: 14:57, 23:59
    { id: 'TAP-AM-14', timestamp: '2026-08-21 14:57', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },
    { id: 'TAP-AM-15', timestamp: '2026-08-21 23:59', machine_id: 'FINGER1', machine_user_id: '6', employee_id: 'EMP-001' },

    // EDY (EMP-002, FINGER1, ID 7)
    // 15 Agt: 07:03, 15:04
    { id: 'TAP-ED-1', timestamp: '2026-08-15 07:03', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    { id: 'TAP-ED-2', timestamp: '2026-08-15 15:04', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    // 16 Agt: (kosong)
    // 17 Agt: 22:50
    { id: 'TAP-ED-3', timestamp: '2026-08-17 22:50', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    // 18 Agt: 06:57, 22:46
    { id: 'TAP-ED-4', timestamp: '2026-08-18 06:57', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    { id: 'TAP-ED-5', timestamp: '2026-08-18 22:46', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    // 19 Agt: 07:04, 22:49
    { id: 'TAP-ED-6', timestamp: '2026-08-19 07:04', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    { id: 'TAP-ED-7', timestamp: '2026-08-19 22:49', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    // 20 Agt: 07:00, 22:49
    { id: 'TAP-ED-8', timestamp: '2026-08-20 07:00', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    { id: 'TAP-ED-9', timestamp: '2026-08-20 22:49', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    // 21 Agt: 07:06, 19:06
    { id: 'TAP-ED-10', timestamp: '2026-08-21 07:06', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },
    { id: 'TAP-ED-11', timestamp: '2026-08-21 19:06', machine_id: 'FINGER1', machine_user_id: '7', employee_id: 'EMP-002' },

    // HERUL (EMP-003, FINGER1 ID 11 & FINGER2 ID 2)
    // 15 Agt: 06:21
    { id: 'TAP-HE-1', timestamp: '2026-08-15 06:21', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 16 Agt: 01:46
    { id: 'TAP-HE-2', timestamp: '2026-08-16 01:46', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 17 Agt: 13:58, 22:01
    { id: 'TAP-HE-3', timestamp: '2026-08-17 13:58', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    { id: 'TAP-HE-4', timestamp: '2026-08-17 22:01', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 18 Agt: 13:54, 23:09
    { id: 'TAP-HE-5', timestamp: '2026-08-18 13:54', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    { id: 'TAP-HE-6', timestamp: '2026-08-18 23:09', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 19 Agt: 13:57, 22:01
    { id: 'TAP-HE-7', timestamp: '2026-08-19 13:57', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    { id: 'TAP-HE-8', timestamp: '2026-08-19 22:01', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 20 Agt: 13:57, 22:04
    { id: 'TAP-HE-9', timestamp: '2026-08-20 13:57', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    { id: 'TAP-HE-10', timestamp: '2026-08-20 22:04', machine_id: 'FINGER1', machine_user_id: '11', employee_id: 'EMP-003' },
    // 21 Agt: 14:09, 23:12 (Recorded on FINGER2)
    { id: 'TAP-HE-11', timestamp: '2026-08-21 14:09', machine_id: 'FINGER2', machine_user_id: '2', employee_id: 'EMP-003' },
    { id: 'TAP-HE-12', timestamp: '2026-08-21 23:12', machine_id: 'FINGER2', machine_user_id: '2', employee_id: 'EMP-003' },

    // ANTON: No taps (R06)

    // SLAMET WAHYUDI (Clean 6 days regular shift)
    { id: 'TAP-SL-1', timestamp: '2026-08-15 07:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-2', timestamp: '2026-08-15 15:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-3', timestamp: '2026-08-17 07:02', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-4', timestamp: '2026-08-17 15:05', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-5', timestamp: '2026-08-18 06:58', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-6', timestamp: '2026-08-18 15:02', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-7', timestamp: '2026-08-19 07:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-8', timestamp: '2026-08-19 15:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-9', timestamp: '2026-08-20 07:01', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-10', timestamp: '2026-08-20 15:03', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-11', timestamp: '2026-08-21 07:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },
    { id: 'TAP-SL-12', timestamp: '2026-08-21 15:00', machine_id: 'FINGER2', machine_user_id: '101', employee_id: 'EMP-005' },

    // SITI RAHAYU (Regular with 1 day overtime)
    { id: 'TAP-SI-1', timestamp: '2026-08-15 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-2', timestamp: '2026-08-15 19:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' }, // 12h = 1.0 H
    { id: 'TAP-SI-3', timestamp: '2026-08-17 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-4', timestamp: '2026-08-17 21:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' }, // 14h = 1.0 H, 2.0 L
    { id: 'TAP-SI-5', timestamp: '2026-08-18 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-6', timestamp: '2026-08-18 19:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-7', timestamp: '2026-08-19 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-8', timestamp: '2026-08-19 19:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-9', timestamp: '2026-08-20 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-10', timestamp: '2026-08-20 19:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-11', timestamp: '2026-08-21 07:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },
    { id: 'TAP-SI-12', timestamp: '2026-08-21 19:00', machine_id: 'FINGER2', machine_user_id: '102', employee_id: 'EMP-006' },

    // BAMBANG SUTRISNO (Regular)
    { id: 'TAP-BA-1', timestamp: '2026-08-15 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-2', timestamp: '2026-08-15 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-3', timestamp: '2026-08-17 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-4', timestamp: '2026-08-17 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-5', timestamp: '2026-08-18 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-6', timestamp: '2026-08-18 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-7', timestamp: '2026-08-19 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-8', timestamp: '2026-08-19 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-9', timestamp: '2026-08-20 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-10', timestamp: '2026-08-20 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-11', timestamp: '2026-08-21 08:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
    { id: 'TAP-BA-12', timestamp: '2026-08-21 16:00', machine_id: 'FINGER2', machine_user_id: '103', employee_id: 'EMP-007' },
  ];

  return taps;
}
