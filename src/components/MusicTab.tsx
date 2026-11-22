import { useState } from 'react';
import { CheckCircle2, Download, Plus, Trash2 } from 'lucide-react';
import type { ServiceSong } from '../types/portal';
import { formatLyricsForHolyrics, sanitizeSlug } from '../utils/holyrics';

interface MusicTabProps {
  songs: ServiceSong[];
  canEditMusic: boolean;
  canApprove: boolean;
  activeUserName: string;
  isFrozen: boolean;
  onAddSong: (song: Omit<ServiceSong, 'id' | 'orderIndex'>) => void;
  onToggleApproveSong: (songId: string) => void;
  onRemoveSong: (songId: string) => void;
}

export function MusicTab({
  songs,
  canEditMusic,
  canApprove,
  activeUserName,
  isFrozen,
  onAddSong,
  onToggleApproveSong,
  onRemoveSong,
}: MusicTabProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('G');
  const [bpm, setBpm] = useState('72');
  const [rawLyrics, setRawLyrics] = useState('');
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
      addedBy: activeUserName,
    });

    setTitle('');
    setArtist('');
    setRawLyrics('');
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
      const body = `[Verso 1]\nInserir letra de ${songTitle}\n\n[Coro]\nSeparar blocos por linha vazia`;
      onAddSong({
        title: songTitle,
        artist: songArtist,
        key: songKey || 'C',
        rawLyrics: body,
        holyricsTxt: formatLyricsForHolyrics(body, songTitle, songArtist, songKey || 'C'),
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
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Músicas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Importe as músicas da semana. O sistema já formata os blocos no padrão de slides do Holyrics.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form */}
        <section className="rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-5">
          <h2 className="text-base font-semibold text-white">Adicionar música</h2>

          <form onSubmit={handleSubmitSingle} className="mt-4 space-y-3">
            <div>
              <label htmlFor="song-title" className="block text-sm font-medium text-zinc-300">
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
                className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="song-key" className="block text-sm font-medium text-zinc-300">
                  Tom
                </label>
                <input
                  id="song-key"
                  type="text"
                  disabled={!canEditMusic || isFrozen}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="song-bpm" className="block text-sm font-medium text-zinc-300">
                  BPM
                </label>
                <input
                  id="song-bpm"
                  type="number"
                  disabled={!canEditMusic || isFrozen}
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="song-artist" className="block text-sm font-medium text-zinc-300">
                  Banda
                </label>
                <input
                  id="song-artist"
                  type="text"
                  disabled={!canEditMusic || isFrozen}
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/12 bg-[#0B0C0F] px-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="song-lyrics" className="block text-sm font-medium text-zinc-300">
                Letra (deixe uma linha vazia entre estrofes)
              </label>
              <textarea
                id="song-lyrics"
                rows={6}
                required
                disabled={!canEditMusic || isFrozen}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder={'[Verso 1]\nLinha 1\nLinha 2\n\n[Coro]\nLinha 1\nLinha 2'}
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!canEditMusic || isFrozen}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>Importar música</span>
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5">
            <label htmlFor="batch-songs" className="block text-sm font-medium text-zinc-300">
              Ou colar lista rápida (Título - Banda - Tom)
            </label>
            <textarea
              id="batch-songs"
              rows={3}
              disabled={!canEditMusic || isFrozen}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={'Milagre - Morada - D\nVitorioso És - Gabriel Guedes - A'}
              className="mt-1.5 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 focus:border-[#0095FF] focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              disabled={!canEditMusic || isFrozen || !batchText.trim()}
              onClick={handleBatchImport}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/12 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40"
            >
              Importar lista
            </button>
          </div>
        </section>

        {/* Songs list & preview */}
        <section className="space-y-6 lg:col-span-7">
          <div className="divide-y divide-white/8 rounded-xl border border-white/10 bg-[#12141A]">
            {songs
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((song) => {
                const isSelected = selectedSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => setSelectedSongId(song.id)}
                    className={`flex cursor-pointer flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? 'bg-[#0095FF]/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tech text-xs text-zinc-500">
                          {String(song.orderIndex).padStart(2, '0')}
                        </span>
                        <span className="text-base font-medium text-white">{song.title}</span>
                        <span className="font-mono-tech text-xs text-zinc-400">
                          Tom {song.key}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        {song.artist || 'Sem artista'} · {song.addedBy}
                      </p>
                    </div>

                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => downloadSingleTxt(song)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
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
                            ? 'border border-emerald-500/35 bg-emerald-500/12 text-emerald-300'
                            : 'border border-[#F5C41E]/35 bg-[#F5C41E]/12 text-[#F5C41E]'
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
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 text-zinc-400 hover:border-red-500/40 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {selectedSong && (
            <div className="rounded-xl border border-white/10 bg-[#12141A] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-white">
                  Arquivo Holyrics ({selectedSong.title})
                </span>
                <span className="font-mono-tech text-xs text-zinc-400">
                  {String(selectedSong.orderIndex).padStart(2, '0')}_{sanitizeSlug(selectedSong.title)}.txt
                </span>
              </div>
              <pre className="font-mono-tech mt-3 max-h-72 overflow-auto rounded-lg border border-white/8 bg-[#0B0C0F] p-3.5 text-sm whitespace-pre-wrap text-zinc-200">
                {selectedSong.holyricsTxt}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
