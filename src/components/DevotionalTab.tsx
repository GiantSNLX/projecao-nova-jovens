import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Minus, Plus } from 'lucide-react';
import type { MemberUser, SaturdayMdoRecord } from '../types/portal';

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

function isProjectionMember(m: MemberUser): boolean {
  if (!m.active) return false;
  if (m.roles.includes('MUSIC') || m.roles.includes('PROGRAMMING')) {
    return m.roles.includes('ADMIN') || m.roles.includes('CAPTAIN');
  }
  return true;
}

export function DevotionalTab({
  activeUser,
  isLeader,
  members,
  saturdayDate,
  records,
  onSaveSaturdayMdo,
}: DevotionalTabProps) {
  const projectionMembers = useMemo(
    () => members.filter(isProjectionMember),
    [members],
  );

  const userIsFromProjection = isProjectionMember(activeUser);

  const myExisting = records.find(
    (r) => r.userId === activeUser.id && r.saturdayDate === saturdayDate,
  );

  const [present, setPresent] = useState<boolean>(myExisting?.present ?? true);
  const [meditationDays, setMeditationDays] = useState<number>(
    myExisting?.meditationDays ?? 0,
  );
  const [memorizedVerses, setMemorizedVerses] = useState<number>(
    myExisting?.memorizedVerses ?? 5,
  );
  const [prayerDays, setPrayerDays] = useState<number>(myExisting?.prayerDays ?? 0);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const rec = records.find(
      (r) => r.userId === activeUser.id && r.saturdayDate === saturdayDate,
    );
    setPresent(rec?.present ?? true);
    setMeditationDays(rec?.meditationDays ?? 0);
    setMemorizedVerses(rec?.memorizedVerses ?? 5);
    setPrayerDays(rec?.prayerDays ?? 0);
  }, [activeUser.id, saturdayDate, records]);

  const clampVerses = (val: number) => Math.max(0, Math.min(70, Math.round(val || 0)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSaturdayMdo({
      id: myExisting?.id ?? `smdo-${activeUser.id}-${saturdayDate}`,
      userId: activeUser.id,
      saturdayDate,
      present,
      meditationDays: Math.max(0, Math.min(5, meditationDays)),
      memorizedVerses: clampVerses(memorizedVerses),
      prayerDays: Math.max(0, Math.min(5, prayerDays)),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const updateMemberRecord = (
    memberId: string,
    patch: Partial<Pick<SaturdayMdoRecord, 'present' | 'meditationDays' | 'memorizedVerses' | 'prayerDays'>>,
  ) => {
    const existing = records.find(
      (r) => r.userId === memberId && r.saturdayDate === saturdayDate,
    );
    onSaveSaturdayMdo({
      id: existing?.id ?? `smdo-${memberId}-${saturdayDate}`,
      userId: memberId,
      saturdayDate,
      present: patch.present ?? existing?.present ?? true,
      meditationDays: Math.max(
        0,
        Math.min(5, patch.meditationDays ?? existing?.meditationDays ?? 0),
      ),
      memorizedVerses: clampVerses(
        patch.memorizedVerses ?? existing?.memorizedVerses ?? 0,
      ),
      prayerDays: Math.max(
        0,
        Math.min(5, patch.prayerDays ?? existing?.prayerDays ?? 0),
      ),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };

  // For regular members, show only submitted rows from projection members; for Leaders, show all projection members so they can launch/edit anyone
  const tableRows = useMemo(() => {
    if (isLeader) {
      return projectionMembers.map((member) => {
        const rec = records.find(
          (r) => r.userId === member.id && r.saturdayDate === saturdayDate,
        );
        return { member, rec };
      });
    }
    return projectionMembers
      .map((member) => ({
        member,
        rec: records.find(
          (r) => r.userId === member.id && r.saturdayDate === saturdayDate,
        ),
      }))
      .filter((row) => row.rec !== undefined);
  }, [isLeader, projectionMembers, records, saturdayDate]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">Controle de Meditação</h1>
        <span className="font-mono-tech text-xs text-zinc-400">
          Projeção · Sábado {formatDateBr(saturdayDate)}
        </span>
      </div>

      {/* Formulário individual (somente para quem é da Projeção) */}
      {userIsFromProjection ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-[#12141A] p-5 space-y-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Seu MDO ({activeUser.name.split(' ')[0]})</h2>

            <button
              type="button"
              role="switch"
              aria-checked={present}
              onClick={() => setPresent((p) => !p)}
              className={`btn-rb-surface inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition ${
                present
                  ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/12 bg-[#0B0C0F] text-zinc-400'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                  present
                    ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {present && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </span>
              <span>{present ? 'Presente' : 'Ausente'}</span>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* M — Dias meditados (0 a 5) */}
            <div className="rounded-lg border border-white/10 bg-[#0B0C0F] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">M — Dias meditados</label>
                <span className="font-mono-tech text-xs text-[#38BDF8]">{meditationDays}/5</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMeditationDays(n)}
                    className={`font-mono-tech min-h-[42px] rounded-lg border text-sm font-semibold transition ${
                      meditationDays === n
                        ? 'btn-rb-primary border-[#0095FF] text-white'
                        : 'btn-rb-surface border-white/12 bg-[#12141A] text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* D — Versículos decorados (mín. 5, máx. 70) */}
            <div className="rounded-lg border border-white/10 bg-[#0B0C0F] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="mdo-d" className="text-sm font-medium text-white">
                  D — Versículos
                </label>
                <span
                  className={`text-xs font-medium ${
                    memorizedVerses >= 5 ? 'text-emerald-400' : 'text-[#F5C41E]'
                  }`}
                >
                  {memorizedVerses >= 5 ? 'Mín. 5 ok' : 'Mín. 5 (máx. 70)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir"
                  onClick={() => setMemorizedVerses((v) => clampVerses(v - 1))}
                  className="btn-rb-surface inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-white/12 bg-[#12141A] text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="mdo-d"
                  type="number"
                  min={0}
                  max={70}
                  value={memorizedVerses}
                  onChange={(e) => setMemorizedVerses(clampVerses(Number(e.target.value)))}
                  className="font-mono-tech min-h-[42px] w-full rounded-lg border border-white/12 bg-[#12141A] px-3 text-center text-base font-semibold text-white focus:border-[#0095FF] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Aumentar"
                  onClick={() => setMemorizedVerses((v) => clampVerses(v + 1))}
                  className="btn-rb-surface inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-white/12 bg-[#12141A] text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* O — Orações (0 a 5) */}
            <div className="rounded-lg border border-white/10 bg-[#0B0C0F] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">O — Orações</label>
                <span className="font-mono-tech text-xs text-[#38BDF8]">{prayerDays}/5</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPrayerDays(n)}
                    className={`font-mono-tech min-h-[42px] rounded-lg border text-sm font-semibold transition ${
                      prayerDays === n
                        ? 'btn-rb-primary border-[#0095FF] text-white'
                        : 'btn-rb-surface border-white/12 bg-[#12141A] text-zinc-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {savedNotice && (
              <span className="text-sm font-medium text-emerald-400">Salvo</span>
            )}
            <button
              type="submit"
              className="btn-rb-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#12141A] p-4 text-sm text-zinc-400">
          O Controle de Meditação e Presença é exclusivo para membros da equipe de Projeção.
        </div>
      )}

      {/* Planilha de Presença e MDO dos membros da Projeção */}
      <section className="rounded-xl border border-white/10 bg-[#12141A] p-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Planilha — Equipe de Projeção</h2>
          <span className="font-mono-tech text-xs text-zinc-400">
            {tableRows.length} membros
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs font-medium text-zinc-400">
                <th className="py-2.5 pr-4">Membro (Projeção)</th>
                <th className="px-3 py-2.5">Presença</th>
                <th className="px-3 py-2.5 text-center">M (0–5)</th>
                <th className="px-3 py-2.5 text-center">D (mín. 5)</th>
                <th className="px-3 py-2.5 text-center">O (0–5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {tableRows.map(({ member, rec }) => {
                const isPresent = rec?.present ?? false;
                const mVal = rec?.meditationDays ?? 0;
                const dVal = rec?.memorizedVerses ?? 0;
                const oVal = rec?.prayerDays ?? 0;

                return (
                  <tr key={member.id}>
                    <td className="py-3 pr-4 font-medium text-white">
                      {member.name}
                    </td>

                    {/* Presença */}
                    <td className="px-3 py-3">
                      {isLeader ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateMemberRecord(member.id, { present: !isPresent })
                          }
                          className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition ${
                            isPresent
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border-white/12 bg-[#0B0C0F] text-zinc-400'
                          }`}
                        >
                          {isPresent ? 'Presente' : 'Ausente'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${
                            isPresent
                              ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                              : 'border-white/12 bg-[#0B0C0F] text-zinc-400'
                          }`}
                        >
                          {isPresent ? 'Presente' : 'Ausente'}
                        </span>
                      )}
                    </td>

                    {/* M (0 a 5) */}
                    <td className="px-3 py-3 text-center">
                      {isLeader ? (
                        <select
                          aria-label={`M de ${member.name}`}
                          value={mVal}
                          onChange={(e) =>
                            updateMemberRecord(member.id, {
                              meditationDays: Number(e.target.value),
                            })
                          }
                          className="font-mono-tech min-h-[34px] rounded-md border border-white/12 bg-[#0B0C0F] px-2 text-xs font-semibold text-white"
                        >
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}/5
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-mono-tech text-zinc-200">{mVal}/5</span>
                      )}
                    </td>

                    {/* D (0 a 70, mín 5) */}
                    <td className="px-3 py-3 text-center">
                      {isLeader ? (
                        <input
                          type="number"
                          min={0}
                          max={70}
                          aria-label={`D de ${member.name}`}
                          value={dVal}
                          onChange={(e) =>
                            updateMemberRecord(member.id, {
                              memorizedVerses: Number(e.target.value),
                            })
                          }
                          className={`font-mono-tech min-h-[34px] w-16 rounded-md border bg-[#0B0C0F] px-2 text-center text-xs font-semibold ${
                            dVal >= 5
                              ? 'border-emerald-500/40 text-emerald-300'
                              : 'border-[#F5C41E]/40 text-[#F5C41E]'
                          }`}
                        />
                      ) : (
                        <span
                          className={`font-mono-tech font-semibold ${
                            dVal >= 5 ? 'text-emerald-300' : 'text-[#F5C41E]'
                          }`}
                        >
                          {dVal}
                        </span>
                      )}
                    </td>

                    {/* O (0 a 5) */}
                    <td className="px-3 py-3 text-center">
                      {isLeader ? (
                        <select
                          aria-label={`O de ${member.name}`}
                          value={oVal}
                          onChange={(e) =>
                            updateMemberRecord(member.id, {
                              prayerDays: Number(e.target.value),
                            })
                          }
                          className="font-mono-tech min-h-[34px] rounded-md border border-white/12 bg-[#0B0C0F] px-2 text-xs font-semibold text-white"
                        >
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}/5
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-mono-tech text-zinc-200">{oVal}/5</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
