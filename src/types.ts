/**
 * Types & Interfaces for PR Sekar Anom Payroll System (payrec)
 */

export interface Employee {
  employee_id: string;
  nama: string;
  bagian: string;
  jabatan?: string;
  upah_harian: number;
  upah_lembur_per_jam: number;
  status: 'aktif' | 'nonaktif';
  berlaku_dari?: string;
  previous_period_honor?: number; // for Y01 variance check
  is_unmapped_new_name?: boolean;
  unmapped_raw_id?: string;
}

export interface MachineMapping {
  id: string;
  machine_id: string;
  machine_user_id: string;
  employee_id: string;
  machine_name?: string;
}

export interface RawTap {
  id: string;
  timestamp: string; // ISO string or 'YYYY-MM-DD HH:mm'
  machine_id: string;
  machine_user_id: string;
  employee_id?: string;
  raw_text?: string;
  extracted_name?: string;
  extracted_dept?: string;
  is_deduped?: boolean;
  dedup_reason?: string;
  is_boundary_shift?: boolean;
  boundary_direction?: 'FRIDAY_NIGHT_FORWARD' | 'SATURDAY_MORNING_PREVIOUS';
  is_deferred_to_next?: boolean;
  is_settled_in_previous?: boolean;
  boundary_note?: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  date_str: string; // YYYY-MM-DD (session start date)
  check_in: string; // 'YYYY-MM-DD HH:mm'
  check_out: string; // 'YYYY-MM-DD HH:mm'
  duration_minutes: number;
  duration_hours: number;
  H: number; // hari kerja standard (min(jam/STANDARD_HOURS, 1.0))
  L: number; // jam lembur (max(0, jam - OVERTIME_THRESHOLD))
  is_anomaly: boolean;
  anomaly_reasons: string[];
  is_manually_edited?: boolean;
  manual_edit_reason?: string;
  is_cross_period?: boolean;
}

export interface FlagBadge {
  code: 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'Y01' | 'Y02' | 'Y03' | 'Y04' | 'Y05' | 'B01' | 'B02';
  level: 'red' | 'yellow';
  title: string;
  description: string;
}

export interface DailyBreakdown {
  date: string; // YYYY-MM-DD
  dayName: 'Sabtu' | 'Minggu' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  H: number;
  L: number;
  sessions: WorkSession[];
}

export interface EmployeeRecap {
  employee: Employee;
  total_H: number; // sum of H
  total_L: number; // sum of L
  total_honor: number; // ROUND(total_H,2)*upah_harian + ROUND(total_L,2)*upah_lembur
  total_taps: number;
  orphan_taps_count: number;
  sessions: WorkSession[];
  raw_taps: RawTap[];
  daily_breakdown: Record<string, DailyBreakdown>; // keyed by date YYYY-MM-DD
  flags: FlagBadge[];
  status_color: 'red' | 'yellow' | 'green';
  machines_used: string[];
  attendance_note?: string; // Catatan cuti / sakit / izin opsional (misal: Cuti Melahirkan, Cuti Tahunan, Sakit)
}

export interface PeriodConfig {
  startDate: string; // YYYY-MM-DD (Saturday)
  endDate: string; // YYYY-MM-DD (Friday)
}

export interface SystemSettings {
  dedup_window_minutes: number; // default 5
  session_min_hours: number; // default 1.0
  session_max_hours: number; // default 16.0
  standard_hours: number; // default 12
  overtime_threshold_hours: number; // default 12
  variance_threshold_percent: number; // default 30
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  employee_id: string;
  employee_name: string;
  action: 'EDIT_SESSION' | 'ADD_SESSION' | 'DELETE_SESSION' | 'UNLOCK_PERIOD' | 'LOCK_PERIOD' | 'BULK_CORRECTION';
  before_value: string;
  after_value: string;
  reason: string;
  actor: string;
}

export interface UploadedFileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  formatDetected: 'FINGER1 (Merged Timestamps)' | 'FINGER2 (Multi-line Cells)' | 'FINGER3 (Columnar)' | 'Standard Table / CSV';
  totalRowsParsed: number;
  datesCovered: string[];
}
