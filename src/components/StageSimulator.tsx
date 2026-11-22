import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Grid,
  Pause,
  Play,
  Repeat,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StageScreen } from '../types/portal';
import { formatDuration, validateMediaForHolyrics } from '../utils/holyrics';

interface StageSimulatorProps {
  screens: StageScreen[];
  initialUrl?: string;
  initialFilename?: string;
}

type FitMode = 'contain' | 'cover' | 'blur';
type StageMode = 'mirror' | 'split';
type MobileFocus = 'ALL' | 'CENTER' | 'SIDES';

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
  fitMode: FitMode,
  showSafeZone: boolean,
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

  ctx.fillStyle = '#07080B';
  ctx.fillRect(0, 0, cw, ch);

  if (source && sourceW > 0 && sourceH > 0) {
    const srcRatio = sourceW / sourceH;
    const dstRatio = cw / ch;

    if (fitMode === 'blur') {
      ctx.save();
      ctx.filter = 'blur(20px) brightness(0.42)';
      let bw = cw;
      let bh = ch;
      if (srcRatio > dstRatio) {
        bw = ch * srcRatio;
      } else {
        bh = cw / srcRatio;
      }
      ctx.drawImage(source, (cw - bw) / 2, (ch - bh) / 2, bw, bh);
      ctx.restore();

      let fw = cw;
      let fh = ch;
      if (srcRatio > dstRatio) {
        fh = cw / srcRatio;
      } else {
        fw = ch * srcRatio;
      }
      ctx.drawImage(source, (cw - fw) / 2, (ch - fh) / 2, fw, fh);
    } else if (fitMode === 'cover') {
      let dw = cw;
      let dh = ch;
      if (srcRatio > dstRatio) {
        dw = ch * srcRatio;
      } else {
        dh = cw / srcRatio;
      }
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    } else {
      let dw = cw;
      let dh = ch;
      if (srcRatio > dstRatio) {
        dh = cw / srcRatio;
      } else {
        dw = ch * srcRatio;
      }
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
  } else {
    ctx.fillStyle = '#0D1017';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, cw - 32, ch - 32);

    ctx.fillStyle = '#F4F5F7';
    ctx.font = '600 21px "Host Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(screenLabel, cw / 2, ch / 2 - 8);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(`${screenResolution} · 16:9`, cw / 2, ch / 2 + 20);
  }

  if (showLyricsOverlay) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, ch * 0.62, cw, ch * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.font = '600 25px "Host Grotesk", sans-serif';
    ctx.fillText('Pai, eu amo Tua presença', cw / 2, ch * 0.75);
    ctx.fillText('Teu sorriso é vida em mim', cw / 2, ch * 0.84);
    ctx.restore();
  }

  if (showSafeZone) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(245, 196, 30, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cw * 0.05, ch * 0.05, cw * 0.9, ch * 0.9);
    ctx.restore();
  }
}

export function StageSimulator({
  screens,
  initialUrl,
  initialFilename,
}: StageSimulatorProps) {
  const [primaryMedia, setPrimaryMedia] = useState<LoadedPreviewMedia | null>(null);
  const [sideMedia, setSideMedia] = useState<LoadedPreviewMedia | null>(null);

  const [stageMode, setStageMode] = useState<StageMode>('mirror');
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [mobileFocus, setMobileFocus] = useState<MobileFocus>('ALL');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoop, setIsLoop] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const primaryImgRef = useRef<HTMLImageElement | null>(null);
  const sideVideoRef = useRef<HTMLVideoElement | null>(null);
  const sideImgRef = useRef<HTMLImageElement | null>(null);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const centerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftScreen = screens.find((s) => s.code === 'LEFT') ?? screens[0];
  const centerScreen = screens.find((s) => s.code === 'CENTER') ?? screens[1];
  const rightScreen = screens.find((s) => s.code === 'RIGHT') ?? screens[2];

  const loadLocalFile = useCallback(async (file: File, target: 'primary' | 'side') => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'].includes(ext);
    if (!isVideo && !isImage) return;

    const url = URL.createObjectURL(file);

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        const loaded: LoadedPreviewMedia = {
          url,
          filename: file.name,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: file.size,
        };
        if (target === 'primary') {
          primaryImgRef.current = img;
          setPrimaryMedia(loaded);
          setIsPlaying(false);
          setDuration(0);
          setCurrentTime(0);
        } else {
          sideImgRef.current = img;
          setSideMedia(loaded);
        }
      };
      img.src = url;
      return;
    }

    const vid = document.createElement('video');
    vid.preload = 'auto';
    vid.muted = true;
    vid.playsInline = true;
    vid.onloadedmetadata = () => {
      const loaded: LoadedPreviewMedia = {
        url,
        filename: file.name,
        kind: 'video',
        width: vid.videoWidth,
        height: vid.videoHeight,
        duration: Number.isFinite(vid.duration) ? vid.duration : 0,
        fileSizeBytes: file.size,
      };
      if (target === 'primary') {
        setPrimaryMedia(loaded);
        setDuration(loaded.duration ?? 0);
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        setSideMedia(loaded);
      }
    };
    vid.src = url;
  }, []);

  useEffect(() => {
    if (!initialUrl || !initialFilename) return;
    const ext = initialFilename.slice(initialFilename.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    if (isVideo) {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        setPrimaryMedia({
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
      };
      vid.src = initialUrl;
    } else {
      const img = new Image();
      img.onload = () => {
        primaryImgRef.current = img;
        setPrimaryMedia({
          url: initialUrl,
          filename: initialFilename,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: 0,
        });
      };
      img.src = initialUrl;
    }
  }, [initialUrl, initialFilename]);

  const loadSample = (ratio: '16:9' | '9:16') => {
    const offscreen = document.createElement('canvas');
    offscreen.width = ratio === '16:9' ? 1920 : 1080;
    offscreen.height = ratio === '16:9' ? 1080 : 1920;
    const octx = offscreen.getContext('2d');
    if (!octx) return;

    octx.fillStyle = '#0D1829';
    octx.fillRect(0, 0, offscreen.width, offscreen.height);
    octx.strokeStyle = '#0095FF';
    octx.lineWidth = 10;
    octx.strokeRect(36, 36, offscreen.width - 72, offscreen.height - 72);

    octx.fillStyle = '#FFFFFF';
    octx.textAlign = 'center';
    octx.font = '700 84px sans-serif';
    octx.fillText('NOVA JOVENS 2', offscreen.width / 2, offscreen.height / 2 - 20);

    octx.fillStyle = '#F5C41E';
    octx.font = '500 40px monospace';
    octx.fillText(`${ratio} · ${offscreen.width}×${offscreen.height}`, offscreen.width / 2, offscreen.height / 2 + 52);

    const dataUrl = offscreen.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      primaryImgRef.current = img;
      setPrimaryMedia({
        url: dataUrl,
        filename: ratio === '16:9' ? 'exemplo_16x9.png' : 'exemplo_vertical_9x16.png',
        kind: 'image',
        width: offscreen.width,
        height: offscreen.height,
        fileSizeBytes: 500_000,
      });
      setIsPlaying(false);
    };
    img.src = dataUrl;
  };

  useEffect(() => {
    const pv = primaryVideoRef.current;
    const sv = sideVideoRef.current;
    if (pv) {
      pv.loop = isLoop;
      pv.muted = isMuted;
      if (isPlaying) {
        pv.play().catch(() => setIsPlaying(false));
      } else {
        pv.pause();
      }
    }
    if (sv) {
      sv.loop = isLoop;
      sv.muted = true;
      if (isPlaying) {
        sv.play().catch(() => undefined);
      } else {
        sv.pause();
      }
    }
  }, [isPlaying, isLoop, isMuted, primaryMedia, sideMedia]);

  useEffect(() => {
    let rafId = 0;

    const render = () => {
      const pv = primaryVideoRef.current;
      const sv = sideVideoRef.current;

      const centerSource =
        primaryMedia?.kind === 'video'
          ? pv
          : primaryMedia?.kind === 'image'
            ? primaryImgRef.current
            : null;
      const centerW = primaryMedia?.width ?? 0;
      const centerH = primaryMedia?.height ?? 0;

      const useSplitSide = stageMode === 'split' && sideMedia !== null;
      const sideSource = useSplitSide
        ? sideMedia.kind === 'video'
          ? sv
          : sideImgRef.current
        : centerSource;
      const sideW = useSplitSide ? sideMedia.width : centerW;
      const sideH = useSplitSide ? sideMedia.height : centerH;

      drawFrameToCanvas(
        leftCanvasRef.current,
        sideSource,
        sideW,
        sideH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        leftScreen.label,
        `${leftScreen.widthPx}×${leftScreen.heightPx}`,
      );

      drawFrameToCanvas(
        centerCanvasRef.current,
        centerSource,
        centerW,
        centerH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        centerScreen.label,
        `${centerScreen.widthPx}×${centerScreen.heightPx}`,
      );

      drawFrameToCanvas(
        rightCanvasRef.current,
        sideSource,
        sideW,
        sideH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        rightScreen.label,
        `${rightScreen.widthPx}×${rightScreen.heightPx}`,
      );

      if (pv && primaryMedia?.kind === 'video') {
        setCurrentTime(pv.currentTime || 0);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    primaryMedia,
    sideMedia,
    stageMode,
    fitMode,
    showSafeZone,
    showLyricsOverlay,
    leftScreen,
    centerScreen,
    rightScreen,
  ]);

  const handleSeek = (nextTime: number) => {
    setCurrentTime(nextTime);
    if (primaryVideoRef.current) primaryVideoRef.current.currentTime = nextTime;
    if (sideVideoRef.current) sideVideoRef.current.currentTime = nextTime;
  };

  const validation = primaryMedia
    ? validateMediaForHolyrics({
        filename: primaryMedia.filename,
        fileSizeBytes: primaryMedia.fileSizeBytes || 10_000_000,
        widthPx: primaryMedia.width,
        heightPx: primaryMedia.height,
        screens,
      })
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#12141A] p-4 sm:p-5">
      {primaryMedia?.kind === 'video' && (
        <video
          ref={primaryVideoRef}
          src={primaryMedia.url}
          className="hidden"
          playsInline
          onEnded={() => {
            if (!isLoop) setIsPlaying(false);
          }}
        />
      )}
      {sideMedia?.kind === 'video' && (
        <video ref={sideVideoRef} src={sideMedia.url} className="hidden" playsInline muted />
      )}

      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Simulador dos 3 telões (16:9)
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            Dê play para ver como vídeo ou imagem fica no Telão Central ({centerScreen.widthPx}×{centerScreen.heightPx}) e nas Laterais ({leftScreen.widthPx}×{leftScreen.heightPx}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white hover:bg-[#0082E0]">
            <Upload className="h-4 w-4" />
            <span>Testar arquivo</span>
            <input
              type="file"
              accept="video/*,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadLocalFile(f, 'primary');
              }}
            />
          </label>

          {stageMode === 'split' && (
            <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/12 px-3.5 text-sm font-medium text-zinc-200 hover:bg-white/5">
              <Upload className="h-4 w-4" />
              <span>Arquivo laterais</span>
              <input
                type="file"
                accept="video/*,image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void loadLocalFile(f, 'side');
                }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => loadSample('16:9')}
            className="min-h-[44px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300 hover:bg-white/5"
          >
            Teste 16:9
          </button>
          <button
            type="button"
            onClick={() => loadSample('9:16')}
            className="min-h-[44px] rounded-lg border border-white/12 px-3 text-xs font-medium text-zinc-300 hover:bg-white/5"
          >
            Teste vertical
          </button>
        </div>
      </div>

      {/* Mobile screen focus */}
      <div className="mt-4 flex gap-1.5 md:hidden">
        {(['ALL', 'CENTER', 'SIDES'] as MobileFocus[]).map((focus) => (
          <button
            key={focus}
            type="button"
            onClick={() => setMobileFocus(focus)}
            className={`min-h-[44px] flex-1 rounded-lg border text-xs font-medium ${
              mobileFocus === focus
                ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                : 'border-white/10 text-zinc-400'
            }`}
          >
            {focus === 'ALL' ? '3 telas' : focus === 'CENTER' ? 'Central' : 'Laterais'}
          </button>
        ))}
      </div>

      {/* 3-Screen Stage */}
      <div className="mt-4 rounded-xl border border-white/10 bg-[#07080B] p-3 sm:p-4">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:gap-4">
          <div className={`w-full md:flex-1 ${mobileFocus === 'CENTER' ? 'hidden md:block' : 'block'}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
              <span>{leftScreen.label}</span>
              <span className="font-mono-tech">{leftScreen.widthPx}×{leftScreen.heightPx}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/12 bg-black">
              <canvas ref={leftCanvasRef} width={640} height={360} className="h-full w-full" />
            </div>
          </div>

          <div className={`w-full md:flex-[1.2] ${mobileFocus === 'SIDES' ? 'hidden md:block' : 'block'}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
              <span className="font-medium text-white">{centerScreen.label}</span>
              <span className="font-mono-tech text-[#0095FF]">{centerScreen.widthPx}×{centerScreen.heightPx}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-[#0095FF]/60 bg-black">
              <canvas ref={centerCanvasRef} width={768} height={432} className="h-full w-full" />
            </div>
          </div>

          <div className={`w-full md:flex-1 ${mobileFocus === 'CENTER' ? 'hidden md:block' : 'block'}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
              <span>{rightScreen.label}</span>
              <span className="font-mono-tech">{rightScreen.widthPx}×{rightScreen.heightPx}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/12 bg-black">
              <canvas ref={rightCanvasRef} width={640} height={360} className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* Playback bar */}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={primaryMedia?.kind !== 'video'}
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pausar' : 'Play nas 3 telas'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLoop((l) => !l)}
              aria-label="Repetir vídeo"
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border ${
                isLoop ? 'border-[#0095FF] text-[#0095FF]' : 'border-white/12 text-zinc-400'
              }`}
            >
              <Repeat className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label="Áudio"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/12 text-zinc-300"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {primaryMedia?.kind === 'video' && (
            <div className="flex flex-1 items-center gap-3 sm:max-w-sm">
              <span className="font-mono-tech text-xs text-zinc-400">{formatDuration(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                aria-label="Progresso do vídeo"
                className="h-2 w-full accent-[#0095FF]"
              />
              <span className="font-mono-tech text-xs text-zinc-400">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Simple options */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStageMode((m) => (m === 'mirror' ? 'split' : 'mirror'))}
          className={`min-h-[44px] rounded-lg border px-3.5 text-xs font-medium ${
            stageMode === 'split'
              ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
              : 'border-white/12 text-zinc-300'
          }`}
        >
          {stageMode === 'mirror' ? 'Modo: Mesma mídia nas 3' : 'Modo: Central + Laterais'}
        </button>

        {(['contain', 'cover', 'blur'] as FitMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFitMode(mode)}
            className={`min-h-[44px] rounded-lg border px-3 text-xs font-medium ${
              fitMode === mode
                ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                : 'border-white/12 text-zinc-400'
            }`}
          >
            {mode === 'contain' ? 'Ajuste: Conter' : mode === 'cover' ? 'Ajuste: Preencher' : 'Ajuste: Blur bordas'}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowLyricsOverlay((v) => !v)}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
            showLyricsOverlay
              ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
              : 'border-white/12 text-zinc-400'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Simular letra por cima</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSafeZone((v) => !v)}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
            showSafeZone
              ? 'border-[#F5C41E]/60 bg-[#F5C41E]/12 text-[#F5C41E]'
              : 'border-white/12 text-zinc-400'
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Margem segura</span>
        </button>
      </div>

      {primaryMedia && validation && (
        <div
          className={`mt-4 rounded-lg border p-3.5 text-sm ${
            validation.status === 'VALID'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-zinc-200'
              : 'border-[#F5C41E]/40 bg-[#F5C41E]/10 text-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 font-medium">
            <span className="flex items-center gap-2">
              {validation.status === 'VALID' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[#F5C41E]" />
              )}
              {primaryMedia.filename}
            </span>
            <span className="font-mono-tech text-xs text-zinc-400">
              {primaryMedia.width}×{primaryMedia.height}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-300">{validation.messages[0]}</p>
        </div>
      )}
    </div>
  );
}
