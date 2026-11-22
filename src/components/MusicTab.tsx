import { useState } from 'react';
import { CheckCircle2, Copy, Download, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
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
  const sortedSongs = songs.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const [selectedId, setSelectedId] = useState<string>(sortedSongs[0]?.id ?? '');

  const selectedSong = sortedSongs.find((s) => s.id === selectedId) ?? sortedSongs[0];

  const [title, setTitle] = useState(selectedSong?.title ?? '');
  const [artist, setArtist] = useState(selectedSong?.artist ?? '');
  const [key, setKey] = useState(selectedSong?.key ?? '');
  const [rawLyrics, setRawLyrics] = useState(selectedSong?.rawLyrics ?? '');
  const [creatingNew, setCreatingNew] = useState(false);

  const [previewMode, setPreviewMode] = useState<'two' | 'one'>('two');
  const [extractingDoc, setExtractingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<string | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  const selectSong = (song: ServiceSong) => {
    setCreatingNew(false);
    setDocFeedback(null);
    setSelectedId(song.id);
    setTitle(song.title);
    setArtist(song.artist);
    setKey(song.key);
    setRawLyrics(song.rawLyrics);
  };

  const startNewSong = () => {
    setCreatingNew(true);
    setDocFeedback(null);
    setTitle('');
    setArtist('');
    setKey('');
    setRawLyrics('');
  };

  const liveVersions = formatHolyricsVersions(rawLyrics, title);

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
          `Letra extraída de "${file.name}". Confira e clique em "Salvar e enviar para o Culto".`,
        );
      } else {
        // Multiple songs in a single PDF/PPTX -> match M1..Mn or add them directly
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
              artist: '',
              key: '',
              rawLyrics: item.rawLyrics,
              holyricsTxt: item.twoLinesTxt,
              holyricsOneLineTxt: item.oneLineTxt,
              holyricsTwoLinesTxt: item.twoLinesTxt,
              approved: false,
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
        artist: artist.trim(),
        key: key.trim(),
        rawLyrics: rawLyrics.trim(),
        holyricsTxt: twoLinesTxt,
        holyricsOneLineTxt: oneLineTxt,
        holyricsTwoLinesTxt: twoLinesTxt,
        approved: false,
        addedBy: activeUserName,
      };
      onSaveOrAddSong(newSong);
      setCreatingNew(false);
      setSelectedId(newSong.id);
    } else {
      onSaveOrAddSong({
        ...selectedSong,
        title: title.trim(),
        artist: artist.trim(),
        key: key.trim(),
        rawLyrics: rawLyrics.trim(),
        holyricsTxt: twoLinesTxt,
        holyricsOneLineTxt: oneLineTxt,
        holyricsTwoLinesTxt: twoLinesTxt,
        addedBy: activeUserName,
      });
    }

    setDocFeedback('Letra salva nas versões Principal (2 linhas) e Retorno/Studio (1 linha) e enviada para o Culto.');
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
            Suba o PDF ou PPTX (ou cole a letra). O portal prepara automático para o Holyrics 2.29.1 em <strong>1 linha</strong> (Retorno/Studio) e <strong>2 linhas</strong> (Principal) e envia direto para o Culto.
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
                <span>{extractingDoc ? 'Lendo arquivo...' : 'Importar PDF ou PPTX'}</span>
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
        {/* Lista das músicas vindas do roteiro */}
        <section className="lg:col-span-5">
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {sortedSongs.map((song) => {
              const hasLyrics = song.rawLyrics.trim().length > 0;
              const isSelected = !creatingNew && selectedSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  className={`flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors ${
                    isSelected ? 'bg-[#0095FF]/12' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-xs font-semibold text-[#38BDF8]">
                        {song.songCode ?? `M${song.orderIndex}`}
                      </span>
                      <span className="truncate text-base font-medium text-white">
                        {song.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {hasLyrics
                        ? '1 linha (Retorno/Studio) e 2 linhas (Principal) prontos'
                        : 'Aguardando letra'}
                      {song.key ? ` · Tom ${song.key}` : ''}
                    </p>
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

        {/* Editor + Dual Preview (1 linha e 2 linhas) */}
        <section className="space-y-5 rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-7">
          <h2 className="text-base font-semibold text-white">
            {creatingNew
              ? 'Nova música'
              : `${selectedSong?.songCode ?? ''} · Letra original (ordem fiel)`}
          </h2>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
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
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="m-key" className="block text-sm font-medium text-zinc-300">
                  Tom
                </label>
                <input
                  id="m-key"
                  type="text"
                  disabled={!canEditMusic || isFrozen}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Ex.: G"
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="m-artist" className="block text-sm font-medium text-zinc-300">
                Banda / Ministro
              </label>
              <input
                id="m-artist"
                type="text"
                disabled={!canEditMusic || isFrozen}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex.: Morada"
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="m-lyrics" className="block text-sm font-medium text-zinc-300">
                Letra fiel (sem título dentro, mantendo repetições e ordem exata)
              </label>
              <textarea
                id="m-lyrics"
                rows={6}
                required
                disabled={!canEditMusic || isFrozen}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder={'Cole a letra ou importe o PDF/PPTX acima...'}
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 disabled:opacity-60"
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

          {/* Preview das duas versões geradas para Holyrics 2.29.1 */}
          {rawLyrics.trim() && (
            <div className="border-t border-white/10 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-lg border border-white/12 bg-[#0B0C0F] p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('two')}
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
                    onClick={() => setPreviewMode('one')}
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

              <pre className="font-mono-tech mt-3 max-h-60 overflow-auto rounded-lg border border-white/8 bg-[#0B0C0F] p-3.5 text-sm whitespace-pre-wrap text-zinc-200">
                {previewMode === 'two' ? liveVersions.twoLinesTxt : liveVersions.oneLineTxt}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
