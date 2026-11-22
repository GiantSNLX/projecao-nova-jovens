import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Loader2,
  MessageSquarePlus,
  Plus,
  Trash2,
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
  const [activeSlideKey, setActiveSlideKey] = useState<string | null>(null);
  const [slideNoteDraft, setSlideNoteDraft] = useState('');

  const [extractingDoc, setExtractingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<string | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  const selectSong = (song: ServiceSong) => {
    setCreatingNew(false);
    setDocFeedback(null);
    setActiveSlideKey(null);
    setSelectedId(song.id);
    setTitle(song.title);
    setRawLyrics(song.rawLyrics);
    setNotes(song.notes ?? '');
    setSlideNotes(song.slideNotes ?? {});
  };

  const startNewSong = () => {
    setCreatingNew(true);
    setDocFeedback(null);
    setActiveSlideKey(null);
    setTitle('');
    setRawLyrics('');
    setNotes('');
    setSlideNotes({});
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
        setDocFeedback('Nenhum texto encontrado nesse arquivo.');
        return;
      }

      if (extracted.length === 1) {
        const item = extracted[0];
        if (!title.trim() || creatingNew) {
          setTitle(item.title);
        }
        setRawLyrics(item.rawLyrics);
        setDocFeedback(
          `Letra extraída de "${file.name}". Confira os slides abaixo e clique em "Salvar e enviar para o Culto".`,
        );
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
        setDocFeedback(
          `${extracted.length} músicas extraídas de "${file.name}" e enviadas para o Culto (1 linha e 2 linhas).`,
        );
      }
    } catch (err) {
      setDocFeedback(
        err instanceof Error ? err.message : 'Erro ao ler o PDF/PPTX.',
      );
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

    setDocFeedback(
      'Letra e observações salvas e enviadas para o Culto (Principal 2 linhas + Retorno/Studio 1 linha).',
    );
  };

  const openSlideNoteEditor = (slideKey: string) => {
    if (!canEditMusic || isFrozen) return;
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Músicas</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Anexe o PDF/PPTX/TXT ou cole a letra antes mesmo do roteiro. Visualize como aparecerá no Culto e deixe notas em slides específicos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEditMusic && !isFrozen && (
            <>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0]">
                {extractingDoc ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                <span>{extractingDoc ? 'Lendo arquivo...' : 'Importar PDF / PPTX / TXT'}</span>
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

              <button
                type="button"
                onClick={startNewSong}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/12 px-3.5 text-sm font-medium text-white hover:bg-white/5"
              >
                <Plus className="h-4 w-4" />
                <span>Nova música</span>
              </button>
            </>
          )}
        </div>
      </div>

      {docFeedback && (
        <div className="rounded-lg border border-[#0095FF]/35 bg-[#0095FF]/10 px-4 py-3 text-sm text-zinc-100">
          {docFeedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Lista das músicas */}
        <section className="lg:col-span-5">
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {sortedSongs.map((song) => {
              const hasLyrics = song.rawLyrics.trim().length > 0;
              const isSelected = !creatingNew && selectedSong?.id === song.id;
              const slideNoteCount = song.slideNotes ? Object.keys(song.slideNotes).length : 0;

              return (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  className={`flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors ${
                    isSelected ? 'bg-[#0095FF]/12' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tech text-xs font-semibold text-[#38BDF8]">
                        {song.songCode ?? `M${song.orderIndex}`}
                      </span>
                      <span className="truncate text-base font-medium text-white">
                        {song.title}
                      </span>
                      {song.validatedBySchedule && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          Validada no roteiro
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {hasLyrics ? 'Letra pronta para o Culto' : 'Aguardando letra'}
                      {slideNoteCount > 0 ? ` · ${slideNoteCount} nota(s) em slide` : ''}
                    </p>
                    {song.notes && (
                      <p className="mt-1 truncate text-xs text-zinc-300">Obs.: {song.notes}</p>
                    )}
                    {song.adjustmentRequest && (
                      <p className="mt-1 text-xs font-medium text-[#F5C41E]">
                        Ajuste pedido: {song.adjustmentRequest.reason}
                      </p>
                    )}
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => onToggleApproveSong(song.id)}
                        className={`min-h-[38px] rounded-lg px-2.5 text-xs font-semibold ${
                          song.approved
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-[#F5C41E]/15 text-[#F5C41E]'
                        }`}
                      >
                        {song.approved ? 'OK' : 'Aprovar'}
                      </button>
                    )}

                    {canEditMusic && !isFrozen && (
                      <button
                        type="button"
                        aria-label={`Remover ${song.title}`}
                        onClick={() => onRemoveSong(song.id)}
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-white/12 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Editor + Prévia por Slide (com nota por slide) */}
        <section className="space-y-5 rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-7">
          <h2 className="text-base font-semibold text-white">
            {creatingNew
              ? 'Nova música'
              : `${selectedSong?.songCode ?? ''} · Letra e notas para o Culto`}
          </h2>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label htmlFor="m-title" className="block text-sm font-medium text-zinc-300">
                Nome da música
              </label>
              <input
                id="m-title"
                type="text"
                required
                disabled={!canEditMusic || isFrozen}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Medley Morada"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="m-lyrics" className="block text-sm font-medium text-zinc-300">
                Letra fiel (sem título dentro, mantendo repetições e ordem exata)
              </label>
              <textarea
                id="m-lyrics"
                rows={5}
                required
                disabled={!canEditMusic || isFrozen}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder="Cole a letra ou importe o PDF/PPTX/TXT acima..."
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="m-notes" className="block text-sm font-medium text-zinc-300">
                Observação ou pedido para a Projeção (opcional)
              </label>
              <input
                id="m-notes"
                type="text"
                disabled={!canEditMusic || isFrozen}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Repetir o coro 2x no final se o dirigente puxar..."
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 disabled:opacity-60"
              />
            </div>

            {canEditMusic && !isFrozen && (
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar e enviar para o Culto</span>
              </button>
            )}
          </form>

          {/* Pré-visualização real de como vai ficar no Culto + Nota por slide específico */}
          {previewSlides.length > 0 && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-lg border border-white/12 bg-[#0B0C0F] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode('two');
                      setActiveSlideKey(null);
                    }}
                    className={`min-h-[38px] rounded-md px-3 text-xs font-semibold ${
                      previewMode === 'two'
                        ? 'bg-[#0095FF] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Principal (2 linhas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode('one');
                      setActiveSlideKey(null);
                    }}
                    className={`min-h-[38px] rounded-md px-3 text-xs font-semibold ${
                      previewMode === 'one'
                        ? 'bg-[#0095FF] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Retorno / Studio (1 linha)
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyVersion(previewMode)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedVersion === previewMode ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadVersionTxt(previewMode)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>.TXT</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Prévia de como aparecerá no telão. Toque em um slide para deixar uma nota específica para a mesa.
              </p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {previewSlides.map((slideText, idx) => {
                  const slideKey = `${previewMode}-${idx}`;
                  const existingNote = slideNotes[slideKey];
                  const isEditingThis = activeSlideKey === slideKey;

                  return (
                    <div
                      key={slideKey}
                      className={`rounded-lg border p-3 transition ${
                        existingNote
                          ? 'border-[#F5C41E]/45 bg-[#08090C]'
                          : 'border-white/10 bg-[#08090C]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono-tech text-[11px] text-zinc-500">
                          Slide {idx + 1}
                        </span>
                        {canEditMusic && !isFrozen && (
                          <button
                            type="button"
                            onClick={() => openSlideNoteEditor(slideKey)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#38BDF8] hover:underline"
                          >
                            <MessageSquarePlus className="h-3 w-3" />
                            <span>{existingNote ? 'Editar nota' : 'Nota'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex min-h-[68px] items-center justify-center rounded border border-white/8 bg-black px-3 py-2.5 text-center text-sm font-medium whitespace-pre-line text-white">
                        {slideText}
                      </div>

                      {existingNote && !isEditingThis && (
                        <p className="mt-2 rounded bg-[#F5C41E]/10 px-2 py-1 text-xs text-[#F5C41E]">
                          Nota: {existingNote}
                        </p>
                      )}

                      {isEditingThis && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            value={slideNoteDraft}
                            onChange={(e) => setSlideNoteDraft(e.target.value)}
                            placeholder="Ex.: Pular este slide se não repetir..."
                            className="min-h-[38px] w-full rounded border border-white/15 bg-[#12141A] px-2.5 text-xs text-white focus:border-[#0095FF] focus:outline-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveSlideKey(null)}
                              className="rounded border border-white/12 px-2.5 py-1 text-xs text-zinc-400"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => saveSlideNote(slideKey)}
                              className="rounded bg-[#0095FF] px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Salvar nota
                            </button>
                          </div>
                        </div>
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
