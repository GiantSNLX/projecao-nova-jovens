import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Music,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { Role, ServiceSong } from '../types/portal';
import { formatLyricsForHolyrics, sanitizeSlug } from '../utils/holyrics';

interface MusicTabProps {
  songs: ServiceSong[];
  activeRole: Role;
  activeUserName: string;
  isFrozen: boolean;
  onAddSong: (song: Omit<ServiceSong, 'id' | 'orderIndex'>) => void;
  onToggleApproveSong: (songId: string) => void;
  onRemoveSong: (songId: string) => void;
}

export function MusicTab({
  songs,
  activeRole,
  activeUserName,
  isFrozen,
  onAddSong,
  onToggleApproveSong,
  onRemoveSong,
}: MusicTabProps) {
  const canEditMusic =
    activeRole === 'ADMIN' || activeRole === 'CAPTAIN' || activeRole === 'MUSIC';
  const canApprove = activeRole === 'ADMIN' || activeRole === 'CAPTAIN';

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('G');
  const [bpm, setBpm] = useState('72');
  const [rawLyrics, setRawLyrics] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0]?.id ?? '');
  const [batchText, setBatchText] = useState('');

  const selectedSong = songs.find((s) => s.id === selectedSongId) ?? songs[0];

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawLyrics.trim()) return;
    const numericBpm = bpm ? Number(bpm) : undefined;
    const holyricsTxt = formatLyricsForHolyrics(rawLyrics, title, artist, key, numericBpm);

    onAddSong({
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim(),
      bpm: numericBpm,
      rawLyrics: rawLyrics.trim(),
      holyricsTxt,
      approved: false,
      notes: notes.trim() || undefined,
      addedBy: activeUserName,
    });

    setTitle('');
    setArtist('');
    setRawLyrics('');
    setNotes('');
  };

  const handleBatchImport = () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    for (const line of lines) {
      const [songTitle, songArtist = '', songKey = ''] = line.split('-').map((p) => p.trim());
      if (!songTitle) continue;
      const sampleBody = `[Verso 1]\nLetra pendente de conferência para ${songTitle}\n\n[Coro]\nInserir estrofes antes do Cutoff`;
      onAddSong({
        title: songTitle,
        artist: songArtist,
        key: songKey || 'C',
        rawLyrics: sampleBody,
        holyricsTxt: formatLyricsForHolyrics(sampleBody, songTitle, songArtist, songKey || 'C'),
        approved: false,
        addedBy: activeUserName,
      });
    }
    setBatchText('');
  };

  const downloadSingleTxt = (song: ServiceSong) => {
    const blob = new Blob([song.holyricsTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(song.orderIndex).padStart(2, '0')}_${sanitizeSlug(song.title)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Import Form */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:col-span-5 dark:border-white/10 dark:bg-[#12151C]">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-[#0095FF]" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Importar Músicas da Semana
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            As letras são quebradas automaticamente em blocos de 2 a 4 linhas no padrão Widescreen do Holyrics.
          </p>

          <form onSubmit={handleSubmitSingle} className="mt-4 space-y-3">
            <div>
              <label htmlFor="song-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome da música
              </label>
              <input
                id="song-title"
                type="text"
                required
                disabled={!canEditMusic || isFrozen}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Santo Pra Sempre"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label htmlFor="song-key" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tom
                </label>
                <input
                  id="song-key"
                  type="text"
                  disabled={!canEditMusic || isFrozen}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="song-bpm" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  BPM
                </label>
                <input
                  id="song-bpm"
                  type="number"
                  disabled={!canEditMusic || isFrozen}
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="song-artist" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ministro/Banda
                </label>
                <input
                  id="song-artist"
                  type="text"
                  disabled={!canEditMusic || isFrozen}
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="song-lyrics" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Letra (separe estrofes com uma linha vazia)
              </label>
              <textarea
                id="song-lyrics"
                rows={6}
                required
                disabled={!canEditMusic || isFrozen}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder={'[Verso 1]\nLinha 1\nLinha 2\n\n[Coro]\nLinha 1\nLinha 2'}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="song-notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Observação para a mesa
              </label>
              <input
                id="song-notes"
                type="text"
                disabled={!canEditMusic || isFrozen}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Repetir o refrão no final"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={!canEditMusic || isFrozen}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0080DC] disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Música ao Culto</span>
            </button>
          </form>

          {/* Batch quick import */}
          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-white/10">
            <label htmlFor="batch-songs" className="block text-sm font-semibold text-zinc-900 dark:text-white">
              Importação rápida em lote (1 por linha)
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Formato: <span className="font-mono-tech">Título - Artista - Tom</span>
            </p>
            <textarea
              id="batch-songs"
              rows={3}
              disabled={!canEditMusic || isFrozen}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={'Milagre - Morada - D\nVitorioso És - Gabriel Guedes - A'}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-base text-zinc-900 dark:border-white/15 dark:bg-[#181C25] dark:text-white"
            />
            <button
              type="button"
              disabled={!canEditMusic || isFrozen || !batchText.trim()}
              onClick={handleBatchImport}
              className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-45 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              <Wand2 className="h-4 w-4 text-[#0095FF]" />
              <span>Importar Lista</span>
            </button>
          </div>
        </section>

        {/* Songs List & Holyrics TXT Preview */}
        <section className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Repertório da Semana ({songs.length} músicas)
            </h3>

            <div className="mt-4 space-y-2.5">
              {songs
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((song) => (
                  <div
                    key={song.id}
                    onClick={() => setSelectedSongId(song.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
                      selectedSong?.id === song.id
                        ? 'border-[#0095FF] bg-[#0095FF]/10'
                        : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 dark:border-white/10 dark:bg-[#171B24] dark:hover:bg-[#1D222E]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tech rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-white/10">
                            {String(song.orderIndex).padStart(2, '0')}
                          </span>
                          <span className="text-base font-semibold text-zinc-950 dark:text-white">
                            {song.title}
                          </span>
                          <span className="font-mono-tech rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-white/15 dark:text-zinc-300">
                            Tom {song.key}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {song.artist || 'Artista não informado'} · Enviado por {song.addedBy}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => downloadSingleTxt(song)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>.TXT</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => onToggleApproveSong(song.id)}
                          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-60 ${
                            song.approved
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-[#F5C41E]/15 text-[#F5C41E]'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{song.approved ? 'Aprovada' : 'Aprovar'}</span>
                        </button>

                        {canEditMusic && !isFrozen && (
                          <button
                            type="button"
                            aria-label={`Remover ${song.title}`}
                            onClick={() => onRemoveSong(song.id)}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {selectedSong && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0095FF]" />
                  <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                    Prévia .TXT para Importação no Holyrics
                  </h3>
                </div>
                <span className="font-mono-tech text-xs text-zinc-500 dark:text-zinc-400">
                  {String(selectedSong.orderIndex).padStart(2, '0')}_{sanitizeSlug(selectedSong.title)}.txt
                </span>
              </div>
              <pre className="font-mono-tech mt-3 max-h-80 overflow-auto rounded-xl border border-zinc-800 bg-[#08090C] p-4 text-sm whitespace-pre-wrap text-zinc-100">
                {selectedSong.holyricsTxt}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
