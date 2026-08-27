import * as XLSX from 'xlsx';
import { EmployeeRecap, PeriodConfig, AuditLogEntry } from '../types';
import { getPeriodDates, getIndonesianDayName } from './engine';

/**
 * Generate Excel Workbook matching PR Sekar Anom manual attendance sheet
 */
export function generateRecapWorkbook(
  recaps: EmployeeRecap[],
  period: PeriodConfig,
  auditLogs: AuditLogEntry[]
): XLSX.WorkBook {
  const periodDates = getPeriodDates(period.startDate);
  const dayNames = periodDates.map((d) => getIndonesianDayName(d));

  // --- SHEET 1: DAFTAR REKAP GAJI HARIAN ---
  // Headers row 1 & row 2
  const headers1: string[] = [
    'NO',
    'JABATAN / BAGIAN',
    'NAMA KARYAWAN',
    ...dayNames.flatMap((day) => [`${day.toUpperCase()}`, '']),
    'JUMLAH MASUK',
    '',
    'UPAH HARIAN (Rp)',
    'UPAH LEMBUR (Rp)',
    'JUMLAH HONOR (Rp)',
  ];

  const headers2: string[] = [
    '',
    '',
    '',
    ...periodDates.flatMap((d) => [`H (${d.substring(5)})`, `L (${d.substring(5)})`]),
    'Total H',
    'Total L (Jam)',
    '',
    '',
    '',
  ];

  const rows: (string | number)[][] = [
    [`PR SEKAR ANOM - REKAP GAJI KARYAWAN HARIAN`],
    [`Periode: ${period.startDate} s.d. ${period.endDate}`],
    [],
    headers1,
    headers2,
  ];

  let grandTotalH = 0;
  let grandTotalL = 0;
  let grandTotalHonor = 0;

  recaps.forEach((recap, idx) => {
    const dailyValues: (number | string)[] = [];
    periodDates.forEach((dStr) => {
      const dayData = recap.daily_breakdown[dStr];
      if (dayData) {
        dailyValues.push(Number(dayData.H.toFixed(2)));
        dailyValues.push(Number(dayData.L.toFixed(2)));
      } else {
        dailyValues.push(0);
        dailyValues.push(0);
      }
    });

    const roundedH = Math.round(recap.total_H * 100) / 100;
    const roundedL = Math.round(recap.total_L * 100) / 100;

    grandTotalH += roundedH;
    grandTotalL += roundedL;
    grandTotalHonor += recap.total_honor;

    rows.push([
      idx + 1,
      recap.employee.bagian + (recap.employee.jabatan ? ` - ${recap.employee.jabatan}` : ''),
      recap.employee.nama,
      ...dailyValues,
      roundedH,
      roundedL,
      recap.employee.upah_harian,
      recap.employee.upah_lembur_per_jam,
      recap.total_honor,
    ]);
  });

  // Total Summary Row
  rows.push([]);
  rows.push([
    'TOTAL',
    '',
    `${recaps.length} Karyawan`,
    ...periodDates.flatMap(() => ['', '']),
    Number(grandTotalH.toFixed(2)),
    Number(grandTotalL.toFixed(2)),
    '',
    '',
    grandTotalHonor,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(rows);

  // --- SHEET 2: RINCIAN SESI KERJA ---
  const sessionRows: (string | number)[][] = [
    [
      'ID Karyawan',
      'Nama Karyawan',
      'Bagian',
      'Tanggal Sesi',
      'Hari',
      'Jam Masuk',
      'Jam Keluar',
      'Durasi (Jam)',
      'H (Hari)',
      'L (Lembur Jam)',
      'Status Koreksi',
      'Alasan Koreksi',
    ],
  ];

  recaps.forEach((recap) => {
    recap.sessions.forEach((s) => {
      sessionRows.push([
        recap.employee.employee_id,
        recap.employee.nama,
        recap.employee.bagian,
        s.date_str,
        getIndonesianDayName(s.date_str),
        s.check_in,
        s.check_out,
        Number(s.duration_hours.toFixed(2)),
        Number(s.H.toFixed(2)),
        Number(s.L.toFixed(2)),
        s.is_manually_edited ? 'KOREKSI MANUAL' : 'OTOMATIS FINGERPRINT',
        s.manual_edit_reason || '-',
      ]);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sessionRows);

  // --- SHEET 3: AUDIT LOG ---
  const auditRows: (string | number)[][] = [
    ['Waktu (Timestamp)', 'ID Karyawan', 'Nama Karyawan', 'Aksi', 'Nilai Sebelum', 'Nilai Sesudah', 'Alasan Koreksi', 'Petugas (Actor)'],
  ];

  auditLogs.forEach((log) => {
    auditRows.push([
      log.timestamp,
      log.employee_id,
      log.employee_name,
      log.action,
      log.before_value,
      log.after_value,
      log.reason,
      log.actor,
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(auditRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Gaji Mingguan');
  XLSX.utils.book_append_sheet(wb, ws2, 'Rincian Sesi & Koreksi');
  XLSX.utils.book_append_sheet(wb, ws3, 'Audit Log');

  return wb;
}

/**
 * Download workbook as XLSX file
 */
export function downloadWorkbookAsXLSX(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Download single sheet as CSV text
 */
export function downloadRecapAsCSV(recaps: EmployeeRecap[], period: PeriodConfig, fileName: string) {
  const wb = generateRecapWorkbook(recaps, period, []);
  const sheet = wb.Sheets['Rekap Gaji Mingguan'];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
