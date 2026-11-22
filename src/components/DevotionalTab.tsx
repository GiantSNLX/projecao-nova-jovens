import { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import type { MdoEntry, MemberUser, SaturdayVerseRecord } from '../types/portal';

interface DevotionalTabProps {
  activeUser: MemberUser;
  isLeader: boolean;
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
  isLeader,
  members,
  saturdayDate,
  mdoEntries,
  saturdayVerses,
  onSaveMdo,
  onSaveSaturdayVerse,
}: DevotionalTabProps) {
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
      setVerseError('Escolha para quem você falou seus versículos.');
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
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Controle de Meditação
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Registre seu MDO durante a semana e confirme seus versículos no sábado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* MDO na semana */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              MDO da semana ({completedDaysCount}/6 dias)
            </h2>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Anotações pessoais</span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {userMdoList.map((day) => {
              const isSelected = selectedDay === day.dayKey;
              return (
                <button
                  key={day.dayKey}
                  type="button"
                  onClick={() => selectDay(day.dayKey)}
                  className={`flex min-h-[54px] flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium ${
                    isSelected
                      ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                      : day.completed
                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-[#0B0C0F] text-zinc-400'
                  }`}
                >
                  <span>{day.dayKey}</span>
                  <span className="mt-0.5 text-[11px] opacity-80">
                    {day.completed ? 'Feito' : 'Pendente'}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSaveMdoSubmit} className="mt-5 space-y-3">
            <div>
              <label htmlFor="mdo-ref" className="block text-sm font-medium text-zinc-300">
                Passagem lida ({activeDayEntry.dayLabel})
              </label>
              <input
                id="mdo-ref"
                type="text"
                required
                value={refDraft}
                onChange={(e) => setRefDraft(e.target.value)}
                placeholder="Ex.: João 15:1-12"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="mdo-note" className="block text-sm font-medium text-zinc-300">
                Anotação do dia
              </label>
              <textarea
                id="mdo-note"
                rows={4}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escreva o que falou com você..."
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Salvar MDO de {activeDayEntry.dayLabel}</span>
            </button>
          </form>
        </section>

        {/* Versículos de Sábado */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-5">
          <h2 className="text-base font-semibold text-white">Versículos de sábado</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Informe se você já falou seus versículos neste sábado ({saturdayDate}) e selecione para quem falou.
          </p>

          {myVerseRecord.spoken && (
            <div className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              Registrado às {myVerseRecord.spokenAt} para{' '}
              <strong>
                {members.find((m) => m.id === myVerseRecord.spokenToUserId)?.name ?? 'Líder'}
              </strong>
              .
            </div>
          )}

          <form onSubmit={handleConfirmVerse} className="mt-4 space-y-3">
            <div>
              <label htmlFor="verse-ref" className="block text-sm font-medium text-zinc-300">
                Referência do versículo
              </label>
              <input
                id="verse-ref"
                type="text"
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Ex.: Colossenses 3:23-24"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="verse-listener" className="block text-sm font-medium text-zinc-300">
                Para quem você falou?
              </label>
              <select
                id="verse-listener"
                value={spokenToId}
                onChange={(e) => setSpokenToId(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none"
              >
                <option value="">Selecione alguém da equipe...</option>
                {members
                  .filter((m) => m.id !== activeUser.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            {verseError && <p className="text-sm text-red-400">{verseError}</p>}

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Já falei meus versículos</span>
            </button>
          </form>

          {isLeader && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-white">Acompanhamento da equipe</h3>
              <div className="mt-2.5 divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0B0C0F]">
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
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-white">{m.name}</span>
                        <span className="ml-2 text-zinc-500">MDO {mdoDays}/6</span>
                      </div>
                      {v?.spoken ? (
                        <span className="text-emerald-400">
                          Falou p/ {listener?.name.split(' ')[0] ?? 'Líder'}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Pendente</span>
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
