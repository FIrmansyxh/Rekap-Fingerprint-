import * as XLSX from 'xlsx';
import { RawTap, UploadedFileInfo, Employee, MachineMapping } from '../types';
import { formatDate } from './engine';

export interface ParseResult {
  rawTaps: RawTap[];
  fileInfo: UploadedFileInfo;
  extractedEmployees: Employee[];
  extractedMappings: MachineMapping[];
  detectedDateRange: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Extract HH:mm tokens from a string.
 * Handles:
 * - Pipe separated: "08:02 | 16:04 | 16:06 | 16:08"
 * - Newline separated: "07:04\n15:00\n22:54"
 * - Merged without delimiter: "07041500"
 * - Space, semicolon, or comma separated: "07:04, 15:00; 22:54"
 */
export function extractTimeTokens(rawVal: unknown): string[] {
  if (rawVal === null || rawVal === undefined) return [];
  const str = String(rawVal).trim();
  if (!str) return [];

  // If Excel serial time (decimal between 0 and 1, or number)
  if (typeof rawVal === 'number' && rawVal > 0 && rawVal < 1) {
    const totalMinutes = Math.round(rawVal * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return [`${h}:${m}`];
  }

  // Check 5-character patterns HH:mm or HH.mm
  const timeRegex = /([01]?\d|2[0-3])[:.]([0-5]\d)/g;
  const matches = str.match(timeRegex);
  if (matches && matches.length > 0) {
    return matches.map((m) => {
      const parts = m.replace('.', ':').split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    });
  }

  // Check 4-digit merged patterns (e.g., 07041500 -> 07:04, 15:00)
  if (/^\d{4,}$/.test(str) && str.length % 4 === 0) {
    const tokens: string[] = [];
    for (let i = 0; i < str.length; i += 4) {
      const part = str.substring(i, i + 4);
      const h = part.substring(0, 2);
      const m = part.substring(2, 4);
      if (parseInt(h, 10) < 24 && parseInt(m, 10) < 60) {
        tokens.push(`${h}:${m}`);
      }
    }
    if (tokens.length > 0) return tokens;
  }

  return [];
}

/**
 * Parse an Excel Date or Date-like header/cell to YYYY-MM-DD
 */
function parseCellToDateStr(cellVal: unknown, fallbackYear = 2026): string | null {
  if (!cellVal) return null;

  if (typeof cellVal === 'number') {
    // Excel date serial number
    try {
      const d = XLSX.SSF.parse_date_code(cellVal);
      if (d) {
        const y = d.y || fallbackYear;
        const m = String(d.m).padStart(2, '0');
        const day = String(d.d).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch {
      // ignore
    }
  }

  const str = String(cellVal).trim();
  // Try direct YYYY-MM-DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // Try "15 Agt", "15 Agustus", "15 Aug"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', ags: '08', agt: '08', aug: '08', sep: '09',
    okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
  };

  const textMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,})/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthKey = textMatch[2].toLowerCase().substring(0, 3);
    const month = monthMap[monthKey] || '08';
    return `${fallbackYear}-${month}-${day}`;
  }

  // Try Javascript Date parse if formatted reasonably
  if (str.length >= 8 && (str.includes('-') || str.includes('/') || str.includes(' '))) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return formatDate(parsed);
    }
  }

  return null;
}

/**
 * Parses a 2D array of rows from XLSX or CSV into structured attendance data
 */
export function parseRawGrid(
  rawRows: unknown[][],
  fileName: string,
  fileSize: number,
  machineIdFallback = 'FINGER1'
): ParseResult {
  const rawTaps: RawTap[] = [];
  const datesFound = new Set<string>();
  const employeesMap = new Map<string, Employee>();
  const mappingsMap = new Map<string, MachineMapping>();

  let formatDetected: UploadedFileInfo['formatDetected'] = 'Standard Table / CSV';
  let detectedStartDate: string | undefined;
  let detectedEndDate: string | undefined;

  let baseYear = 2026;
  let baseMonth = 8;

  // 1. Scan metadata headers in top 15 rows for date ranges
  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const rowStr = (rawRows[r] || []).map((c) => String(c || '').trim()).join(' ');
    
    // Check "Tanggal:2026/08/01-2026/08/31" or "Waktu Absen,,2026-08-01 ~ 2026-08-26"
    const dateRangeMatch = rowStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s*[-~]\s*(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (dateRangeMatch) {
      baseYear = parseInt(dateRangeMatch[1], 10);
      baseMonth = parseInt(dateRangeMatch[2], 10);
      const startDay = dateRangeMatch[3].padStart(2, '0');
      const endYear = dateRangeMatch[4];
      const endMonth = dateRangeMatch[5].padStart(2, '0');
      const endDay = dateRangeMatch[6].padStart(2, '0');

      detectedStartDate = `${baseYear}-${String(baseMonth).padStart(2, '0')}-${startDay}`;
      detectedEndDate = `${endYear}-${endMonth}-${endDay}`;
      break;
    }
  }

  // 2. Check for FORMAT A: "Daftar Catatan" or standard matrix with day numbers (1..31) in header
  // e.g., Row: No,Nama,Dept.,1,2,3,4,5...31
  let matrixHeaderRowIndex = -1;
  let noColIdx = -1;
  let nameColIdx = -1;
  let deptColIdx = -1;
  let dayColumns: { colIndex: number; dayNumber: number; dateStr: string }[] = [];

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r] || [];
    const foundDays: { colIndex: number; dayNumber: number; dateStr: string }[] = [];
    let localNoIdx = -1;
    let localNameIdx = -1;
    let localDeptIdx = -1;

    row.forEach((cell, cIdx) => {
      const cellStr = String(cell || '').trim().toLowerCase();
      if (cellStr === 'no' || cellStr === 'no.' || cellStr === 'id' || cellStr === 'pin' || cellStr === 'ac-no' || cellStr === 'badgeno') {
        localNoIdx = cIdx;
      } else if (cellStr === 'nama' || cellStr === 'name') {
        localNameIdx = cIdx;
      } else if (cellStr === 'dept.' || cellStr === 'dept' || cellStr === 'departemen' || cellStr === 'bagian') {
        localDeptIdx = cIdx;
      }

      // Check if cell is a day number between 1 and 31
      const num = parseInt(cellStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === cellStr) {
        const dateStr = `${baseYear}-${String(baseMonth).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
        foundDays.push({ colIndex: cIdx, dayNumber: num, dateStr });
      } else {
        // Also check if cell is a full date string like "2026-08-01" or "01/08/2026"
        const fullDate = parseCellToDateStr(cell, baseYear);
        if (fullDate) {
          const dParts = fullDate.split('-');
          const dNum = parseInt(dParts[2], 10);
          foundDays.push({ colIndex: cIdx, dayNumber: dNum, dateStr: fullDate });
        }
      }
    });

    if (foundDays.length >= 3) {
      matrixHeaderRowIndex = r;
      noColIdx = localNoIdx !== -1 ? localNoIdx : 0;
      nameColIdx = localNameIdx !== -1 ? localNameIdx : (localNoIdx === 0 ? 1 : 0);
      deptColIdx = localDeptIdx !== -1 ? localDeptIdx : (localNameIdx === 1 ? 2 : -1);
      dayColumns = foundDays;
      break;
    }
  }

  // 3. Check for FORMAT B: "Lap. Detail Absensi" with block rows (Row 1: ID/Nama/Dept, Row 2: Taps)
  let isBlockFormat = false;
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const rowStr = (rawRows[r] || []).join(' ');
    if (rowStr.toLowerCase().includes('lap. detail absensi') || (rowStr.includes('ID:') && rowStr.includes('Nama:'))) {
      isBlockFormat = true;
      break;
    }
  }

  if (isBlockFormat) {
    formatDetected = 'Standard Table / CSV';

    // Find day columns header if present (e.g. row with 1,2,3,4...26)
    let blockDayCols: { colIndex: number; dayNumber: number; dateStr: string }[] = [];
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r] || [];
      const found: { colIndex: number; dayNumber: number; dateStr: string }[] = [];
      row.forEach((c, idx) => {
        const str = String(c || '').trim();
        const num = parseInt(str, 10);
        if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === str) {
          const dateStr = `${baseYear}-${String(baseMonth).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
          found.push({ colIndex: idx, dayNumber: num, dateStr });
        }
      });
      if (found.length >= 3) {
        blockDayCols = found;
        break;
      }
    }

    let currentEmp: { id: string; name: string; dept: string } | null = null;

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r] || [];
      const rowStr = row.map((c) => String(c || '').trim()).join(',');

      // Check if this row is an Employee Info Header line
      // e.g.: "ID:,,1,,,,,,Nama:,,ANTON,,,,,,,,Dept.:,,Perusahaan,,,,,"
      if (rowStr.includes('ID:') || rowStr.includes('Nama:')) {
        let extractedId = '';
        let extractedName = '';
        let extractedDept = 'Produksi';

        // Extract ID
        const idMatch = rowStr.match(/ID:\s*,*\s*([^,]+)/i);
        if (idMatch && idMatch[1]) {
          extractedId = idMatch[1].trim();
        }

        // Extract Nama
        const nameMatch = rowStr.match(/Nama:\s*,*\s*([^,]+)/i);
        if (nameMatch && nameMatch[1]) {
          extractedName = nameMatch[1].trim();
        }

        // Extract Dept
        const deptMatch = rowStr.match(/Dept\.?:\s*,*\s*([^,]+)/i);
        if (deptMatch && deptMatch[1]) {
          extractedDept = deptMatch[1].trim();
        }

        if (extractedId) {
          const empId = extractedId;
          const cleanName = extractedName || `Karyawan ${extractedId}`;
          const cleanDept = extractedDept || 'Umum';

          currentEmp = {
            id: extractedId,
            name: cleanName,
            dept: cleanDept,
          };

          if (!employeesMap.has(empId)) {
            employeesMap.set(empId, {
              employee_id: empId,
              nama: cleanName,
              bagian: cleanDept,
              upah_harian: 90000,
              upah_lembur_per_jam: 12000,
              status: 'aktif',
            });
          }

          const mapKey = `${machineIdFallback}-${extractedId}`;
          if (!mappingsMap.has(mapKey)) {
            mappingsMap.set(mapKey, {
              id: `map-${mapKey}`,
              machine_id: machineIdFallback,
              machine_user_id: extractedId,
              employee_id: empId,
              machine_name: 'Mesin Fingerprint',
            });
          }
        }
        continue;
      }

      // If we have a current employee and this row contains attendance taps (times with pipe | or HH:mm)
      if (currentEmp) {
        let hasTapsInRow = false;

        // If we have mapped day columns, use them
        if (blockDayCols.length > 0) {
          blockDayCols.forEach(({ colIndex, dateStr }) => {
            const cellVal = row[colIndex];
            if (!cellVal) return;

            const times = extractTimeTokens(cellVal);
            if (times.length > 0) {
              hasTapsInRow = true;
              datesFound.add(dateStr);
              times.forEach((t, tIdx) => {
                rawTaps.push({
                  id: `tap-${machineIdFallback}-${currentEmp!.id}-${dateStr}-${t}-${tIdx}`,
                  timestamp: `${dateStr} ${t}`,
                  machine_id: machineIdFallback,
                  machine_user_id: currentEmp!.id,
                  employee_id: currentEmp!.id,
                  raw_text: String(cellVal),
                  extracted_name: currentEmp!.name,
                  extracted_dept: currentEmp!.dept,
                });
              });
            }
          });
        } else {
          // Fallback: iterate each cell in row as day 1, 2, 3...
          row.forEach((cellVal, cIdx) => {
            if (!cellVal) return;
            const times = extractTimeTokens(cellVal);
            if (times.length > 0) {
              hasTapsInRow = true;
              const dayNum = cIdx + 1;
              const dateStr = `${baseYear}-${String(baseMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              datesFound.add(dateStr);
              times.forEach((t, tIdx) => {
                rawTaps.push({
                  id: `tap-${machineIdFallback}-${currentEmp!.id}-${dateStr}-${t}-${tIdx}`,
                  timestamp: `${dateStr} ${t}`,
                  machine_id: machineIdFallback,
                  machine_user_id: currentEmp!.id,
                  employee_id: currentEmp!.id,
                  raw_text: String(cellVal),
                  extracted_name: currentEmp!.name,
                  extracted_dept: currentEmp!.dept,
                });
              });
            }
          });
        }

        if (hasTapsInRow) {
          // Reset current employee after reading their attendance row
          currentEmp = null;
        }
      }
    }
  } else if (matrixHeaderRowIndex !== -1 && dayColumns.length > 0) {
    // 4. FORMAT A: "Daftar Catatan" or standard matrix where each data row has ID, Name, Dept and day columns
    let hasMultiLine = false;
    let hasMergedNoDelim = false;

    for (let r = matrixHeaderRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawUserId = String(row[noColIdx] || '').trim();
      const rawName = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';
      const rawDept = deptColIdx !== -1 ? String(row[deptColIdx] || '').trim() : '';

      // Skip non-data rows
      if (!rawUserId || (isNaN(Number(rawUserId)) && rawUserId.length > 12 && !rawName)) {
        continue;
      }

      // Check if there are any taps in this row
      let hasAnyTaps = false;
      for (const { colIndex } of dayColumns) {
        if (row[colIndex] && extractTimeTokens(row[colIndex]).length > 0) {
          hasAnyTaps = true;
          break;
        }
      }

      if (!hasAnyTaps && !rawName) continue;

      const empId = rawUserId;
      const cleanName = rawName || `Karyawan ${rawUserId}`;
      const cleanDept = rawDept || 'Umum';

      if (!employeesMap.has(empId)) {
        employeesMap.set(empId, {
          employee_id: empId,
          nama: cleanName,
          bagian: cleanDept,
          upah_harian: 90000,
          upah_lembur_per_jam: 12000,
          status: 'aktif',
        });
      }

      const mapKey = `${machineIdFallback}-${rawUserId}`;
      if (!mappingsMap.has(mapKey)) {
        mappingsMap.set(mapKey, {
          id: `map-${mapKey}`,
          machine_id: machineIdFallback,
          machine_user_id: rawUserId,
          employee_id: empId,
          machine_name: 'Mesin Fingerprint',
        });
      }

      dayColumns.forEach(({ colIndex, dateStr }) => {
        const cellValue = row[colIndex];
        if (!cellValue) return;

        const cellStr = String(cellValue);
        if (cellStr.includes('\n')) hasMultiLine = true;
        if (cellStr.length >= 8 && !cellStr.includes(':') && !cellStr.includes(' ') && !cellStr.includes('|')) {
          hasMergedNoDelim = true;
        }

        const times = extractTimeTokens(cellValue);
        if (times.length > 0) {
          datesFound.add(dateStr);
          times.forEach((t, tIdx) => {
            rawTaps.push({
              id: `tap-${machineIdFallback}-${rawUserId}-${dateStr}-${t}-${tIdx}`,
              timestamp: `${dateStr} ${t}`,
              machine_id: machineIdFallback,
              machine_user_id: rawUserId,
              employee_id: empId,
              raw_text: cellStr,
              extracted_name: cleanName,
              extracted_dept: cleanDept,
            });
          });
        }
      });
    }

    if (hasMergedNoDelim) {
      formatDetected = 'FINGER1 (Merged Timestamps)';
    } else if (hasMultiLine) {
      formatDetected = 'FINGER2 (Multi-line Cells)';
    } else {
      formatDetected = 'Standard Table / CSV';
    }
  } else {
    // 5. FORMAT C: Columnar / Vertical Record Log (e.g. Timestamp, Machine ID, User ID per row)
    formatDetected = 'FINGER3 (Columnar)';

    let tsCol = -1;
    let uidCol = -1;
    let nameCol = -1;
    let mIdCol = -1;
    let headerRowIdx = -1;

    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      const row = rawRows[r] || [];
      row.forEach((cell, cIdx) => {
        const str = String(cell || '').trim().toLowerCase();
        if (str.includes('time') || str.includes('waktu') || str.includes('tanggal') || str.includes('date')) {
          tsCol = cIdx;
        }
        if (str.includes('id') || str.includes('pin') || str.includes('user') || str.includes('no.')) {
          uidCol = cIdx;
        }
        if (str.includes('nama') || str.includes('name')) {
          nameCol = cIdx;
        }
        if (str.includes('machine') || str.includes('mesin') || str.includes('device')) {
          mIdCol = cIdx;
        }
      });
      if (tsCol !== -1 && uidCol !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    const startR = headerRowIdx === -1 ? 0 : headerRowIdx + 1;
    for (let r = startR; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawUser = uidCol !== -1 ? String(row[uidCol] || '').trim() : String(row[0] || '').trim();
      const rawTs = tsCol !== -1 ? row[tsCol] : row[1];
      const rawName = nameCol !== -1 ? String(row[nameCol] || '').trim() : `Karyawan ${rawUser}`;
      const rawMachine = mIdCol !== -1 ? String(row[mIdCol] || '').trim() : machineIdFallback;

      if (!rawUser || !rawTs) continue;

      const dateStr = parseCellToDateStr(rawTs, baseYear);
      const timeTokens = extractTimeTokens(rawTs);

      if (dateStr && timeTokens.length > 0) {
        datesFound.add(dateStr);
        const empId = rawUser;

        if (!employeesMap.has(empId)) {
          employeesMap.set(empId, {
            employee_id: empId,
            nama: rawName || `Karyawan ${rawUser}`,
            bagian: 'Produksi',
            upah_harian: 90000,
            upah_lembur_per_jam: 12000,
            status: 'aktif',
          });
        }

        const mapKey = `${rawMachine || machineIdFallback}-${rawUser}`;
        if (!mappingsMap.has(mapKey)) {
          mappingsMap.set(mapKey, {
            id: `map-${mapKey}`,
            machine_id: rawMachine || machineIdFallback,
            machine_user_id: rawUser,
            employee_id: empId,
            machine_name: 'Mesin Fingerprint',
          });
        }

        timeTokens.forEach((t, idx) => {
          rawTaps.push({
            id: `tap-col-${r}-${idx}`,
            timestamp: `${dateStr} ${t}`,
            machine_id: rawMachine || machineIdFallback,
            machine_user_id: rawUser,
            employee_id: empId,
            raw_text: String(rawTs),
            extracted_name: rawName || `Karyawan ${rawUser}`,
            extracted_dept: 'PRODUKSI',
          });
        });
      }
    }
  }

  const sortedDates = Array.from(datesFound).sort();
  if (!detectedStartDate && sortedDates.length > 0) {
    detectedStartDate = sortedDates[0];
  }
  if (!detectedEndDate && sortedDates.length > 0) {
    detectedEndDate = sortedDates[sortedDates.length - 1];
  }

  return {
    rawTaps,
    extractedEmployees: Array.from(employeesMap.values()),
    extractedMappings: Array.from(mappingsMap.values()),
    detectedDateRange: {
      startDate: detectedStartDate,
      endDate: detectedEndDate,
    },
    fileInfo: {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      fileSize,
      formatDetected,
      totalRowsParsed: rawTaps.length,
      datesCovered: sortedDates,
    },
  };
}

/**
 * Main XLSX/CSV File Parser that handles uploaded File objects
 */
export async function parseFingerprintFile(
  file: File,
  machineIdFallback = 'FINGER1'
): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  return parseRawGrid(rawRows, file.name, file.size, machineIdFallback);
}

/**
 * Parser for pasted CSV or raw text
 */
export function parseFingerprintText(
  text: string,
  fileName = 'input_pasted.csv',
  machineIdFallback = 'FINGER1'
): ParseResult {
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  return parseRawGrid(rawRows, fileName, text.length, machineIdFallback);
}

/**
 * Helper to extract available Saturday-to-Friday periods from a list of dates
 */
export function extractAvailablePeriods(dates: string[]): { startDate: string; endDate: string; label: string }[] {
  if (dates.length === 0) return [];
  const sortedDates = [...dates].sort();
  const minDate = new Date(sortedDates[0] + 'T00:00:00');
  const maxDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');

  const periods: { startDate: string; endDate: string; label: string }[] = [];
  
  // Find the first Saturday on or before minDate
  const currentSaturday = new Date(minDate);
  while (currentSaturday.getDay() !== 6) {
    currentSaturday.setDate(currentSaturday.getDate() - 1);
  }

  while (currentSaturday <= maxDate) {
    const startStr = formatDate(currentSaturday);
    const endFriday = new Date(currentSaturday);
    endFriday.setDate(currentSaturday.getDate() + 6);
    const endStr = formatDate(endFriday);

    periods.push({
      startDate: startStr,
      endDate: endStr,
      label: `Sabtu, ${startStr} s.d. Jumat, ${endStr}`,
    });

    currentSaturday.setDate(currentSaturday.getDate() + 7);
  }

  return periods;
}
