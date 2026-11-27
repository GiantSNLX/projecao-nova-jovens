import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileUp,
  Loader2,
  Lock,
  MessageSquarePlus,
  MessageSquareText,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { ServiceSong } from '../types/portal';
import { formatHolyricsVersions, sanitizeSlug } from '../utils/holyrics';
import { extractLyricsFromDocument } from '../utils/lyricsExtractor';

interface MusicTabProps {
  songs: ServiceSong[];
  canEditMusic: boolean;
  isLeader: boolean;
  activeUserName: string;
  isFrozen: boolean;
  onSaveOrAddSong: (song: ServiceSong) => void;
  onToggleApproveSong: (songId: string) => void;
  onRemoveSong: (songId: string) => void;
}

type FeedbackTone = 'ok' | 'info' | 'error';
type Feedback = { tone: FeedbackTone; text: string };

type StatusTone = 'ok' | 'attn' | 'muted';

const STATUS_TONE: Record<StatusTone, string> = {
  ok: 'text-ok',
  attn: 'text-attn',
  muted: 'text-ink-3',
};

const FEEDBACK_TONE: Record<FeedbackTone, string> = {
  ok: 'border-ok/40 bg-ok/10',
  info: 'border-accent/35 bg-accent/10',
  error: 'border-danger/40 bg-danger/10',
};

function getSongStatus(song: ServiceSong): { label: string; tone: StatusTone } {
  if (song.adjustmentRequest) return { label: 'Ajuste solicitado', tone: 'attn' };
  if (song.approved) return { label: 'Aprovada', tone: 'ok' };
  if (!song.rawLyrics.trim()) return { label: 'Aguardando letra', tone: 'muted' };
  return { label: 'Aguardando aprovação', tone: 'attn' };
}

function StatusLabel({ song }: { song: ServiceSong }) {
  const { label, tone } = getSongStatus(song);
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${STATUS_TONE[tone]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* Alvo de toque de 44px no celular, mais compacto a partir do tablet */
const BTN_SECONDARY =
  'btn-rb-surface inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink-2 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-9';

export function MusicTab({
  songs,
  canEditMusic,
  isLeader,
  activeUserName,
  isFrozen,
  onSaveOrAddSong,
  onToggleApproveSong,
  onRemoveSong,
}: MusicTabProps) {
  const sortedSongs = useMemo(
    () => songs.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [songs],
  );
  const [selectedId, setSelectedId] = useState<string>(sortedSongs[0]?.id ?? '');

  const selectedSong = sortedSongs.find((s) => s.id === selectedId) ?? sortedSongs[0];

  const [title, setTitle] = useState(selectedSong?.title ?? '');
  const [rawLyrics, setRawLyrics] = useState(selectedSong?.rawLyrics ?? '');
  const [notes, setNotes] = useState(selectedSong?.notes ?? '');
  const [slideNotes, setSlideNotes] = useState<Record<string, string>>(
    selectedSong?.slideNotes ?? {},
  );
  const [creatingNew, setCreatingNew] = useState(false);

  const [previewMode, setPreviewMode] = useState<'two' | 'one'>('two');
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [activeSlideKey, setActiveSlideKey] = useState<string | null>(null);
  const [slideNoteDraft, setSlideNoteDraft] = useState('');

  const [extractingDoc, setExtractingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<Feedback | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  const detailRef = useRef<HTMLElement>(null);

  const canEdit = canEditMusic && !isFrozen;
  const isNew = creatingNew || !selectedSong;
  const approvedCount = songs.filter((s) => s.approved).length;

  useEffect(() => {
    if (creatingNew || !selectedSong) return;
    setTitle(selectedSong.title);
    setRawLyrics(selectedSong.rawLyrics);
    setNotes(selectedSong.notes ?? '');
    setSlideNotes(selectedSong.slideNotes ?? {});
    setCurrentSlideIdx(0);
  }, [creatingNew, selectedSong]);

  /* No celular a lista fica acima do editor: leva o usuário até a música escolhida */
  const revealDetail = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      }),
    );
  };

  const selectSong = (song: ServiceSong) => {
    setCreatingNew(false);
    setDocFeedback(null);
    setActiveSlideKey(null);
    setSelectedId(song.id);
    setTitle(song.title);
    setRawLyrics(song.rawLyrics);
    setNotes(song.notes ?? '');
    setSlideNotes(song.slideNotes ?? {});
    revealDetail();
  };

  const startNewSong = () => {
    setCreatingNew(true);
    setDocFeedback(null);
    setActiveSlideKey(null);
    setTitle('');
    setRawLyrics('');
    setNotes('');
    setSlideNotes({});
    revealDetail();
  };

  const cancelNewSong = () => {
    setCreatingNew(false);
    setDocFeedback(null);
  };

  const liveVersions = useMemo(
    () => formatHolyricsVersions(rawLyrics, title),
    [rawLyrics, title],
  );

  const previewSlides = useMemo(() => {
    const raw = previewMode === 'two' ? liveVersions.twoLinesTxt : liveVersions.oneLineTxt;
    return raw
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [liveVersions, previewMode]);

  const handleImportPdfOrPptx = async (file: File) => {
    setExtractingDoc(true);
    setDocFeedback(null);
    try {
      const extracted = await extractLyricsFromDocument(file);
      if (extracted.length === 0) {
        setDocFeedback({ tone: 'error', text: 'Nenhum texto encontrado neste arquivo.' });
        return;
      }

      if (extracted.length === 1) {
        const item = extracted[0];
        if (!title.trim() || creatingNew) {
          setTitle(item.title);
        }
        setRawLyrics(item.rawLyrics);
        const saveLabel = creatingNew || !selectedSong ? 'Adicionar música' : 'Salvar letra';
        setDocFeedback({
          tone: 'info',
          text: `Letra importada de "${file.name}". Confira os slides e clique em ${saveLabel}.`,
        });
      } else {
        extracted.forEach((item, idx) => {
          const existingMatch = sortedSongs[idx];
          if (existingMatch && !creatingNew) {
            onSaveOrAddSong({
              ...existingMatch,
              rawLyrics: item.rawLyrics,
              holyricsTxt: item.twoLinesTxt,
              holyricsOneLineTxt: item.oneLineTxt,
              holyricsTwoLinesTxt: item.twoLinesTxt,
              addedBy: activeUserName,
            });
          } else {
            const nextOrder = songs.length + idx + 1;
            onSaveOrAddSong({
              id: `sng-${Date.now()}-${idx}`,
              songCode: `M${nextOrder}`,
              orderIndex: nextOrder,
              title: item.title,
              rawLyrics: item.rawLyrics,
              holyricsTxt: item.twoLinesTxt,
              holyricsOneLineTxt: item.oneLineTxt,
              holyricsTwoLinesTxt: item.twoLinesTxt,
              approved: false,
              validatedBySchedule: false,
              addedBy: activeUserName,
            });
          }
        });
        setRawLyrics(extracted[0].rawLyrics);
        setDocFeedback({
          tone: 'ok',
          text: `${extracted.length} músicas importadas de "${file.name}" e enviadas para o Culto, nas versões de 1 e 2 linhas.`,
        });
      }
    } catch (err) {
      setDocFeedback({
        tone: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível ler o arquivo. Use PDF, PPTX ou TXT.',
      });
    } finally {
      setExtractingDoc(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawLyrics.trim()) return;

    const { oneLineTxt, twoLinesTxt } = formatHolyricsVersions(rawLyrics, title);

    if (creatingNew || !selectedSong) {
      const nextIndex = songs.length + 1;
      const newSong: ServiceSong = {
        id: `sng-${Date.now()}`,
        songCode: `M${nextIndex}`,
        orderIndex: nextIndex,
        title: title.trim(),
        rawLyrics: rawLyrics.trim(),
        holyricsTxt: twoLinesTxt,
        holyricsOneLineTxt: oneLineTxt,
        holyricsTwoLinesTxt: twoLinesTxt,
        notes: notes.trim() || undefined,
        slideNotes: Object.keys(slideNotes).length > 0 ? slideNotes : undefined,
        approved: false,
        validatedBySchedule: false,
        addedBy: activeUserName,
      };
      onSaveOrAddSong(newSong);
      setCreatingNew(false);
      setSelectedId(newSong.id);
    } else {
      onSaveOrAddSong({
        ...selectedSong,
        title: title.trim(),
        rawLyrics: rawLyrics.trim(),
        holyricsTxt: twoLinesTxt,
        holyricsOneLineTxt: oneLineTxt,
        holyricsTwoLinesTxt: twoLinesTxt,
        notes: notes.trim() || undefined,
        slideNotes: Object.keys(slideNotes).length > 0 ? slideNotes : undefined,
        addedBy: activeUserName,
      });
    }

    setDocFeedback({
      tone: 'ok',
      text: 'Letra salva e enviada para o Culto: Principal em 2 linhas, Retorno/Studio em 1 linha.',
    });
  };

  const openSlideNoteEditor = (slideKey: string) => {
    if (!canEdit) return;
    setActiveSlideKey(slideKey);
    setSlideNoteDraft(slideNotes[slideKey] ?? '');
  };

  const saveSlideNote = (slideKey: string) => {
    const trimmed = slideNoteDraft.trim();
    const next = { ...slideNotes };
    if (trimmed) {
      next[slideKey] = trimmed;
    } else {
      delete next[slideKey];
    }
    setSlideNotes(next);
    setActiveSlideKey(null);

    if (!creatingNew && selectedSong) {
      const { oneLineTxt, twoLinesTxt } = formatHolyricsVersions(rawLyrics, title);
      onSaveOrAddSong({
        ...selectedSong,
        title: title.trim() || selectedSong.title,
        rawLyrics: rawLyrics.trim() || selectedSong.rawLyrics,
        holyricsTxt: twoLinesTxt,
        holyricsOneLineTxt: oneLineTxt,
        holyricsTwoLinesTxt: twoLinesTxt,
        notes: notes.trim() || undefined,
        slideNotes: Object.keys(next).length > 0 ? next : undefined,
        addedBy: activeUserName,
      });
    }
  };

  const downloadVersionTxt = (mode: 'one' | 'two') => {
    const content = mode === 'one' ? liveVersions.oneLineTxt : liveVersions.twoLinesTxt;
    const suffix = mode === 'one' ? '1_linha_Retorno_Studio' : '2_linhas_Principal';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeSlug(title || 'musica')}_${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const copyVersion = async (mode: 'one' | 'two') => {
    const content = mode === 'one' ? liveVersions.oneLineTxt : liveVersions.twoLinesTxt;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedVersion(mode);
      setTimeout(() => setCopiedVersion(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const changePreviewMode = (mode: 'two' | 'one') => {
    setPreviewMode(mode);
    setCurrentSlideIdx(0);
    setActiveSlideKey(null);
  };

  const safeIdx = Math.max(0, Math.min(currentSlideIdx, previewSlides.length - 1));
  const activeSlideText = previewSlides[safeIdx];
  const activeKey = `${previewMode}-${safeIdx}`;
  const activeNote = slideNotes[activeKey];

  const inputClass =
    'mt-1 w-full rounded-lg border border-line bg-sunken px-3 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none read-only:cursor-default read-only:focus:border-line sm:text-sm';

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Músicas</h1>
          <p className="mt-1 text-xs text-ink-3">
            {plural(songs.length, 'música', 'músicas')} no Culto ·{' '}
            {plural(approvedCount, 'aprovada', 'aprovadas')}
          </p>
        </div>

        {canEdit && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={startNewSong}
              className={`${BTN_SECONDARY} text-ink`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Nova música</span>
            </button>

            <label
              title="PDF, PPTX ou TXT"
              className={`btn-rb-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent sm:min-h-9 sm:px-4 ${
                extractingDoc ? 'cursor-wait opacity-70' : 'cursor-pointer'
              }`}
            >
              {extractingDoc ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{extractingDoc ? 'Lendo arquivo...' : 'Importar letra'}</span>
              <input
                type="file"
                accept=".pdf,.pptx,.txt"
                disabled={extractingDoc}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportPdfOrPptx(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}
      </header>

      {canEditMusic && isFrozen && (
        <p className="flex items-start gap-2 rounded-lg border border-line bg-sunken px-3 py-2 text-xs text-ink-2">
          <Lock className="mt-px h-4 w-4 shrink-0 text-ink-3" />
          <span>Envios travados pela liderança. Letras e notas ficam disponíveis só para consulta.</span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Lista das músicas */}
        <section aria-label="Músicas do Culto" className="min-w-0 lg:self-start">
          {sortedSongs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
              <p className="text-sm font-medium text-ink">Nenhuma música no Culto</p>
              <p className="mt-1 text-xs text-ink-3">
                {canEdit
                  ? 'Importe a letra em PDF, PPTX ou TXT, ou use Nova música.'
                  : 'As letras aparecem aqui quando a equipe de Música enviar.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
              {sortedSongs.map((song) => {
                const isSelected = !creatingNew && selectedSong?.id === song.id;
                const slideNoteCount = song.slideNotes ? Object.keys(song.slideNotes).length : 0;
                const meta = [
                  song.validatedBySchedule ? 'Validada no roteiro' : null,
                  slideNoteCount > 0
                    ? plural(slideNoteCount, 'nota em slide', 'notas em slides')
                    : null,
                ].filter(Boolean);

                return (
                  <li key={song.id}>
                    <button
                      type="button"
                      onClick={() => selectSong(song)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-accent/10 shadow-[inset_3px_0_0_var(--c-accent)]'
                          : 'hover:bg-ink/5'
                      }`}
                    >
                      <span className="font-mono-tech w-8 shrink-0 pt-px text-xs font-semibold text-ink-3">
                        {song.songCode ?? `M${song.orderIndex}`}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {song.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
                          <StatusLabel song={song} />
                          {meta.map((m) => (
                            <span key={m}>{m}</span>
                          ))}
                        </span>
                        {song.notes && (
                          <span className="mt-1 block truncate text-xs text-ink-3">
                            Obs.: {song.notes}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Letra, observações e slides da música selecionada */}
        <section
          ref={detailRef}
          aria-label="Letra e slides"
          className="min-w-0 scroll-mt-20 space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-baseline gap-2">
                {!isNew && (
                  <span className="font-mono-tech shrink-0 text-xs font-semibold text-ink-3">
                    {selectedSong.songCode ?? `M${selectedSong.orderIndex}`}
                  </span>
                )}
                <h2 className="section-title truncate">
                  {isNew ? 'Nova música' : title || selectedSong.title || 'Música'}
                </h2>
              </div>
              {!isNew && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
                  <StatusLabel song={selectedSong} />
                  {selectedSong.validatedBySchedule && <span>Validada no roteiro</span>}
                  {previewSlides.length > 0 && (
                    <span>{plural(previewSlides.length, 'slide', 'slides')}</span>
                  )}
                </p>
              )}
            </div>

            {!isNew && (isLeader || canEdit) && (
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => onToggleApproveSong(selectedSong.id)}
                    className={`${BTN_SECONDARY} flex-1 text-ink sm:flex-none`}
                  >
                    {selectedSong.approved ? (
                      <Undo2 className="h-4 w-4 shrink-0 text-ink-3" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span>{selectedSong.approved ? 'Desfazer aprovação' : 'Aprovar letra'}</span>
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemoveSong(selectedSong.id)}
                    className={`${BTN_SECONDARY} flex-1 hover:border-danger/40 hover:text-danger sm:flex-none`}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>Remover música</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {!isNew && selectedSong.adjustmentRequest && (
            <p className="rounded-lg border border-attn/40 bg-attn/10 px-3 py-2 text-xs text-ink-2">
              <span className="font-medium text-attn">
                Ajuste solicitado por {selectedSong.adjustmentRequest.requestedBy}:
              </span>{' '}
              {selectedSong.adjustmentRequest.reason}
            </p>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="m-title" className="block text-xs font-medium text-ink-3">
                  Título
                </label>
                <input
                  id="m-title"
                  type="text"
                  required
                  readOnly={!canEdit}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Medley Morada"
                  className={`${inputClass} min-h-11 sm:min-h-9`}
                />
              </div>

              <div>
                <label htmlFor="m-notes" className="block text-xs font-medium text-ink-3">
                  Observação <span className="text-ink-4">(opcional)</span>
                </label>
                <input
                  id="m-notes"
                  type="text"
                  readOnly={!canEdit}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: Repetir o coro 2x no final"
                  className={`${inputClass} min-h-11 sm:min-h-9`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="m-lyrics" className="block text-xs font-medium text-ink-3">
                Letra
              </label>
              <textarea
                id="m-lyrics"
                rows={6}
                required
                readOnly={!canEdit}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder={
                  canEdit
                    ? 'Cole a letra aqui ou use Importar letra. Separe as estrofes com uma linha em branco.'
                    : 'Letra ainda não enviada pela equipe de Música.'
                }
                className={`${inputClass} resize-y py-2 leading-relaxed`}
              />
            </div>

            {canEdit && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {creatingNew && selectedSong && (
                  <button type="button" onClick={cancelNewSong} className={BTN_SECONDARY}>
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-rb-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold sm:min-h-9"
                >
                  {isNew ? 'Adicionar música' : 'Salvar letra'}
                </button>
              </div>
            )}

            {docFeedback && (
              <p
                role="status"
                className={`rounded-lg border px-3 py-2 text-xs text-ink-2 ${FEEDBACK_TONE[docFeedback.tone]}`}
              >
                {docFeedback.text}
              </p>
            )}
          </form>

          {/* Pré-visualização dos slides como saem no Holyrics */}
          <div className="space-y-3 border-t border-line-soft pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Slides</h3>
              {previewSlides.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyVersion(previewMode)}
                    className={BTN_SECONDARY}
                  >
                    {copiedVersion === previewMode ? (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    ) : (
                      <Copy className="h-4 w-4 shrink-0" />
                    )}
                    <span>{copiedVersion === previewMode ? 'Copiado' : 'Copiar texto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadVersionTxt(previewMode)}
                    className={BTN_SECONDARY}
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Baixar .txt</span>
                  </button>
                </div>
              )}
            </div>

            {previewSlides.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-ink-3">
                {canEdit
                  ? 'Os slides aparecem aqui assim que houver letra.'
                  : 'Sem slides: a letra ainda não foi enviada.'}
              </p>
            ) : (
              <>
                <div
                  role="group"
                  aria-label="Versão dos slides"
                  className="grid w-full grid-cols-2 gap-1 rounded-lg border border-line bg-sunken p-1 sm:inline-grid sm:w-auto"
                >
                  {(
                    [
                      ['two', 'Principal · 2 linhas'],
                      ['one', 'Retorno/Studio · 1 linha'],
                    ] as const
                  ).map(([mode, label]) => {
                    const active = previewMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={active}
                        onClick={() => changePreviewMode(mode)}
                        className={`min-h-10 rounded-md px-3 text-xs font-medium leading-tight transition-colors sm:min-h-8 ${
                          active
                            ? 'bg-surface text-ink ring-1 ring-line'
                            : 'text-ink-3 hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Telão: simula a projeção, por isso fica sempre escuro */}
                <div className="mx-auto w-full max-w-[28rem] space-y-2">
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black px-6 text-center">
                    <span className="font-mono-tech absolute top-2 left-3 text-[11px] text-white/50">
                      {safeIdx + 1}/{previewSlides.length}
                    </span>
                    <p className="text-lg leading-snug font-semibold whitespace-pre-line text-white sm:text-xl">
                      {activeSlideText}
                    </p>
                  </div>

                  {activeNote && (
                    <p className="text-xs text-ink-2">
                      <span className="font-medium text-attn">Nota do slide {safeIdx + 1}:</span>{' '}
                      {activeNote}
                    </p>
                  )}

                  <div className={`grid gap-2 ${canEdit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                      type="button"
                      disabled={safeIdx === 0}
                      onClick={() => setCurrentSlideIdx((i) => Math.max(0, i - 1))}
                      className={`${BTN_SECONDARY} px-2`}
                    >
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                      <span className="truncate">Anterior</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openSlideNoteEditor(activeKey)}
                        className={`${BTN_SECONDARY} px-2`}
                      >
                        {activeNote ? (
                          <MessageSquareText className="h-4 w-4 shrink-0" />
                        ) : (
                          <MessageSquarePlus className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{activeNote ? 'Editar nota' : 'Adicionar nota'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={safeIdx >= previewSlides.length - 1}
                      onClick={() =>
                        setCurrentSlideIdx((i) => Math.min(previewSlides.length - 1, i + 1))
                      }
                      className={`${BTN_SECONDARY} px-2`}
                    >
                      <span className="truncate">Próximo</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Todos os slides: toque para mostrar no telão, ícone para anotar */}
                <ol className="grid gap-2 sm:grid-cols-2">
                  {previewSlides.map((slideText, idx) => {
                    const slideKey = `${previewMode}-${idx}`;
                    const existingNote = slideNotes[slideKey];
                    const isEditingThis = activeSlideKey === slideKey;
                    const isActiveSlide = idx === safeIdx;

                    return (
                      <li
                        key={slideKey}
                        className={`overflow-hidden rounded-lg border ${
                          isActiveSlide
                            ? 'border-accent ring-1 ring-accent'
                            : existingNote
                              ? 'border-attn/50'
                              : 'border-line'
                        }`}
                      >
                        <div className="flex">
                          <button
                            type="button"
                            onClick={() => setCurrentSlideIdx(idx)}
                            aria-current={isActiveSlide ? 'true' : undefined}
                            title="Mostrar no telão"
                            className="relative flex min-h-16 flex-1 items-center justify-center bg-black px-6 py-2 text-center"
                          >
                            <span className="font-mono-tech absolute top-1 left-2 text-[10px] text-white/50">
                              {idx + 1}
                            </span>
                            <span className="text-[13px] leading-snug font-medium whitespace-pre-line text-white">
                              {slideText}
                            </span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openSlideNoteEditor(slideKey)}
                              aria-label={`${existingNote ? 'Editar' : 'Adicionar'} nota do slide ${idx + 1}`}
                              title={existingNote ? 'Editar nota' : 'Adicionar nota'}
                              className={`inline-flex w-11 shrink-0 items-center justify-center border-l border-line-soft bg-surface hover:bg-ink/5 ${
                                existingNote ? 'text-attn' : 'text-ink-3 hover:text-ink'
                              }`}
                            >
                              {existingNote ? (
                                <MessageSquareText className="h-4 w-4" />
                              ) : (
                                <MessageSquarePlus className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {existingNote && !isEditingThis && (
                          <p className="border-t border-line-soft bg-surface px-2.5 py-1.5 text-xs text-ink-2">
                            <span className="font-medium text-attn">Nota:</span> {existingNote}
                          </p>
                        )}

                        {isEditingThis && (
                          <div className="space-y-2 border-t border-line-soft bg-surface p-2">
                            <label htmlFor={`note-${slideKey}`} className="sr-only">
                              Nota do slide {idx + 1}
                            </label>
                            <input
                              id={`note-${slideKey}`}
                              type="text"
                              autoFocus
                              value={slideNoteDraft}
                              onChange={(e) => setSlideNoteDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveSlideNote(slideKey);
                                } else if (e.key === 'Escape') {
                                  setActiveSlideKey(null);
                                }
                              }}
                              placeholder="Ex.: Atenção na entrada do coro"
                              className="min-h-11 w-full rounded-md border border-line bg-sunken px-2.5 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none sm:min-h-9 sm:text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                              <button
                                type="button"
                                onClick={() => setActiveSlideKey(null)}
                                className={BTN_SECONDARY}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => saveSlideNote(slideKey)}
                                className="btn-rb-primary inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold sm:min-h-9"
                              >
                                Salvar nota
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
