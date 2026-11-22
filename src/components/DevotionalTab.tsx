import { useState } from 'react';
import { BookOpen, CheckCircle2, Lock, MessageCircleHeart, ShieldCheck } from 'lucide-react';
import type { MdoEntry, MemberUser, Role, SaturdayVerseRecord } from '../types/portal';

interface DevotionalTabProps {
  activeUser: MemberUser;
  activeRole: Role;
  members: MemberUser[];
  saturdayDate: string;
  mdoEntries: MdoEntry[];
  saturdayVerses: SaturdayVerseRecord[];
  onSaveMdo: (entry: MdoEntry) => void;
  onSaveSaturdayVerse: (record: SaturdayVerseRecord) => void;
}

const WEEK_DAYS: { key: MdoEntry['dayKey']; label: string }[] = [
  { key: 'SEG', label: 'Segunda' },
  { key: 'TER', label: 'Terça' },
  { key: 'QUA', label: 'Quarta' },
  { key: 'QUI', label: 'Quinta' },
  { key: 'SEX', label: 'Sexta' },
  { key: 'SAB', label: 'Sábado' },
];

export function DevotionalTab({
  activeUser,
  activeRole,
  members,
  saturdayDate,
  mdoEntries,
  saturdayVerses,
  onSaveMdo,
  onSaveSaturdayVerse,
}: DevotionalTabProps) {
  const isLeadership = activeRole === 'ADMIN' || activeRole === 'CAPTAIN';
  const [selectedDay, setSelectedDay] = useState<MdoEntry['dayKey']>('SEX');

  const userMdoList = WEEK_DAYS.map((d) => {
    const existing = mdoEntries.find((m) => m.userId === activeUser.id && m.dayKey === d.key);
    return (
      existing ?? {
        id: `mdo-${activeUser.id}-${d.key}`,
        userId: activeUser.id,
        dayKey: d.key,
        dayLabel: d.label,
        completed: false,
        bibleReference: '',
        reflectionNote: '',
      }
    );
  });

  const activeDayEntry = userMdoList.find((m) => m.dayKey === selectedDay) ?? userMdoList[0];
  const [refDraft, setRefDraft] = useState(activeDayEntry.bibleReference);
  const [noteDraft, setNoteDraft] = useState(activeDayEntry.reflectionNote);

  const selectDay = (dayKey: MdoEntry['dayKey']) => {
    setSelectedDay(dayKey);
    const found = userMdoList.find((m) => m.dayKey === dayKey);
    setRefDraft(found?.bibleReference ?? '');
    setNoteDraft(found?.reflectionNote ?? '');
  };

  const myVerseRecord = saturdayVerses.find(
    (v) => v.userId === activeUser.id && v.saturdayDate === saturdayDate,
  ) ?? {
    id: `ver-${activeUser.id}-${saturdayDate}`,
    userId: activeUser.id,
    saturdayDate,
    spoken: false,
    spokenToUserId: '',
    verseReference: '',
  };

  const [verseRef, setVerseRef] = useState(myVerseRecord.verseReference);
  const [spokenToId, setSpokenToId] = useState(myVerseRecord.spokenToUserId);
  const [verseError, setVerseError] = useState<string | null>(null);

  const completedDaysCount = userMdoList.filter((m) => m.completed).length;

  const handleSaveMdoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMdo({
      ...activeDayEntry,
      completed: true,
      bibleReference: refDraft.trim(),
      reflectionNote: noteDraft.trim(),
      updatedAt: `${activeDayEntry.dayKey} ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    });
  };

  const handleConfirmVerse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spokenToId) {
      setVerseError('Selecione para quem você falou seus versículos.');
      return;
    }
    setVerseError(null);
    onSaveSaturdayVerse({
      ...myVerseRecord,
      spoken: true,
      spokenToUserId: spokenToId,
      verseReference: verseRef.trim() || 'Versículos da semana',
      spokenAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* MDO na Semana */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-7 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0095FF]" />
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Meu MDO da Semana ({completedDaysCount}/6 dias)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Anotações privadas (LGPD)</span>
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Alimente seu MDO de segunda a sábado antes de servir no altar e na mesa.
          </p>

          {/* Day Selector Grid */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {userMdoList.map((day) => {
              const isSelected = selectedDay === day.dayKey;
              return (
                <button
                  key={day.dayKey}
                  type="button"
                  onClick={() => selectDay(day.dayKey)}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border p-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'border-[#0095FF] bg-[#0095FF]/15 text-[#0095FF]'
                      : day.completed
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-[#171B24] dark:text-zinc-400'
                  }`}
                >
                  <span>{day.dayKey}</span>
                  <span className="mt-0.5 text-[11px] font-normal">
                    {day.completed ? 'Feito' : 'Pendente'}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSaveMdoSubmit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="mdo-ref" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Passagem lida ({activeDayEntry.dayLabel})
              </label>
              <input
                id="mdo-ref"
                type="text"
                required
                value={refDraft}
                onChange={(e) => setRefDraft(e.target.value)}
                placeholder="Ex.: João 15:1-12"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="mdo-note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                O que Deus falou comigo hoje
              </label>
              <textarea
                id="mdo-note"
                rows={4}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escreva seu resumo ou aplicação prática..."
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0080DC]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Salvar MDO de {activeDayEntry.dayLabel}</span>
            </button>
          </form>
        </section>

        {/* Versículos de Sábado */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-5 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <MessageCircleHeart className="h-5 w-5 text-[#F5C41E]" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Versículos de Sábado
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Marque se você já falou seus versículos neste sábado ({saturdayDate}) e selecione para quem falou.
          </p>

          {myVerseRecord.spoken && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-300">
              <div className="font-semibold">Versículos registrados às {myVerseRecord.spokenAt}!</div>
              <div className="mt-0.5 text-xs">
                Falado para:{' '}
                <strong>
                  {members.find((m) => m.id === myVerseRecord.spokenToUserId)?.name ?? 'Líder'}
                </strong>{' '}
                · {myVerseRecord.verseReference}
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmVerse} className="mt-4 space-y-3">
            <div>
              <label htmlFor="verse-ref" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Versículo(s) decorado(s)
              </label>
              <input
                id="verse-ref"
                type="text"
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Ex.: Colossenses 3:23-24"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="verse-listener" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Para quem você falou os versículos?
              </label>
              <select
                id="verse-listener"
                value={spokenToId}
                onChange={(e) => setSpokenToId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              >
                <option value="">Selecione um membro/líder...</option>
                {members
                  .filter((m) => m.id !== activeUser.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.ministry})
                    </option>
                  ))}
              </select>
            </div>

            {verseError && (
              <p className="text-sm font-medium text-red-400">{verseError}</p>
            )}

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Já falei meus versículos</span>
            </button>
          </form>

          {/* Leadership Summary (only indicators, no private MDO text) */}
          {isLeadership && (
            <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-[#0095FF]" />
                <span>Resumo da Liderança — Sábado (LGPD)</span>
              </div>
              <div className="mt-3 space-y-2">
                {members.slice(0, 6).map((m) => {
                  const v = saturdayVerses.find(
                    (rec) => rec.userId === m.id && rec.saturdayDate === saturdayDate,
                  );
                  const listener = members.find((l) => l.id === v?.spokenToUserId);
                  const mdoDays = mdoEntries.filter(
                    (e) => e.userId === m.id && e.completed,
                  ).length;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-white/10 dark:bg-[#171B24]"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white">{m.name}</span>
                        <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                          MDO: {mdoDays}/6
                        </span>
                      </div>
                      {v?.spoken ? (
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-400">
                          Falou p/ {listener?.name.split(' ')[0] ?? 'Líder'}
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-500/15 px-2 py-0.5 text-zinc-400">
                          Pendente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
