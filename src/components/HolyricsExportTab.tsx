import { useState } from 'react';
import { CheckCircle2, Download, FileArchive, FolderTree, Info } from 'lucide-react';
import type { ServiceState } from '../types/portal';
import { HOLYRICS_SPECS } from '../data/initialState';
import { generateAndDownloadHolyricsZip, sanitizeSlug } from '../utils/holyrics';

interface HolyricsExportTabProps {
  state: ServiceState;
  uploadedFilesMap: Map<string, File>;
  onPackageGenerated: (zipName: string, count: number) => void;
}

export function HolyricsExportTab({
  state,
  uploadedFilesMap,
  onPackageGenerated,
}: HolyricsExportTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportInfo, setLastExportInfo] = useState<{
    filename: string;
    fileCount: number;
  } | null>(null);

  const sortedRun = state.runItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedSongs = state.songs.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const result = await generateAndDownloadHolyricsZip(state, uploadedFilesMap);
      setLastExportInfo(result);
      onPackageGenerated(result.filename, result.fileCount);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Action Card */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-[#0095FF]" />
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                Gerador de Pacote Completo para Holyrics (.ZIP)
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Gera o roteiro estruturado, os arquivos <span className="font-mono-tech">.txt</span> de todas as letras e as pastas de mídias já separadas e numeradas na ordem exata do culto.
            </p>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportZip()}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0095FF] px-6 text-sm font-semibold text-white hover:bg-[#0080DC] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Compactando pacote...' : 'Baixar Pacote .ZIP do Culto'}</span>
          </button>
        </div>

        {lastExportInfo && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Pacote <strong>{lastExportInfo.filename}</strong> gerado com {lastExportInfo.fileCount}{' '}
              itens organizados!
            </span>
          </div>
        )}

        {/* Package Tree Preview */}
        <div className="mt-5 rounded-xl border border-zinc-800 bg-[#08090C] p-4 text-zinc-200">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#38BDF8]">
            <FolderTree className="h-4 w-4" />
            <span>Estrutura da pasta compactada gerada:</span>
          </div>
          <pre className="font-mono-tech overflow-x-auto text-xs leading-relaxed text-zinc-300">
{`Culto_${state.serviceDate}_${state.programmingTeam}_Holyrics.zip
├── 00_Roteiro_e_Importacao/
│   ├── roteiro_culto.txt
│   ├── culto_holyrics.json
│   └── script_holyrics_import.js
├── 01_Letras_Musicas_TXT/
${sortedSongs
  .map(
    (s) =>
      `│   ├── ${String(s.orderIndex).padStart(2, '0')}_${sanitizeSlug(s.title)}.txt`,
  )
  .join('\n')}
│   └── todas_musicas_semana.txt
└── 02_Midias_do_Culto/
${sortedRun
  .filter((r) => r.requiresMedia || state.mediaAssets.some((m) => m.runItemId === r.id))
  .map(
    (r) =>
      `    ├── ${String(r.orderIndex).padStart(2, '0')}_${sanitizeSlug(r.title).slice(0, 32)}/`,
  )
  .join('\n')}`}
          </pre>
        </div>
      </section>

      {/* Official Holyrics Accepted Formats Guide */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-[#F5C41E]" />
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Especificações Oficiais de Mídias Aceitas (Holyrics + Palco Nova Jovens 2)
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {HOLYRICS_SPECS.map((spec) => (
            <article
              key={spec.category}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-[#171B24]"
            >
              <h4 className="text-base font-semibold text-zinc-950 dark:text-white">
                {spec.title}
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {spec.acceptedExtensions.map((ext) => (
                  <span
                    key={ext}
                    className="font-mono-tech rounded-md border border-[#0095FF]/30 bg-[#0095FF]/10 px-2 py-0.5 text-xs font-medium text-[#38BDF8]"
                  >
                    {ext}
                  </span>
                ))}
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Padrão recomendado
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{spec.recommended}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Resolução / Estrutura
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{spec.resolutionRule}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Observação operacional
                  </dt>
                  <dd className="text-xs text-zinc-600 dark:text-zinc-400">{spec.notes}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
