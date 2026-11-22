import { useState } from 'react';
import { CheckCircle2, Download, Plus, Trash2 } from 'lucide-react';
import type { ServiceSong } from '../types/portal';
import { formatLyricsForHolyrics, sanitizeSlug } from '../utils/holyrics';

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

  const selectSong = (song: ServiceSong) => {
    setCreatingNew(false);
    setSelectedId(song.id);
    setTitle(song.title);
    setArtist(song.artist);
    setKey(song.key);
    setRawLyrics(song.rawLyrics);
  };

  const startNewSong = () => {
    setCreatingNew(true);
    setTitle('');
    setArtist('');
    setKey('');
    setRawLyrics('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawLyrics.trim()) return;

    const holyricsTxt = formatLyricsForHolyrics(rawLyrics, title, artist, key);

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
        holyricsTxt,
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
        holyricsTxt,
        addedBy: activeUserName,
      });
    }
  };

  const downloadSingleTxt = (song: ServiceSong) => {
    const content =
      song.holyricsTxt ||
      formatLyricsForHolyrics(song.rawLyrics || '[Verso 1]\nSem letra', song.title, song.artist, song.key);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.songCode ? `${song.songCode}_` : ''}${sanitizeSlug(song.title)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Músicas</h1>
          <p className="mt-1 text-sm text-zinc-400">
            As músicas puxadas do roteiro (M1, M2, M3, M4...) aparecem aqui para o Ministério de Música preencher a letra no padrão Holyrics.
          </p>
        </div>

        {canEditMusic && !isFrozen && (
          <button
            type="button"
            onClick={startNewSong}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/12 px-3.5 text-sm font-medium text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar música extra</span>
          </button>
        )}
      </div>

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
                      {hasLyrics ? 'Letra pronta para Holyrics' : 'Aguardando letra'}
                      {song.key ? ` · Tom ${song.key}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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

        {/* Editor da música selecionada + preview .txt Holyrics */}
        <section className="space-y-4 rounded-xl border border-white/10 bg-[#12141A] p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              {creatingNew
                ? 'Nova música'
                : `${selectedSong?.songCode ?? ''} · Editar letra para a Projeção`}
            </h2>
            {selectedSong && !creatingNew && (
              <button
                type="button"
                onClick={() => downloadSingleTxt(selectedSong)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar .TXT</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="m-title" className="block text-sm font-medium text-zinc-300">
                  Música
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
                Letra (separe os slides com uma linha vazia)
              </label>
              <textarea
                id="m-lyrics"
                rows={7}
                required
                disabled={!canEditMusic || isFrozen}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                placeholder={'[Verso 1]\nCole a letra aqui...\n\n[Coro]\n...'}
                className="mt-1 w-full rounded-lg border border-white/12 bg-[#0B0C0F] p-3 text-base text-white placeholder:text-zinc-600 disabled:opacity-60"
              />
            </div>

            {canEditMusic && !isFrozen && (
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar letra e enviar para o Culto</span>
              </button>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
