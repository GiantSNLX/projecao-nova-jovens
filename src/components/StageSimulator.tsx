import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Info, Pause, Play } from 'lucide-react';
import type { StageScreen } from '../types/portal';
import { formatDuration, validateMediaForHolyrics } from '../utils/holyrics';

interface StageSimulatorProps {
  screens: StageScreen[];
  initialUrl?: string;
  initialFilename?: string;
  externalPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

interface LoadedPreviewMedia {
  url: string;
  filename: string;
  kind: 'video' | 'image';
  width: number;
  height: number;
  duration?: number;
  fileSizeBytes: number;
}

function drawFrameToCanvas(
  canvas: HTMLCanvasElement | null,
  source: HTMLVideoElement | HTMLImageElement | null,
  sourceW: number,
  sourceH: number,
  showLyricsOverlay: boolean,
  screenLabel: string,
  screenResolution: string,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  ctx.fillStyle = '#06070A';
  ctx.fillRect(0, 0, cw, ch);

  if (source && sourceW > 0 && sourceH > 0) {
    const srcRatio = sourceW / sourceH;
    const dstRatio = cw / ch;
    let dw = cw;
    let dh = ch;
    if (srcRatio > dstRatio) {
      dh = cw / srcRatio;
    } else {
      dw = ch * srcRatio;
    }
    ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#0B0D13';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, cw - 28, ch - 28);

    ctx.fillStyle = '#F4F5F7';
    ctx.font = '600 20px "Host Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(screenLabel, cw / 2, ch / 2 - 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText(screenResolution, cw / 2, ch / 2 + 18);
  }

  if (showLyricsOverlay) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, ch * 0.62, cw, ch * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.font = '600 24px "Host Grotesk", sans-serif';
    ctx.fillText('Pai, eu amo Tua presença', cw / 2, ch * 0.75);
    ctx.fillText('Teu sorriso é vida em mim', cw / 2, ch * 0.84);
    ctx.restore();
  }
}

export function StageSimulator({
  screens,
  initialUrl,
  initialFilename,
  externalPlaying,
  onPlayingChange,
}: StageSimulatorProps) {
  const [media, setMedia] = useState<LoadedPreviewMedia | null>(null);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [showFormatNote, setShowFormatNote] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const centerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftScreen = screens.find((s) => s.code === 'LEFT') ?? screens[0];
  const centerScreen = screens.find((s) => s.code === 'CENTER') ?? screens[1];
  const rightScreen = screens.find((s) => s.code === 'RIGHT') ?? screens[2];

  const togglePlay = (next: boolean) => {
    setIsPlaying(next);
    onPlayingChange?.(next);
  };

  useEffect(() => {
    if (externalPlaying !== undefined) {
      setIsPlaying(externalPlaying);
    }
  }, [externalPlaying]);

  useEffect(() => {
    if (!initialUrl || !initialFilename) return;
    const ext = initialFilename.slice(initialFilename.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    if (isVideo) {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        setMedia({
          url: initialUrl,
          filename: initialFilename,
          kind: 'video',
          width: vid.videoWidth,
          height: vid.videoHeight,
          duration: vid.duration,
          fileSizeBytes: 0,
        });
        setDuration(vid.duration || 0);
        setIsPlaying(true);
        onPlayingChange?.(true);
      };
      vid.src = initialUrl;
    } else {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setMedia({
          url: initialUrl,
          filename: initialFilename,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: 0,
        });
        setIsPlaying(false);
        onPlayingChange?.(false);
      };
      img.src = initialUrl;
    }
  }, [initialUrl, initialFilename, onPlayingChange]);

  useEffect(() => {
    const pv = videoRef.current;
    if (!pv) return;
    pv.loop = true;
    pv.muted = true;
    if (isPlaying) {
      pv.play().catch(() => setIsPlaying(false));
    } else {
      pv.pause();
    }
  }, [isPlaying, media]);

  useEffect(() => {
    let rafId = 0;

    const render = () => {
      const pv = videoRef.current;
      const source =
        media?.kind === 'video' ? pv : media?.kind === 'image' ? imgRef.current : null;
      const w = media?.width ?? 0;
      const h = media?.height ?? 0;

      drawFrameToCanvas(
        leftCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        leftScreen.label,
        `${leftScreen.widthPx}×${leftScreen.heightPx}`,
      );

      drawFrameToCanvas(
        centerCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        centerScreen.label,
        `${centerScreen.widthPx}×${centerScreen.heightPx}`,
      );

      drawFrameToCanvas(
        rightCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        rightScreen.label,
        `${rightScreen.widthPx}×${rightScreen.heightPx}`,
      );

      if (pv && media?.kind === 'video') {
        setCurrentTime(pv.currentTime || 0);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [media, showLyricsOverlay, leftScreen, centerScreen, rightScreen]);

  const handleSeek = (nextTime: number) => {
    setCurrentTime(nextTime);
    if (videoRef.current) videoRef.current.currentTime = nextTime;
  };

  const validation = media
    ? validateMediaForHolyrics({
        filename: media.filename,
        fileSizeBytes: media.fileSizeBytes,
        widthPx: media.width,
        heightPx: media.height,
        screens,
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Telões (3 painéis)</h2>

        <button
          type="button"
          onClick={() => setShowLyricsOverlay((v) => !v)}
          className={`btn-rb-surface inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
            showLyricsOverlay
              ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
              : 'border-white/12 text-zinc-300'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Testar letra</span>
        </button>
      </div>

      {media?.kind === 'video' && (
        <video ref={videoRef} src={media.url} className="hidden" playsInline muted />
      )}

      {/* Palco com os 3 telões + formatos aceitos integrados discretamente na base */}
      <div className="rounded-xl border border-white/10 bg-[#08090C] p-3">
        <div className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate">Esquerda</span>
              <span className="font-mono-tech hidden sm:inline">
                {leftScreen.widthPx}×{leftScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded border border-white/12 bg-black aspect-video">
              <canvas
                ref={leftCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="col-span-6 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-300">
              <span className="truncate font-semibold text-white">Central</span>
              <span className="font-mono-tech">
                {centerScreen.widthPx}×{centerScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded-md border border-[#0095FF]/40 bg-black aspect-video">
              <canvas
                ref={centerCanvasRef}
                width={960}
                height={540}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="col-span-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate">Direita</span>
              <span className="font-mono-tech hidden sm:inline">
                {rightScreen.widthPx}×{rightScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded border border-white/12 bg-black aspect-video">
              <canvas
                ref={rightCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Barra de reprodução quando um vídeo está no telão */}
        {media?.kind === 'video' && (
          <div className="mt-2.5 flex items-center gap-2.5 border-t border-white/8 pt-2.5">
            <button
              type="button"
              onClick={() => togglePlay(!isPlaying)}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="btn-rb-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>

            <span className="font-mono-tech w-10 text-[11px] text-zinc-300">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-[#0095FF]"
            />
            <span className="font-mono-tech w-10 text-right text-[11px] text-zinc-500">
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {/* Tipos aceitos discretos dentro da base do Telão */}
        <div className="mt-2.5 border-t border-white/8 pt-2 text-[11px] text-zinc-400">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                <strong className="text-zinc-200">Vídeo 16:9</strong> .mp4/.mov
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                <strong className="text-zinc-200">Imagem 16:9</strong> .png/.jpg
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                <strong className="text-zinc-200">BG</strong> .mp3/.wav
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                <strong className="text-zinc-200">Slides</strong> .pdf
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowFormatNote((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              <Info className="h-3 w-3 text-[#F5C41E]" />
              <span>{showFormatNote ? 'Fechar' : 'Regras'}</span>
            </button>
          </div>

          {showFormatNote && (
            <p className="mt-1.5 rounded bg-[#12141A] px-2.5 py-1.5 text-[11px] text-zinc-400">
              Central 3840×2160 · Laterais 3200×1800 (ou 1920×1080) em 16:9. Arquivos verticais (9:16) e PPT/PPTX são bloqueados automaticamente.
            </p>
          )}
        </div>
      </div>

      {media && validation && validation.status !== 'REJECTED' && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            validation.status === 'VALID'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-[#F5C41E]/35 bg-[#F5C41E]/10 text-[#FDE68A]'
          }`}
        >
          {validation.status === 'VALID' ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#F5C41E]" />
          )}
          <span className="truncate font-medium text-white">
            {media.filename} ({media.width}×{media.height})
          </span>
        </div>
      )}
    </div>
  );
}
