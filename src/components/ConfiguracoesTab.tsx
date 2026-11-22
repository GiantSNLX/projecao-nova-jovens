import { useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, Unlock } from 'lucide-react';
import type {
  ProgrammingTeam,
  ScreenCode,
  ServiceState,
} from '../types/portal';
import { TEAM_LABELS } from '../data/initialState';

interface ConfiguracoesTabProps {
  state: ServiceState;
  isLeader: boolean;
  onChangeTeam: (team: ProgrammingTeam) => void;
  onUpdateScreen: (code: ScreenCode, widthPx: number, heightPx: number) => void;
  onToggleFreeze: (reason?: string) => void;
  onToggleApproveSong: (songId: string) => void;
  onToggleApproveMedia: (assetId: string) => void;
  onResetDemo: () => void;
}

export function ConfiguracoesTab({
  state,
  isLeader,
  onChangeTeam,
  onUpdateScreen,
  onToggleFreeze,
  onToggleApproveSong,
  onToggleApproveMedia,
  onResetDemo,
}: ConfiguracoesTabProps) {
  const [freezeReason, setFreezeReason] = useState('');

  const pendingSongs = state.songs.filter((s) => !s.approved);
  const pendingMedia = state.mediaAssets.filter((m) => !m.approved);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Resoluções dos telões, equipe da semana, prazo de envio e histórico de alterações.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
            isLeader
              ? 'border-[#F5C41E]/35 bg-[#F5C41E]/10 text-[#F5C41E]'
              : 'border-white/12 text-zinc-400'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{isLeader ? 'Status: Liderança (edição liberada)' : 'Somente leitura'}</span>
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equipe da semana + Trava de envios */}
        <section className="space-y-5 rounded-xl border border-white/10 bg-[#12141A] p-5">
          <div>
            <h2 className="text-base font-semibold text-white">Programação da semana</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Equipe responsável por enviar o roteiro e as mídias deste culto.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['ALPHA', 'BRAVO', 'CHARLIE'] as ProgrammingTeam[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!isLeader}
                  onClick={() => onChangeTeam(t)}
                  className={`min-h-[44px] rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60 ${
                    state.programmingTeam === t
                      ? 'border-[#0095FF] bg-[#0095FF] text-white'
                      : 'border-white/12 bg-[#0B0C0F] text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {TEAM_LABELS[t].name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h2 className="text-base font-semibold text-white">Prazo de envio</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {state.isFrozen
                ? 'Envios travados. Música e Programação não podem alterar arquivos.'
                : `Envios abertos. Prazo padrão: ${state.cutoffLabel}.`}
            </p>

            {isLeader && (
              <>
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className="mt-3 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => {
                    onToggleFreeze(freezeReason.trim() || undefined);
                    setFreezeReason('');
                  }}
                  className={`mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
                    state.isFrozen
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-[#F5C41E]/40 bg-[#F5C41E]/15 text-[#F5C41E] hover:bg-[#F5C41E]/25'
                  }`}
                >
                  {state.isFrozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span>{state.isFrozen ? 'Reabrir envios' : 'Travar envios agora'}</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Resoluções dos 3 telões */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
          <h2 className="text-base font-semibold text-white">Resoluções dos 3 telões (16:9)</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Valores usados no Simulador de Palco para conferir qualidade e proporção.
          </p>
          <div className="mt-4 space-y-3">
            {state.screens.map((scr) => (
              <div
                key={scr.code}
                className="grid grid-cols-1 gap-2 rounded-lg border border-white/8 bg-[#0B0C0F] p-3 sm:grid-cols-3 sm:items-center"
              >
                <span className="text-sm font-medium text-white">{scr.label}</span>
                <input
                  type="number"
                  disabled={!isLeader}
                  aria-label={`Largura ${scr.label}`}
                  value={scr.widthPx}
                  onChange={(e) =>
                    onUpdateScreen(scr.code, Number(e.target.value) || scr.widthPx, scr.heightPx)
                  }
                  className="font-mono-tech min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white disabled:opacity-60"
                />
                <input
                  type="number"
                  disabled={!isLeader}
                  aria-label={`Altura ${scr.label}`}
                  value={scr.heightPx}
                  onChange={(e) =>
                    onUpdateScreen(scr.code, scr.widthPx, Number(e.target.value) || scr.heightPx)
                  }
                  className="font-mono-tech min-h-[44px] rounded-lg border border-white/12 bg-[#12141A] px-3 text-base text-white disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Aprovações pendentes */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
        <h2 className="text-base font-semibold text-white">
          Aprovações pendentes ({pendingSongs.length + pendingMedia.length})
        </h2>

        {pendingSongs.length === 0 && pendingMedia.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            Todas as músicas e mídias desta semana já estão aprovadas.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-white/8">
            {pendingSongs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <span className="text-sm font-medium text-white">Música: {s.title}</span>
                  <span className="ml-2 text-xs text-zinc-400">por {s.addedBy}</span>
                </div>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => onToggleApproveSong(s.id)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0095FF] px-3.5 text-xs font-semibold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Aprovar</span>
                  </button>
                )}
              </div>
            ))}
            {pendingMedia.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <span className="text-sm font-medium text-white">
                    Mídia: {m.normalizedFilename}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">por {m.uploadedBy}</span>
                </div>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => onToggleApproveMedia(m.id)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0095FF] px-3.5 text-xs font-semibold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Aprovar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Histórico simples de alterações */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-white">Histórico recente da equipe</h2>
          {isLeader && (
            <button
              type="button"
              onClick={onResetDemo}
              className="min-h-[44px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              Restaurar dados iniciais
            </button>
          )}
        </div>

        <div className="mt-3 divide-y divide-white/8">
          {state.auditLogs.slice(0, 12).map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:justify-between"
            >
              <div>
                <span className="font-mono-tech mr-2 text-xs text-zinc-500">{log.timestamp}</span>
                <span className="font-medium text-white">{log.actorName}</span>
                <span className="ml-1.5 text-zinc-400">{log.detail}</span>
                {log.reason && <span className="ml-2 text-xs text-[#F5C41E]">({log.reason})</span>}
              </div>
              <span className="text-xs text-zinc-500">{log.action}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
