import React, { useState } from 'react';
import {
  ShieldAlert,
  FileSpreadsheet,
  Users,
  Settings as SettingsIcon,
  FileCheck,
  History,
  Lock,
  Unlock,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Clock,
  Building2,
} from 'lucide-react';
import { PeriodConfig } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'upload' | 'rekap' | 'master' | 'audit' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'upload' | 'rekap' | 'master' | 'audit' | 'settings') => void;
  period: PeriodConfig;
  isLocked: boolean;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  onLoadSampleData: () => void;
}

interface NavItem {
  id: 'dashboard' | 'upload' | 'rekap' | 'master' | 'audit' | 'settings';
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { count: number; color: string };
}

export const Sidebar: React.FC<HeaderProps & { isMobileOpen: boolean; setIsMobileOpen: (open: boolean) => void }> = ({
  activeTab,
  setActiveTab,
  period,
  isLocked,
  redCount,
  yellowCount,
  onLoadSampleData,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Tinjauan',
      sublabel: 'Human-in-the-Loop',
      icon: ShieldAlert,
      badge: redCount > 0 ? { count: redCount, color: 'bg-rose-500 text-white animate-pulse' } : yellowCount > 0 ? { count: yellowCount, color: 'bg-amber-500 text-slate-950 font-bold' } : undefined,
    },
    {
      id: 'upload',
      label: 'Upload & Periode',
      sublabel: 'Impor File Fingerprint',
      icon: FileSpreadsheet,
    },
    {
      id: 'rekap',
      label: 'Rekap Akhir & Output',
      sublabel: 'Slip & Ekspor Excel',
      icon: FileCheck,
    },
    {
      id: 'master',
      label: 'Master Karyawan',
      sublabel: 'Pemetaan ID Mesin',
      icon: Users,
    },
    {
      id: 'audit',
      label: 'Log Audit HR',
      sublabel: 'Jejak Perubahan',
      icon: History,
    },
    {
      id: 'settings',
      label: 'Pengaturan Parameter',
      sublabel: 'Ambang & Formula',
      icon: SettingsIcon,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200 select-none shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-blue-100">
            SA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-slate-900">PR SEKAR ANOM</span>
            </div>
            <p className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
              PAYROLL SYSTEM
            </p>
          </div>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Menu Navigasi
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <div className="truncate">
                  <div className={`text-xs leading-tight ${isActive ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {item.sublabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badge.color} shrink-0 ml-2`}
                >
                  {item.badge.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 text-xs space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span className="font-medium">Versi Engine</span>
          <span className="font-mono bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
            v1.0-hitl
          </span>
        </div>

        <button
          onClick={onLoadSampleData}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Muat Data Contoh</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export const TopBar: React.FC<HeaderProps & { onOpenMobileMenu: () => void }> = ({
  period,
  isLocked,
  redCount,
  yellowCount,
  onLoadSampleData,
  onOpenMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-5 lg:px-6 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Period Widget */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Periode:
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {period.startDate} <span className="text-slate-500 font-normal">s.d.</span> {period.endDate}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Status Lock Pill */}
        {isLocked ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Periode Terkunci</span>
            <span className="sm:hidden">Terkunci</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Draf Terbuka</span>
            <span className="sm:hidden">Draf</span>
          </div>
        )}

        {/* Quick Sample Button */}
        <button
          onClick={onLoadSampleData}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
          title="Muat data contoh 15-21 Agustus 2026"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Data Contoh</span>
        </button>
      </div>
    </header>
  );
};
