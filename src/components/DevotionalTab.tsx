import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { MemberUser, SaturdayMdoRecord } from '../types/portal';

interface DevotionalTabProps {
  activeUser: MemberUser;
  isLeader: boolean;
  members: MemberUser[];
  saturdayDate: string;
  records: SaturdayMdoRecord[];
  onSaveSaturdayMdo: (record: SaturdayMdoRecord) => void;
}

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5];
const VERSES_MIN = 5;
const VERSES_MAX = 70;

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

const clampVerses = (val: number) =>
  Math.max(0, Math.min(VERSES_MAX, Math.round(val || 0)));

const clampDays = (val: number) => Math.max(0, Math.min(5, val));

const nowLabel = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/* Classes compartilhadas */
const presenceTone = (isPresent: boolean) =>
  isPresent ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line text-ink-3';

const versesTone = (value: number) =>
  value >= VERSES_MIN ? 'border-ok/40 text-ok' : 'border-attn/50 text-attn';

const cellFieldClass =
  'font-mono-tech rounded-lg border bg-sunken px-2 text-center font-semibold focus:border-accent focus:outline-none';

/** Seletor de 0 a 5 dias (M e O). */
function DayPicker({
  labelId,
  value,
  onChange,
}: {
  labelId: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-6 gap-1.5">
      {DAY_OPTIONS.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={selected}
            aria-label={n === 1 ? '1 dia' : `${n} dias`}
            onClick={() => onChange(n)}
            className={`font-mono-tech min-h-11 rounded-lg border text-sm font-semibold transition-colors sm:min-h-10 ${
              selected
                ? 'border-accent-solid bg-accent-solid text-white'
                : 'btn-rb-surface border-line bg-surface text-ink-2'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSaturdayMdo({
      id: myExisting?.id ?? `smdo-${activeUser.id}-${saturdayDate}`,
      userId: activeUser.id,
      saturdayDate,
      present,
      meditationDays: clampDays(meditationDays),
      memorizedVerses: clampVerses(memorizedVerses),
      prayerDays: clampDays(prayerDays),
      updatedAt: nowLabel(),
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
      meditationDays: clampDays(patch.meditationDays ?? existing?.meditationDays ?? 0),
      memorizedVerses: clampVerses(
        patch.memorizedVerses ?? existing?.memorizedVerses ?? 0,
      ),
      prayerDays: clampDays(patch.prayerDays ?? existing?.prayerDays ?? 0),
      updatedAt: nowLabel(),
    });
  };

  // Voluntário vê só quem já registrou; Liderança vê toda a equipe para lançar e corrigir.
  const tableRows = useMemo(() => {
    const rows = projectionMembers.map((member) => ({
      member,
      rec: records.find(
        (r) => r.userId === member.id && r.saturdayDate === saturdayDate,
      ),
    }));
    return isLeader ? rows : rows.filter((row) => row.rec !== undefined);
  }, [isLeader, projectionMembers, records, saturdayDate]);

  const registeredCount = tableRows.filter((row) => row.rec).length;
  const presentCount = tableRows.filter((row) => row.rec?.present).length;
  const versesOk = memorizedVerses >= VERSES_MIN;

  const statusText = savedNotice
    ? 'Registro salvo.'
    : myExisting?.updatedAt
      ? `Último envio às ${myExisting.updatedAt}.`
      : myExisting
        ? 'Registro enviado.'
        : 'Nenhum registro enviado para este sábado.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">Controle de meditação</h1>
        <p className="text-sm text-ink-3">
          Sábado <span className="font-mono-tech text-ink-2">{formatDateBr(saturdayDate)}</span>
        </p>
      </div>

      {/* Registro individual (somente equipe de Projeção) */}
      {userIsFromProjection ? (
        <form
          onSubmit={handleSubmit}
          aria-labelledby="mdo-form-title"
          className="rounded-xl border border-line bg-surface"
        >
          <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="mdo-form-title" className="section-title">
                Seu registro
              </h2>
              <p className="text-xs text-ink-4">
                MDO da semana: meditação, versículos decorados e oração.
              </p>
            </div>

            <div
              role="group"
              aria-label="Presença no sábado"
              className="grid grid-cols-2 rounded-lg border border-line bg-sunken p-0.5 sm:inline-grid"
            >
              <button
                type="button"
                aria-pressed={present}
                onClick={() => setPresent(true)}
                className={`min-h-11 rounded-md px-4 text-sm font-medium transition-colors sm:min-h-9 ${
                  present ? 'bg-surface text-ok ring-1 ring-line' : 'text-ink-3 hover:text-ink'
                }`}
              >
                Presente
              </button>
              <button
                type="button"
                aria-pressed={!present}
                onClick={() => setPresent(false)}
                className={`min-h-11 rounded-md px-4 text-sm font-medium transition-colors sm:min-h-9 ${
                  !present ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-3 hover:text-ink'
                }`}
              >
                Ausente
              </button>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-3 lg:gap-6">
            {/* M: dias de meditação (0 a 5) */}
            <div className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-1 lg:items-start lg:gap-2">
              <div className="flex items-baseline justify-between gap-2 sm:block lg:flex">
                <p id="mdo-m-label" className="text-sm font-medium text-ink">
                  <span className="font-mono-tech mr-1.5 text-ink-3">M</span>
                  Dias de meditação
                </p>
                <p className="text-xs text-ink-4">0 a 5 na semana</p>
              </div>
              <DayPicker labelId="mdo-m-label" value={meditationDays} onChange={setMeditationDays} />
            </div>

            {/* D: versículos decorados (mín. 5, máx. 70) */}
            <div className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-1 lg:items-start lg:gap-2">
              <div className="flex items-baseline justify-between gap-2 sm:block lg:flex">
                <label htmlFor="mdo-d" className="block text-sm font-medium text-ink">
                  <span className="font-mono-tech mr-1.5 text-ink-3">D</span>
                  Versículos decorados
                </label>
                <p
                  id="mdo-d-hint"
                  className={`text-xs font-medium ${versesOk ? 'text-ok' : 'text-attn'}`}
                >
                  {versesOk ? 'Mínimo de 5 atingido' : 'Abaixo do mínimo de 5'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Diminuir versículos"
                  disabled={memorizedVerses <= 0}
                  onClick={() => setMemorizedVerses((v) => clampVerses(v - 1))}
                  className="btn-rb-surface inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 disabled:opacity-40 sm:size-10"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  id="mdo-d"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={VERSES_MAX}
                  aria-describedby="mdo-d-hint"
                  value={memorizedVerses}
                  onChange={(e) => setMemorizedVerses(clampVerses(Number(e.target.value)))}
                  className="font-mono-tech min-h-11 w-full min-w-0 rounded-lg border border-line bg-sunken px-3 text-center text-base font-semibold text-ink focus:border-accent focus:outline-none sm:min-h-10"
                />
                <button
                  type="button"
                  aria-label="Aumentar versículos"
                  disabled={memorizedVerses >= VERSES_MAX}
                  onClick={() => setMemorizedVerses((v) => clampVerses(v + 1))}
                  className="btn-rb-surface inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 disabled:opacity-40 sm:size-10"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* O: dias de oração (0 a 5) */}
            <div className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4 lg:grid-cols-1 lg:items-start lg:gap-2">
              <div className="flex items-baseline justify-between gap-2 sm:block lg:flex">
                <p id="mdo-o-label" className="text-sm font-medium text-ink">
                  <span className="font-mono-tech mr-1.5 text-ink-3">O</span>
                  Dias de oração
                </p>
                <p className="text-xs text-ink-4">0 a 5 na semana</p>
              </div>
              <DayPicker labelId="mdo-o-label" value={prayerDays} onChange={setPrayerDays} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p
              role="status"
              aria-live="polite"
              className={`text-xs ${savedNotice ? 'font-medium text-ok' : 'text-ink-4'}`}
            >
              {statusText}
            </p>
            <button
              type="submit"
              className="btn-rb-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold text-white sm:min-h-10 sm:w-auto"
            >
              Salvar registro
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-3 sm:px-5">
          O registro de MDO é exclusivo para a equipe de Projeção.
        </p>
      )}

      {/* Acompanhamento da equipe de Projeção */}
      <section aria-labelledby="mdo-team-title" className="rounded-xl border border-line bg-surface">
        <div className="flex flex-col gap-2 border-b border-line-soft px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 id="mdo-team-title" className="section-title">
              Equipe de Projeção
            </h2>
            <p className="mt-0.5 text-xs text-ink-4">
              M: dias de meditação (0 a 5). D: versículos decorados (mín. 5, máx. 70). O: dias
              de oração (0 a 5).
            </p>
          </div>
          <dl className="flex shrink-0 gap-4 text-xs text-ink-3">
            <div className="flex items-baseline gap-1.5">
              <dt>{isLeader ? 'Com registro' : 'Registros'}</dt>
              <dd className="font-mono-tech font-semibold text-ink">
                {isLeader ? `${registeredCount}/${tableRows.length}` : registeredCount}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>Presentes</dt>
              <dd className="font-mono-tech font-semibold text-ink">{presentCount}</dd>
            </div>
          </dl>
        </div>

        {tableRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-3 sm:px-5">
            Nenhum registro enviado para este sábado.
          </p>
        ) : (
          <>
            {/* Celular: uma linha por membro, sem rolagem horizontal */}
            <ul className="divide-y divide-line-soft md:hidden">
              {tableRows.map(({ member, rec }) => {
                const isPresent = rec?.present ?? false;
                const mVal = rec?.meditationDays ?? 0;
                const dVal = rec?.memorizedVerses ?? 0;
                const oVal = rec?.prayerDays ?? 0;

                return (
                  <li key={member.id} className="space-y-2.5 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                        <p className="text-xs text-ink-4">
                          {!rec
                            ? 'Sem registro'
                            : rec.updatedAt
                              ? `Atualizado às ${rec.updatedAt}`
                              : 'Registro enviado'}
                        </p>
                      </div>

                      {isLeader ? (
                        <button
                          type="button"
                          aria-pressed={isPresent}
                          aria-label={`Presença de ${member.name}`}
                          onClick={() => updateMemberRecord(member.id, { present: !isPresent })}
                          className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-semibold ${presenceTone(isPresent)}`}
                        >
                          {isPresent ? 'Presente' : 'Ausente'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${presenceTone(isPresent)}`}
                        >
                          {isPresent ? 'Presente' : 'Ausente'}
                        </span>
                      )}
                    </div>

                    {isLeader ? (
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-ink-3">M (0 a 5)</span>
                          <select
                            aria-label={`M de ${member.name}`}
                            value={mVal}
                            onChange={(e) =>
                              updateMemberRecord(member.id, {
                                meditationDays: Number(e.target.value),
                              })
                            }
                            className={`${cellFieldClass} min-h-11 w-full border-line text-base text-ink`}
                          >
                            {DAY_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-ink-3">D (mín. 5)</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={VERSES_MAX}
                            aria-label={`D de ${member.name}`}
                            value={dVal}
                            onChange={(e) =>
                              updateMemberRecord(member.id, {
                                memorizedVerses: Number(e.target.value),
                              })
                            }
                            className={`${cellFieldClass} min-h-11 w-full text-base ${versesTone(dVal)}`}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-ink-3">O (0 a 5)</span>
                          <select
                            aria-label={`O de ${member.name}`}
                            value={oVal}
                            onChange={(e) =>
                              updateMemberRecord(member.id, {
                                prayerDays: Number(e.target.value),
                              })
                            }
                            className={`${cellFieldClass} min-h-11 w-full border-line text-base text-ink`}
                          >
                            {DAY_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : (
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-ink-3">M (0 a 5)</dt>
                          <dd className="font-mono-tech text-sm font-semibold text-ink-2">{mVal}/5</dd>
                        </div>
                        <div>
                          <dt className="text-ink-3">D (mín. 5)</dt>
                          <dd
                            className={`font-mono-tech text-sm font-semibold ${
                              dVal >= VERSES_MIN ? 'text-ok' : 'text-attn'
                            }`}
                          >
                            {dVal}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-3">O (0 a 5)</dt>
                          <dd className="font-mono-tech text-sm font-semibold text-ink-2">{oVal}/5</dd>
                        </div>
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Tablet e desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-xs text-ink-3">
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Membro
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Presença
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-center font-medium">
                      M <span className="font-normal text-ink-4">0 a 5</span>
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-center font-medium">
                      D <span className="font-normal text-ink-4">mín. 5</span>
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-center font-medium">
                      O <span className="font-normal text-ink-4">0 a 5</span>
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Atualizado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {tableRows.map(({ member, rec }) => {
                    const isPresent = rec?.present ?? false;
                    const mVal = rec?.meditationDays ?? 0;
                    const dVal = rec?.memorizedVerses ?? 0;
                    const oVal = rec?.prayerDays ?? 0;

                    return (
                      <tr key={member.id}>
                        <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink">
                          {member.name}
                        </th>

                        <td className="px-3 py-2.5">
                          {isLeader ? (
                            <button
                              type="button"
                              aria-pressed={isPresent}
                              aria-label={`Presença de ${member.name}`}
                              onClick={() =>
                                updateMemberRecord(member.id, { present: !isPresent })
                              }
                              className={`inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold transition-colors ${presenceTone(isPresent)} ${isPresent ? '' : 'hover:bg-ink/5'}`}
                            >
                              {isPresent ? 'Presente' : 'Ausente'}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${presenceTone(isPresent)}`}
                            >
                              {isPresent ? 'Presente' : 'Ausente'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {isLeader ? (
                            <select
                              aria-label={`M de ${member.name}`}
                              value={mVal}
                              onChange={(e) =>
                                updateMemberRecord(member.id, {
                                  meditationDays: Number(e.target.value),
                                })
                              }
                              className={`${cellFieldClass} min-h-8 w-16 border-line text-sm text-ink`}
                            >
                              {DAY_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono-tech text-ink-2">{mVal}/5</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {isLeader ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={VERSES_MAX}
                              aria-label={`D de ${member.name}`}
                              title={dVal >= VERSES_MIN ? undefined : 'Abaixo do mínimo de 5'}
                              value={dVal}
                              onChange={(e) =>
                                updateMemberRecord(member.id, {
                                  memorizedVerses: Number(e.target.value),
                                })
                              }
                              className={`${cellFieldClass} min-h-8 w-16 text-sm ${versesTone(dVal)}`}
                            />
                          ) : (
                            <span
                              className={`font-mono-tech font-semibold ${
                                dVal >= VERSES_MIN ? 'text-ok' : 'text-attn'
                              }`}
                            >
                              {dVal}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {isLeader ? (
                            <select
                              aria-label={`O de ${member.name}`}
                              value={oVal}
                              onChange={(e) =>
                                updateMemberRecord(member.id, {
                                  prayerDays: Number(e.target.value),
                                })
                              }
                              className={`${cellFieldClass} min-h-8 w-16 border-line text-sm text-ink`}
                            >
                              {DAY_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono-tech text-ink-2">{oVal}/5</span>
                          )}
                        </td>

                        <td className="px-5 py-2.5 text-right text-xs text-ink-4">
                          {!rec ? (
                            'Sem registro'
                          ) : rec.updatedAt ? (
                            <span className="font-mono-tech">{rec.updatedAt}</span>
                          ) : (
                            'Enviado'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
