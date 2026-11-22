import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Flame, HeartHandshake, Minus, Plus, Sparkles } from 'lucide-react';
import type { MemberUser, SaturdayMdoRecord } from '../types/portal';
import { AnimatedCounter } from './reactbits/AnimatedCounter';
import { GlassIconBadge } from './reactbits/GlassIconBadge';
import { SpotlightCard } from './reactbits/SpotlightCard';

interface DevotionalTabProps {
  activeUser: MemberUser;
  isLeader: boolean;
  members: MemberUser[];
  saturdayDate: string;
  records: SaturdayMdoRecord[];
  onSaveSaturdayMdo: (record: SaturdayMdoRecord) => void;
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function DevotionalTab({
  activeUser,
  isLeader,
  members,
  saturdayDate,
  records,
  onSaveSaturdayMdo,
}: DevotionalTabProps) {
  const [targetUserId, setTargetUserId] = useState<string>(activeUser.id);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const effectiveUserId = isLeader ? targetUserId : activeUser.id;
  const targetMember = members.find((m) => m.id === effectiveUserId) ?? activeUser;

  const existing = records.find(
    (r) => r.userId === effectiveUserId && r.saturdayDate === saturdayDate,
  );

  const [meditationDays, setMeditationDays] = useState<number>(existing?.meditationDays ?? 0);
  const [memorizedVerses, setMemorizedVerses] = useState<number>(existing?.memorizedVerses ?? 0);
  const [prayerDays, setPrayerDays] = useState<number>(existing?.prayerDays ?? 0);

  useEffect(() => {
    const rec = records.find(
      (r) => r.userId === effectiveUserId && r.saturdayDate === saturdayDate,
    );
    setMeditationDays(rec?.meditationDays ?? 0);
    setMemorizedVerses(rec?.memorizedVerses ?? 0);
    setPrayerDays(rec?.prayerDays ?? 0);
    setSavedNotice(null);
  }, [effectiveUserId, saturdayDate, records]);

  const clampVerses = (val: number) => Math.max(0, Math.min(70, Math.round(val || 0)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: SaturdayMdoRecord = {
      id: existing?.id ?? `smdo-${effectiveUserId}-${saturdayDate}`,
      userId: effectiveUserId,
      saturdayDate,
      meditationDays: Math.max(0, Math.min(5, meditationDays)),
      memorizedVerses: clampVerses(memorizedVerses),
      prayerDays: Math.max(0, Math.min(5, prayerDays)),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    onSaveSaturdayMdo(record);
    setSavedNotice(`MDO de ${targetMember.name.split(' ')[0]} salvo para ${formatDateBr(saturdayDate)}.`);
  };

  const versesOk = memorizedVerses >= 5;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">MDO do Sábado</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Informe seus 3 números do sábado ({formatDateBr(saturdayDate)}): Meditação (0 a 5),
            Versículos decorados (mínimo 5, até 70) e Oração (0 a 5).
          </p>
        </div>

        {isLeader && (
          <div className="w-full sm:w-64">
            <label htmlFor="mdo-member" className="block text-xs font-medium text-zinc-300">
              Lançar para membro
            </label>
            <select
              id="mdo-member"
              value={effectiveUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-sm text-white focus:border-[#0095FF] focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === activeUser.id ? '(Você)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* M — Dias Meditados (0 a 5) */}
          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <GlassIconBadge icon={BookOpen} tone="blue" />
                <div>
                  <span className="font-mono-tech text-xs font-semibold text-[#38BDF8]">
                    M · 0 a 5
                  </span>
                  <h2 className="section-title">Dias meditados</h2>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={meditationDays} />
                  <span className="font-mono-tech text-sm font-normal text-zinc-500">/5</span>
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    meditationDays === 5
                      ? 'text-emerald-400'
                      : meditationDays === 0
                        ? 'text-zinc-500'
                        : 'text-[#F5C41E]'
                  }`}
                >
                  {meditationDays === 5
                    ? 'Feita (5 dias)'
                    : meditationDays === 0
                      ? 'Não feita'
                      : 'Em progresso'}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => {
                const active = meditationDays === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMeditationDays(n)}
                    className={`font-mono-tech min-h-[44px] rounded-lg border text-sm font-semibold transition ${
                      active
                        ? 'btn-rb-primary border-[#0095FF] text-white'
                        : 'btn-rb-surface border-white/12 bg-[#0B0C0F] text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              0 = não fez na semana · 5 = fez todos os dias.
            </p>
          </SpotlightCard>

          {/* D — Versículos Decorados (mínimo 5, máximo 70) */}
          <SpotlightCard
            spotlightColor={versesOk ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 196, 30, 0.14)'}
            className="group rounded-xl border border-white/10 bg-[#12141A] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <GlassIconBadge
                  icon={Sparkles}
                  tone={versesOk ? 'emerald' : 'gold'}
                />
                <div>
                  <span
                    className={`font-mono-tech text-xs font-semibold ${
                      versesOk ? 'text-emerald-400' : 'text-[#F5C41E]'
                    }`}
                  >
                    D · mín. 5 / máx. 70
                  </span>
                  <h2 className="section-title">Versículos decorados</h2>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={memorizedVerses} />
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    versesOk ? 'text-emerald-400' : 'text-[#F5C41E]'
                  }`}
                >
                  {versesOk
                    ? 'Mínimo atingido'
                    : `Faltam ${5 - memorizedVerses} para 5`}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                aria-label="Diminuir versículo"
                onClick={() => setMemorizedVerses((v) => clampVerses(v - 1))}
                className="btn-rb-surface inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 bg-[#0B0C0F] text-white"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                min={0}
                max={70}
                aria-label="Quantidade de versículos decorados"
                value={memorizedVerses}
                onChange={(e) => setMemorizedVerses(clampVerses(Number(e.target.value)))}
                className="font-mono-tech min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-center text-base font-semibold text-white focus:border-[#0095FF] focus:outline-none"
              />

              <button
                type="button"
                aria-label="Aumentar versículo"
                onClick={() => setMemorizedVerses((v) => clampVerses(v + 1))}
                className="btn-rb-surface inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 bg-[#0B0C0F] text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[0, 5, 10, 20, 40, 70].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMemorizedVerses(preset)}
                  className={`font-mono-tech rounded-md border px-2 py-1 text-xs font-medium transition ${
                    memorizedVerses === preset
                      ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </SpotlightCard>

          {/* O — Orações (0 a 5) */}
          <SpotlightCard className="group rounded-xl border border-white/10 bg-[#12141A] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <GlassIconBadge icon={HeartHandshake} tone="blue" />
                <div>
                  <span className="font-mono-tech text-xs font-semibold text-[#38BDF8]">
                    O · 0 a 5
                  </span>
                  <h2 className="section-title">Orações</h2>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={prayerDays} />
                  <span className="font-mono-tech text-sm font-normal text-zinc-500">/5</span>
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    prayerDays === 5
                      ? 'text-emerald-400'
                      : prayerDays === 0
                        ? 'text-zinc-500'
                        : 'text-[#F5C41E]'
                  }`}
                >
                  {prayerDays === 5
                    ? 'Feita (5 dias)'
                    : prayerDays === 0
                      ? 'Não feita'
                      : 'Em progresso'}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => {
                const active = prayerDays === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPrayerDays(n)}
                    className={`font-mono-tech min-h-[44px] rounded-lg border text-sm font-semibold transition ${
                      active
                        ? 'btn-rb-primary border-[#0095FF] text-white'
                        : 'btn-rb-surface border-white/12 bg-[#0B0C0F] text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              0 = não fez · 5 = fez todos os dias da semana.
            </p>
          </SpotlightCard>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {savedNotice ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{savedNotice}</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Registrando para <strong className="text-zinc-200">{targetMember.name}</strong> · Sábado{' '}
              {formatDateBr(saturdayDate)}
            </p>
          )}

          <button
            type="submit"
            className="btn-rb-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Salvar MDO do sábado</span>
          </button>
        </div>
      </form>

      {/* Resumo da equipe no sábado */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#F5C41E]" />
            <h2 className="section-title">
              MDO da equipe — {formatDateBr(saturdayDate)}
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Meta completa: M 5/5 · D mín. 5 · O 5/5
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const rec = records.find(
              (r) => r.userId === member.id && r.saturdayDate === saturdayDate,
            );
            const m = rec?.meditationDays ?? 0;
            const d = rec?.memorizedVerses ?? 0;
            const o = rec?.prayerDays ?? 0;
            const allOk = m === 5 && d >= 5 && o === 5;

            return (
              <div
                key={member.id}
                className={`rounded-lg border p-3.5 ${
                  allOk
                    ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
                    : 'border-white/10 bg-[#0B0C0F]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {member.name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                      allOk
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : rec
                          ? 'bg-[#F5C41E]/15 text-[#F5C41E]'
                          : 'bg-white/5 text-zinc-500'
                    }`}
                  >
                    {allOk ? 'Completo' : rec ? 'Registrado' : 'Pendente'}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded border border-white/8 bg-[#12141A] py-1.5">
                    <span className="block text-[10px] text-zinc-400">Meditação</span>
                    <span className="font-mono-tech font-semibold text-white">{m}/5</span>
                  </div>
                  <div className="rounded border border-white/8 bg-[#12141A] py-1.5">
                    <span className="block text-[10px] text-zinc-400">Versículos</span>
                    <span
                      className={`font-mono-tech font-semibold ${
                        d >= 5 ? 'text-emerald-300' : 'text-[#F5C41E]'
                      }`}
                    >
                      {d}
                    </span>
                  </div>
                  <div className="rounded border border-white/8 bg-[#12141A] py-1.5">
                    <span className="block text-[10px] text-zinc-400">Oração</span>
                    <span className="font-mono-tech font-semibold text-white">{o}/5</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
