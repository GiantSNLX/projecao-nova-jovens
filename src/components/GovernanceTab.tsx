import { useState } from 'react';
import { Database, History, Lock, Monitor, ShieldCheck, Unlock } from 'lucide-react';
import type { Role, ScreenCode, ServiceState, StageScreen } from '../types/portal';

interface GovernanceTabProps {
  state: ServiceState;
  activeRole: Role;
  onUpdateScreen: (code: ScreenCode, widthPx: number, heightPx: number) => void;
  onToggleFreeze: (reason?: string) => void;
}

export function GovernanceTab({
  state,
  activeRole,
  onUpdateScreen,
  onToggleFreeze,
}: GovernanceTabProps) {
  const isAdmin = activeRole === 'ADMIN';
  const isCaptainOrAdmin = activeRole === 'ADMIN' || activeRole === 'CAPTAIN';
  const [freezeReason, setFreezeReason] = useState('');

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Stage Screen Resolution Config */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-6 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-[#0095FF]" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Configuração dos 3 Telões (Padrão 16:9)
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Alimenta o Simulador de Palco e os alertas automáticos de resolução no upload.
          </p>

          <div className="mt-4 space-y-3">
            {state.screens.map((scr: StageScreen) => (
              <div
                key={scr.code}
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-white/10 dark:bg-[#171B24]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {scr.label}
                  </span>
                  <span className="font-mono-tech text-xs text-[#38BDF8]">{scr.aspectRatio}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`w-${scr.code}`}
                      className="block text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Largura (px)
                    </label>
                    <input
                      id={`w-${scr.code}`}
                      type="number"
                      disabled={!isAdmin}
                      value={scr.widthPx}
                      onChange={(e) =>
                        onUpdateScreen(scr.code, Number(e.target.value) || scr.widthPx, scr.heightPx)
                      }
                      className="font-mono-tech mt-1 min-h-[44px] w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-base text-zinc-900 disabled:opacity-60 dark:border-white/15 dark:bg-[#0E1117] dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`h-${scr.code}`}
                      className="block text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Altura (px)
                    </label>
                    <input
                      id={`h-${scr.code}`}
                      type="number"
                      disabled={!isAdmin}
                      value={scr.heightPx}
                      onChange={(e) =>
                        onUpdateScreen(scr.code, scr.widthPx, Number(e.target.value) || scr.heightPx)
                      }
                      className="font-mono-tech mt-1 min-h-[44px] w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-base text-zinc-900 disabled:opacity-60 dark:border-white/15 dark:bg-[#0E1117] dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cutoff & Freeze Control */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-6 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#F5C41E]" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Trava de Prazo (Cutoff) e Governança
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Quando travado, Música e Programação não alteram arquivos sem liberação do Capitão/Admin.
          </p>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              state.isFrozen
                ? 'border-[#F5C41E]/40 bg-[#F5C41E]/10'
                : 'border-emerald-500/35 bg-emerald-500/10'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
              {state.isFrozen ? (
                <Lock className="h-4 w-4 text-[#F5C41E]" />
              ) : (
                <Unlock className="h-4 w-4 text-emerald-400" />
              )}
              <span>
                Status: {state.isFrozen ? 'Culto TRAVADO (Somente revisão)' : 'Aberto para envios'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Janela oficial configurada: {state.cutoffLabel}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="freeze-reason"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Motivo registrado no log de auditoria
              </label>
              <input
                id="freeze-reason"
                type="text"
                disabled={!isCaptainOrAdmin}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Ex.: Liberação excepcional para vídeo de aviso atualizado"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 disabled:opacity-50 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <button
              type="button"
              disabled={!isCaptainOrAdmin}
              onClick={() => {
                onToggleFreeze(freezeReason.trim() || undefined);
                setFreezeReason('');
              }}
              className={`min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-45 ${
                state.isFrozen
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#F5C41E] text-zinc-950 hover:bg-[#E0B317]'
              }`}
            >
              {state.isFrozen ? 'Reabrir Envios (Override)' : 'Travar Envios Agora (Freeze)'}
            </button>
          </div>
        </section>
      </div>

      {/* Audit Log */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#0095FF]" />
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Log de Auditoria Operacional ({state.auditLogs.length})
          </h3>
        </div>
        <div className="mt-4 space-y-2">
          {state.auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#171B24]"
            >
              <div>
                <span className="font-mono-tech mr-2 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-white/10">
                  {log.timestamp}
                </span>
                <strong className="text-zinc-950 dark:text-white">{log.actorName}</strong>
                <span className="mx-1.5 text-zinc-400">·</span>
                <span className="text-zinc-700 dark:text-zinc-300">{log.detail}</span>
                {log.reason && (
                  <span className="ml-2 text-xs text-[#F5C41E]">({log.reason})</span>
                )}
              </div>
              <span className="font-mono-tech shrink-0 text-xs text-[#38BDF8]">{log.action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture & Database Schema Reference Card */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[#0095FF]" />
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Arquitetura e Modelagem do Banco de Dados
          </h3>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Entidades prontas para persistência em SQLite/PostgreSQL sem dependência de Docker.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'users & user_roles', cols: 'id, name, roles[], programming_team' },
            { name: 'stage_screens & media_specs', cols: 'LEFT/RIGHT 3200×1800, CENTER 3840×2160' },
            { name: 'services & service_assignments', cols: 'CAPITAO, PRINCIPAL, RETORNO, CORTE, APOIO + desk_checkin' },
            { name: 'service_run_items & media_assets', cols: 'roteiro, validação Holyrics, target_screen, .zip' },
            { name: 'songs & service_songs', cols: 'raw_lyrics, holyrics_txt (2–4 linhas), approved' },
            { name: 'mdo_entries & saturday_verses', cols: 'MDO semanal + spoken_to_user_id (LGPD)' },
            { name: 'service_packages', cols: 'histórico de pacotes .zip e manifesto JSON' },
            { name: 'audit_logs', cols: 'actor, action, entity, reason, timestamp' },
          ].map((tbl) => (
            <div
              key={tbl.name}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-white/10 dark:bg-[#171B24]"
            >
              <div className="font-mono-tech text-xs font-semibold text-[#0095FF]">{tbl.name}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{tbl.cols}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
