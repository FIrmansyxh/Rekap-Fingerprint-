import {
  Employee,
  MachineMapping,
  RawTap,
  WorkSession,
  FlagBadge,
  DailyBreakdown,
  EmployeeRecap,
  SystemSettings,
  PeriodConfig,
} from '../types';

export const DEFAULT_SETTINGS: SystemSettings = {
  dedup_window_minutes: 15,
  session_min_hours: 1.0,
  session_max_hours: 24.0,
  standard_hours: 12.0,
  overtime_threshold_hours: 12.0,
  variance_threshold_percent: 30,
};

/**
 * Format a date object or string into YYYY-MM-DD
 */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get day name in Indonesian
 */
export function getIndonesianDayName(dateStr: string): 'Sabtu' | 'Minggu' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' {
  const d = new Date(dateStr + 'T00:00:00');
  const dayIndex = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const map: Record<number, 'Minggu' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'> = {
    0: 'Minggu',
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
  };
  return map[dayIndex];
}

/**
 * Given a Saturday start date, compute the 7 days of the period (Saturday to Friday)
 */
export function getPeriodDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    dates.push(formatDate(next));
  }
  return dates;
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format decimal to Indonesian standard (comma as decimal separator)
 */
export function formatDecimal(val: number, digits: number = 2): string {
  return val.toFixed(digits).replace('.', ',');
}

/**
 * Step 1: Dedup taps (Auto-Cleaning for rapid multiple fingerprint jitter)
 * Automatically cleans and filters redundant duplicate taps per employee when an employee taps multiple times
 * within a short interval (e.g., 10 times in 3-15 minutes).
 * Preserves the first valid tap of the cluster and marks subsequent jitter taps as is_deduped.
 */
export function dedupTaps(rawTaps: RawTap[], windowMinutes: number = 15): RawTap[] {
  if (rawTaps.length === 0) return [];

  // Group by employee / machine user identity so different workers never interfere
  const grouped = new Map<string, RawTap[]>();
  rawTaps.forEach((tap) => {
    const key = tap.employee_id || `${tap.machine_id}_${tap.machine_user_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tap);
  });

  const allProcessed: RawTap[] = [];

  grouped.forEach((employeeTaps) => {
    // Sort ascending by timestamp for this employee
    const sorted = [...employeeTaps].sort(
      (a, b) => new Date(a.timestamp.replace(' ', 'T')).getTime() - new Date(b.timestamp.replace(' ', 'T')).getTime()
    );

    let lastValidTime: number | null = null;
    let lastAnyTapTime: number | null = null;

    for (const tap of sorted) {
      const tapTime = new Date(tap.timestamp.replace(' ', 'T')).getTime();

      if (lastValidTime !== null && lastAnyTapTime !== null) {
        const diffFromPreviousTap = (tapTime - lastAnyTapTime) / (1000 * 60);
        const diffFromClusterStart = (tapTime - lastValidTime) / (1000 * 60);

        // If this tap is within windowMinutes of either the cluster start OR the immediate previous burst tap
        if (diffFromPreviousTap <= windowMinutes || diffFromClusterStart <= windowMinutes) {
          lastAnyTapTime = tapTime;
          allProcessed.push({
            ...tap,
            is_deduped: true,
            dedup_reason: `Otomatis dibersihkan: Interval ${diffFromPreviousTap.toFixed(1)} mnt (≤ ${windowMinutes} mnt) dari tap ${new Date(lastAnyTapTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
          });
          continue;
        }
      }

      lastValidTime = tapTime;
      lastAnyTapTime = tapTime;
      allProcessed.push({
        ...tap,
        is_deduped: false,
      });
    }
  });

  return allProcessed;
}

/**
 * Helper to identify boundary shift potentials (Friday Night -> Next Saturday OR Saturday Morning -> Previous Friday)
 */
export function getBoundaryShiftInfo(
  tap: RawTap,
  period: PeriodConfig
): {
  isBoundary: boolean;
  type?: 'FRIDAY_NIGHT_FORWARD' | 'SATURDAY_MORNING_PREVIOUS';
  title?: string;
  suggestion?: string;
} {
  const tapDate = formatDate(new Date(tap.timestamp.replace(' ', 'T')));
  const tapHour = new Date(tap.timestamp.replace(' ', 'T')).getHours();

  // Check Friday night (>= 15:00 on period.endDate)
  if (tapDate === period.endDate && tapHour >= 15) {
    return {
      isBoundary: true,
      type: 'FRIDAY_NIGHT_FORWARD',
      title: 'Potensi Shift Malam Jumat (Keluar Sabtu Besok)',
      suggestion:
        'Karyawan tap masuk di Jumat sore/malam. Tap keluar kemungkinan ada di hari Sabtu pagi (periode minggu depan). Unggah file minggu depan untuk sinkronisasi otomatis, atau tandai "Bawa ke Minggu Depan" / "Selesaikan Sesi".',
    };
  }

  // Check Saturday morning (<= 10:00 on period.startDate)
  if (tapDate === period.startDate && tapHour <= 10) {
    return {
      isBoundary: true,
      type: 'SATURDAY_MORNING_PREVIOUS',
      title: 'Potensi Tap Keluar Shift Jumat Minggu Lalu',
      suggestion:
        'Karyawan tap di Sabtu pagi tanpa jam masuk. Kemungkinan merupakan tap pulang dari shift Jumat malam minggu lalu. Unggah file minggu lalu untuk pencocokan otomatis, atau tandai "Sudah Dihitung di Slip Minggu Lalu".',
    };
  }

  return { isBoundary: false };
}

/**
 * Step 2 & 3: Form Sessions with Smart Lookahead & Phase Reset & Boundary Shift Handling
 */
export function formSessionsWithPhaseReset(
  validTaps: RawTap[],
  employeeId: string,
  settings: SystemSettings,
  period: PeriodConfig
): { sessions: WorkSession[]; orphanTaps: RawTap[]; flags: FlagBadge[] } {
  const flags: FlagBadge[] = [];
  const sessions: WorkSession[] = [];
  const orphanTaps: RawTap[] = [];

  const periodStart = new Date(period.startDate + 'T00:00:00').getTime();
  const periodEnd = new Date(period.endDate + 'T23:59:59').getTime();

  // Sort valid taps chronologically
  const sortedTaps = [...validTaps].sort(
    (a, b) => new Date(a.timestamp.replace(' ', 'T')).getTime() - new Date(b.timestamp.replace(' ', 'T')).getTime()
  );

  let i = 0;
  while (i < sortedTaps.length) {
    const tapIn = sortedTaps[i];
    const tapInTime = new Date(tapIn.timestamp.replace(' ', 'T')).getTime();

    // Check if there is a next tap
    if (i + 1 >= sortedTaps.length) {
      // Single tap at the end of tap list
      orphanTaps.push(tapIn);

      // Check if user resolved as deferred to next week
      if (tapIn.is_deferred_to_next) {
        flags.push({
          code: 'B01',
          level: 'yellow',
          title: 'Shift Malam Jumat (Diteruskan ke Minggu Depan)',
          description: `Tap masuk Jumat ${tapIn.timestamp.replace('T', ' ')} ditandai untuk dihitung pada periode berikutnya (Sabtu besok). Tidak memblokir payroll saat ini.`,
        });
      } else if (tapIn.is_settled_in_previous) {
        flags.push({
          code: 'B02',
          level: 'yellow',
          title: 'Tap Keluar Shift Jumat Lalu (Sudah Selesai)',
          description: `Tap ${tapIn.timestamp.replace('T', ' ')} telah diselesaikan pada slip periode sebelumnya.`,
        });
      } else {
        const boundary = getBoundaryShiftInfo(tapIn, period);
        if (boundary.isBoundary && boundary.type === 'FRIDAY_NIGHT_FORWARD') {
          flags.push({
            code: 'B01',
            level: 'yellow',
            title: 'Potensi Shift Malam Jumat (Lintas Periode)',
            description: `Tap masuk Jumat malam (${tapIn.timestamp.replace('T', ' ')}). Kemungkinan check-out Sabtu pagi periode berikutnya. Anda dapat mengunggah file minggu depan atau tandai "Bawa ke Minggu Depan".`,
          });
        } else if (boundary.isBoundary && boundary.type === 'SATURDAY_MORNING_PREVIOUS') {
          flags.push({
            code: 'B02',
            level: 'yellow',
            title: 'Potensi Tap Keluar Shift Jumat Lalu',
            description: `Tap Sabtu pagi (${tapIn.timestamp.replace('T', ' ')}). Kemungkinan tap keluar shift Jumat malam minggu lalu. Unggah file minggu lalu atau tandai "Sudah Dihitung Minggu Lalu".`,
          });
        } else {
          flags.push({
            code: 'R01',
            level: 'red',
            title: 'Tak Berpasangan / Tanpa Pasangan Keluar',
            description: `Tap tunggal pada ${tapIn.timestamp.replace('T', ' ')} tidak memiliki tap keluar pasangannya.`,
          });
        }
      }
      i++;
      break;
    }

    // Look ahead to find the best matching checkout tap
    let foundValidPairIndex = -1;
    for (let j = i + 1; j < sortedTaps.length; j++) {
      const candidateOut = sortedTaps[j];
      const candidateOutTime = new Date(candidateOut.timestamp.replace(' ', 'T')).getTime();
      const durHours = (candidateOutTime - tapInTime) / (1000 * 60 * 60);

      if (durHours >= settings.session_min_hours && durHours <= settings.session_max_hours) {
        // Found matching valid checkout!
        foundValidPairIndex = j;
        break;
      } else if (durHours > settings.session_max_hours) {
        // Beyond max hours, stop searching for this tapIn
        break;
      }
    }

    if (foundValidPairIndex !== -1) {
      // Valid session found between i and foundValidPairIndex
      const tapOut = sortedTaps[foundValidPairIndex];
      const tapOutTime = new Date(tapOut.timestamp.replace(' ', 'T')).getTime();
      const durationMinutes = (tapOutTime - tapInTime) / (1000 * 60);
      const durationHours = durationMinutes / 60;

      const sessionStartDateStr = formatDate(new Date(tapIn.timestamp.replace(' ', 'T')));
      const isWithinPeriod = tapInTime >= periodStart && tapInTime <= periodEnd;

      if (isWithinPeriod) {
        const H = Math.min(durationHours / settings.standard_hours, 1.0);
        const L = Math.max(0, durationHours - settings.overtime_threshold_hours);

        const session: WorkSession = {
          id: `sess-${employeeId}-${tapInTime}-${tapOutTime}`,
          employee_id: employeeId,
          date_str: sessionStartDateStr,
          check_in: tapIn.timestamp,
          check_out: tapOut.timestamp,
          duration_minutes: durationMinutes,
          duration_hours: durationHours,
          H,
          L,
          is_anomaly: false,
          anomaly_reasons: [],
        };

        sessions.push(session);
      }

      // Move cursor past the checkout tap
      i = foundValidPairIndex + 1;
    } else {
      // No valid checkout found in range [session_min_hours, session_max_hours]
      const immediateNext = sortedTaps[i + 1];
      const immediateNextTime = new Date(immediateNext.timestamp.replace(' ', 'T')).getTime();
      const durHours = (immediateNextTime - tapInTime) / (1000 * 60 * 60);
      const durMinutes = (immediateNextTime - tapInTime) / (1000 * 60);

      orphanTaps.push(tapIn);

      if (tapIn.is_deferred_to_next) {
        flags.push({
          code: 'B01',
          level: 'yellow',
          title: 'Shift Malam Jumat (Diteruskan ke Minggu Depan)',
          description: `Tap ${tapIn.timestamp.replace('T', ' ')} ditandai untuk dihitung pada periode berikutnya.`,
        });
      } else if (tapIn.is_settled_in_previous) {
        flags.push({
          code: 'B02',
          level: 'yellow',
          title: 'Tap Keluar Shift Jumat Lalu (Sudah Selesai)',
          description: `Tap ${tapIn.timestamp.replace('T', ' ')} telah diselesaikan pada slip periode sebelumnya.`,
        });
      } else {
        const boundary = getBoundaryShiftInfo(tapIn, period);
        if (boundary.isBoundary && boundary.type === 'FRIDAY_NIGHT_FORWARD') {
          flags.push({
            code: 'B01',
            level: 'yellow',
            title: 'Potensi Shift Malam Jumat (Lintas Periode)',
            description: `Tap masuk Jumat malam (${tapIn.timestamp.replace('T', ' ')}). Kemungkinan check-out Sabtu pagi periode berikutnya. Anda dapat mengunggah file minggu depan atau tandai "Bawa ke Minggu Depan".`,
          });
        } else if (boundary.isBoundary && boundary.type === 'SATURDAY_MORNING_PREVIOUS') {
          flags.push({
            code: 'B02',
            level: 'yellow',
            title: 'Potensi Tap Keluar Shift Jumat Lalu',
            description: `Tap Sabtu pagi (${tapIn.timestamp.replace('T', ' ')}). Kemungkinan tap keluar shift Jumat malam minggu lalu. Unggah file minggu lalu atau tandai "Sudah Dihitung Minggu Lalu".`,
          });
        } else if (durHours < settings.session_min_hours) {
          // Short interval jitter tap (< 1 hour) with no subsequent checkout found
          flags.push({
            code: 'R03',
            level: 'red',
            title: 'Durasi Sesi di Bawah Batas Minimum',
            description: `Sesi ${tapIn.timestamp.replace('T', ' ')} ke ${immediateNext.timestamp.replace('T', ' ')} hanya ${durMinutes.toFixed(0)} menit (< ${settings.session_min_hours} jam). Fase direset.`,
          });
        } else {
          // Exceeds max hours or single orphan tap
          flags.push({
            code: 'R01',
            level: 'red',
            title: 'Tak Berpasangan / Durasi Melebihi Batas',
            description: `Tap ${tapIn.timestamp.replace('T', ' ')} ke ${immediateNext.timestamp.replace('T', ' ')} berdurasi ${durHours.toFixed(1)} jam (> ${settings.session_max_hours} jam). Fase direset.`,
          });
        }
      }

      i += 1; // Phase reset
    }
  }

  return { sessions, orphanTaps, flags };
}

/**
 * Process single employee recap calculation
 */
export function processEmployeeRecap(
  employee: Employee,
  allRawTaps: RawTap[],
  machineMappings: MachineMapping[],
  period: PeriodConfig,
  settings: SystemSettings,
  manualSessionsOverride?: WorkSession[],
  attendanceNote?: string
): EmployeeRecap {
  const periodDates = getPeriodDates(period.startDate);
  const employeeMappings = machineMappings.filter((m) => m.employee_id === employee.employee_id);

  // Find all raw taps that map to this employee
  const employeeRawTaps = allRawTaps.filter((tap) => {
    if (tap.employee_id === employee.employee_id) return true;
    if (employee.unmapped_raw_id && tap.machine_user_id === employee.unmapped_raw_id) return true;
    return employeeMappings.some(
      (m) => m.machine_id === tap.machine_id && m.machine_user_id === tap.machine_user_id
    );
  });

  // Collect machines used
  const machinesUsed = Array.from(new Set(employeeRawTaps.map((t) => t.machine_id))).filter(Boolean);

  // Dedup taps
  const dedupedTaps = dedupTaps(employeeRawTaps, settings.dedup_window_minutes);
  const activeTaps = dedupedTaps.filter((t) => !t.is_deduped);

  let sessions: WorkSession[] = [];
  let flags: FlagBadge[] = [];
  let orphanTapsCount = 0;

  // Check R04: Karyawan baru / belum terdaftar di master data
  if (employee.is_unmapped_new_name || employee.employee_id.startsWith('UNMAPPED_')) {
    flags.push({
      code: 'R04',
      level: 'red',
      title: 'Nama Baru Belum Terdaftar di Master',
      description: `Nama/ID '${employee.unmapped_raw_id || employee.nama}' ditemukan pada file yang diunggah tetapi belum terdaftar di Master Data Karyawan. Perlu penyesuaian (daftarkan ke master / petakan ID mesin) atau hapus baris nama ini jika tidak valid.`,
    });
  }

  if (manualSessionsOverride) {
    // If HR manually created or edited sessions for this employee
    sessions = manualSessionsOverride;
  } else {
    // Automatic engine
    const engineResult = formSessionsWithPhaseReset(activeTaps, employee.employee_id, settings, period);
    sessions = engineResult.sessions;
    flags = [...flags, ...engineResult.flags];
    orphanTapsCount = engineResult.orphanTaps.length;
  }

  // Check Y05: Karyawan nol tap sepanjang periode (Tandai Oranye / Opsional Catatan)
  if (employee.status === 'aktif' && activeTaps.length === 0 && sessions.length === 0) {
    flags.push({
      code: 'Y05',
      level: 'yellow',
      title: 'Karyawan Tanpa Tap (Cuti / Sakit / Izin)',
      description: `Karyawan tidak memiliki tap absensi pada periode ${period.startDate} s.d. ${period.endDate}. Anda dapat menambahkan keterangan kehadiran (misal: Cuti Melahirkan, Cuti Tahunan, Sakit, dll) secara opsional.`,
    });
  }

  // Check R05: Ada tap tapi total_H = 0
  const sumH = sessions.reduce((acc, s) => acc + s.H, 0);
  if (activeTaps.length > 0 && sumH === 0 && sessions.length === 0) {
    flags.push({
      code: 'R05',
      level: 'red',
      title: 'Ada Tap Tapi Total H = 0',
      description: 'Ditemukan tap absensi namun tidak menghasilkan sesi kerja valid.',
    });
  }

  // Build daily breakdown
  const daily_breakdown: Record<string, DailyBreakdown> = {};
  for (const dStr of periodDates) {
    daily_breakdown[dStr] = {
      date: dStr,
      dayName: getIndonesianDayName(dStr),
      H: 0,
      L: 0,
      sessions: [],
    };
  }

  for (const session of sessions) {
    if (daily_breakdown[session.date_str]) {
      daily_breakdown[session.date_str].H += session.H;
      daily_breakdown[session.date_str].L += session.L;
      daily_breakdown[session.date_str].sessions.push(session);
    }
  }

  // Check Y02: Total H melebihi 1,00 dalam satu tanggal kalender
  for (const [dateKey, dayData] of Object.entries(daily_breakdown)) {
    if (dayData.H > 1.001) {
      flags.push({
        code: 'Y02',
        level: 'yellow',
        title: 'Total H > 1,00 dalam 1 Hari',
        description: `Pada tanggal ${dateKey} (${dayData.dayName}), total H mencapai ${dayData.H.toFixed(2)} (> 1.00) dari ${dayData.sessions.length} sesi.`,
      });
    }
  }

  // Check Y04: Karyawan punya tap di lebih dari satu mesin
  if (machinesUsed.length > 1) {
    flags.push({
      code: 'Y04',
      level: 'yellow',
      title: 'Tap di Lebih dari 1 Mesin',
      description: `Karyawan tercatat melakukan tap di ${machinesUsed.length} mesin (${machinesUsed.join(', ')}). Pastikan bukan tabrakan ID.`,
    });
  }

  // Calculate totals
  const total_H = sessions.reduce((acc, s) => acc + s.H, 0);
  const total_L = sessions.reduce((acc, s) => acc + s.L, 0);

  // Rounded formula according to specification:
  // honor = ROUND(total_H,2) * upah_harian + ROUND(total_L,2) * upah_lembur_per_jam
  const rounded_H = Math.round(total_H * 100) / 100;
  const rounded_L = Math.round(total_L * 100) / 100;
  const total_honor = rounded_H * employee.upah_harian + rounded_L * employee.upah_lembur_per_jam;

  // Check Y01: Total honor beda > VARIANCE_THRESHOLD % dari periode sebelumnya
  if (employee.previous_period_honor && employee.previous_period_honor > 0) {
    const diff = Math.abs(total_honor - employee.previous_period_honor);
    const pct = (diff / employee.previous_period_honor) * 100;
    if (pct > settings.variance_threshold_percent) {
      flags.push({
        code: 'Y01',
        level: 'yellow',
        title: 'Variansi Honor > Ambang Batas',
        description: `Honor periode ini (${formatRupiah(total_honor)}) berbeda ${pct.toFixed(0)}% dari periode sebelumnya (${formatRupiah(employee.previous_period_honor)}).`,
      });
    }
  }

  // Determine overall status color
  const hasRed = flags.some((f) => f.level === 'red');
  const hasYellow = flags.some((f) => f.level === 'yellow');
  const status_color = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';

  return {
    employee,
    total_H,
    total_L,
    total_honor,
    total_taps: activeTaps.length,
    orphan_taps_count: orphanTapsCount,
    sessions,
    raw_taps: dedupedTaps,
    daily_breakdown,
    flags,
    status_color,
    machines_used: machinesUsed,
    attendance_note: attendanceNote,
  };
}

/**
 * Check unmapped taps (R04) across all raw taps
 */
export function findUnmappedTaps(rawTaps: RawTap[], machineMappings: MachineMapping[]): RawTap[] {
  return rawTaps.filter((tap) => {
    if (tap.employee_id) return false;
    const match = machineMappings.find(
      (m) => m.machine_id === tap.machine_id && m.machine_user_id === tap.machine_user_id
    );
    return !match;
  });
}

/**
 * Validate date completeness across uploaded data
 */
export function validateDateCompleteness(period: PeriodConfig, allTaps: RawTap[]): { isComplete: boolean; missingDates: string[] } {
  const periodDates = getPeriodDates(period.startDate);
  const tapDates = new Set(allTaps.map((t) => formatDate(new Date(t.timestamp))));

  const missingDates = periodDates.filter((d) => !tapDates.has(d));
  return {
    isComplete: missingDates.length === 0,
    missingDates,
  };
}
