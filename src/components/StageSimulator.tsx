import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Pause, Play, Type } from 'lucide-react';
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

  const isValid = validation?.status === 'VALID';
  // Alertas da validação, sem as confirmações positivas; travessão vira ponto e vírgula
  const warningNotes =
    validation?.status === 'WARNING'
      ? validation.messages
          .filter((msg) => !/validada|compatível|aceito/i.test(msg))
          .map((msg) => msg.replace(/\s+[—–]\s+/g, '; '))
      : [];

  const screenFrames = [
    {
      key: 'CENTER',
      name: 'Central',
      screen: centerScreen,
      ref: centerCanvasRef,
      w: 960,
      h: 540,
      wrapper: 'col-span-2 @md:order-2 @md:col-span-6',
      resolutionClass: '',
    },
    {
      key: 'LEFT',
      name: 'Esquerda',
      screen: leftScreen,
      ref: leftCanvasRef,
      w: 640,
      h: 360,
      wrapper: '@md:order-1 @md:col-span-3',
      resolutionClass: '@md:hidden @2xl:inline',
    },
    {
      key: 'RIGHT',
      name: 'Direita',
      screen: rightScreen,
      ref: rightCanvasRef,
      w: 640,
      h: 360,
      wrapper: '@md:order-3 @md:col-span-3',
      resolutionClass: '@md:hidden @2xl:inline',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Simulação das telas</h2>

        <button
          type="button"
          aria-pressed={showLyricsOverlay}
          onClick={() => setShowLyricsOverlay((v) => !v)}
          className={`btn-rb-surface inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium sm:min-h-9 ${
            showLyricsOverlay ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink-2'
          }`}
        >
          <Type className="h-4 w-4" />
          <span>Sobrepor letra</span>
        </button>
      </div>

      {media?.kind === 'video' && (
        <video ref={videoRef} src={media.url} className="hidden" playsInline muted />
      )}

      {/* Moldura segue o tema; as telas ficam pretas porque representam a projeção real */}
      <div className="@container rounded-lg border border-line bg-sunken p-2.5 sm:p-3">
        <div className="grid grid-cols-2 items-end gap-2 @md:grid-cols-12">
          {screenFrames.map((f) => (
            <div key={f.key} className={`min-w-0 space-y-1 ${f.wrapper}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span
                  className={`truncate ${f.key === 'CENTER' ? 'font-medium text-ink' : 'text-ink-3'}`}
                >
                  {f.name}
                </span>
                <span className={`font-mono-tech shrink-0 text-[11px] text-ink-4 ${f.resolutionClass}`}>
                  {f.screen.widthPx}×{f.screen.heightPx}
                </span>
              </div>
              <div className="aspect-video overflow-hidden rounded border border-line-strong bg-black">
                <canvas
                  ref={f.ref}
                  width={f.w}
                  height={f.h}
                  role="img"
                  aria-label={`Prévia da tela ${f.name.toLowerCase()} (${f.screen.widthPx}×${f.screen.heightPx})`}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Controles de reprodução quando há vídeo nas telas */}
        {media?.kind === 'video' && (
          <div className="mt-2.5 flex items-center gap-2.5 border-t border-line pt-2.5">
            <button
              type="button"
              onClick={() => togglePlay(!isPlaying)}
              aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
              className="btn-rb-primary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white sm:h-9 sm:w-9"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <span className="font-mono-tech w-11 text-xs text-ink-2">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              aria-label="Posição do vídeo"
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent"
            />
            <span className="font-mono-tech w-11 text-right text-xs text-ink-3">
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {/* Formatos aceitos */}
        <div className="mt-2.5 border-t border-line pt-2 text-xs text-ink-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p>
              Aceitos: vídeo 16:9 (.mp4, .mov), imagem 16:9 (.png, .jpg), áudio de fundo (.mp3,
              .wav) e slides (.pdf).
            </p>

            <button
              type="button"
              aria-expanded={showFormatNote}
              onClick={() => setShowFormatNote((v) => !v)}
              className="inline-flex min-h-11 items-center gap-1.5 text-ink-2 hover:text-ink sm:min-h-0"
            >
              <Info className="h-4 w-4" />
              <span>{showFormatNote ? 'Ocultar especificações' : 'Especificações'}</span>
            </button>
          </div>

          {showFormatNote && (
            <p className="mt-1.5 text-ink-2">
              Tela central 3840×2160; laterais 3200×1800 ou 1920×1080, sempre em 16:9. Arquivos
              verticais (9:16) e PPT/PPTX são recusados automaticamente.
            </p>
          )}
        </div>
      </div>

      {media && validation && validation.status !== 'REJECTED' && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
            isValid ? 'border-ok/30 bg-ok/10' : 'border-attn/40 bg-attn/10'
          }`}
        >
          {isValid ? (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-ok" />
          ) : (
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-attn" />
          )}
          <div className="min-w-0">
            <p className={`font-medium ${isValid ? 'text-ok' : 'text-attn'}`}>
              {isValid ? 'Compatível com as telas' : 'Compatível, com alerta'}
            </p>
            <p className="truncate font-mono-tech text-ink-2" title={media.filename}>
              {media.filename} · {media.width}×{media.height}
            </p>
            {warningNotes.map((note) => (
              <p key={note} className="text-ink-2">
                {note}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
