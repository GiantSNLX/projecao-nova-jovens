import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_SERVICE_STATE,
} from './data/initialState';
import type {
  AttendanceStatus,
  AuditLogEntry,
  LiveItemStatus,
  MdoEntry,
  MediaAsset,
  ProgrammingTeam,
  Role,
  RunItem,
  SaturdayVerseRecord,
  ScreenCode,
  ServiceSong,
  ServiceState,
  TabId,
} from './types/portal';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { OverviewDeskTab } from './components/OverviewDeskTab';
import { LiveControlTab } from './components/LiveControlTab';
import { MusicTab } from './components/MusicTab';
import { ProgrammingTab } from './components/ProgrammingTab';
import { DevotionalTab } from './components/DevotionalTab';
import { HolyricsExportTab } from './components/HolyricsExportTab';
import { GovernanceTab } from './components/GovernanceTab';

const STORAGE_KEY = 'projecao-nova-jovens-v1';

function loadInitialState(): ServiceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SERVICE_STATE;
    const parsed = JSON.parse(raw) as ServiceState;
    if (!parsed || !parsed.screens || !parsed.assignments) return INITIAL_SERVICE_STATE;
    return parsed;
  } catch {
    return INITIAL_SERVICE_STATE;
  }
}

export function App() {
  const [state, setState] = useState<ServiceState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<TabId>('escala');
  const [activeUserId, setActiveUserId] = useState<string>(INITIAL_MEMBERS[0].id);
  const [activeRole, setActiveRole] = useState<Role>('CAPTAIN');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('projecao-theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  // In-memory map of actual uploaded binary File objects for real .zip packaging
  const uploadedFilesRef = useRef<Map<string, File>>(new Map());

  const activeUser =
    INITIAL_MEMBERS.find((u) => u.id === activeUserId) ?? INITIAL_MEMBERS[0];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('projecao-theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    try {
      // Strip transient blob objectUrls before persisting JSON
      const serializable: ServiceState = {
        ...state,
        mediaAssets: state.mediaAssets.map(({ objectUrl: _omit, ...rest }) => rest),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const nowTime = () =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const makeAudit = (
    action: string,
    detail: string,
    reason?: string,
  ): AuditLogEntry => ({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowTime(),
    actorName: activeUser.name,
    actorRole: activeRole,
    action,
    detail,
    reason,
  });

  const handleChangeUser = (userId: string) => {
    setActiveUserId(userId);
    const found = INITIAL_MEMBERS.find((m) => m.id === userId);
    if (found && found.roles.length > 0) {
      setActiveRole(found.roles[0]);
    }
  };

  const handleResetDemo = () => {
    uploadedFilesRef.current.clear();
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_SERVICE_STATE);
  };

  const handleUpdateAttendance = (assignmentId: string, status: AttendanceStatus) => {
    setState((prev) => {
      const target = prev.assignments.find((a) => a.id === assignmentId);
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                attendanceStatus: status,
                confirmedAt: status === 'CONFIRMED' ? nowTime() : undefined,
              }
            : a,
        ),
        auditLogs: [
          makeAudit(
            'ATTENDANCE_UPDATED',
            `Presença de ${target?.position ?? ''} alterada para ${status}.`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleToggleServingOnDesk = (assignmentId: string) => {
    setState((prev) => {
      const target = prev.assignments.find((a) => a.id === assignmentId);
      const nextServing = !target?.servingOnDesk;
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                attendanceStatus: nextServing ? 'CONFIRMED' : a.attendanceStatus,
                servingOnDesk: nextServing,
                deskCheckinAt: nextServing ? nowTime() : undefined,
              }
            : a,
        ),
        auditLogs: [
          makeAudit(
            'DESK_CHECKIN',
            `${nextServing ? 'Entrou' : 'Saiu'} da posição ${target?.position ?? ''} na mesa.`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleChangeAssignmentMember = (assignmentId: string, userId: string) => {
    const member = INITIAL_MEMBERS.find((m) => m.id === userId);
    setState((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              userId,
              attendanceStatus: 'PENDING',
              servingOnDesk: false,
              deskCheckinAt: undefined,
            }
          : a,
      ),
      auditLogs: [
        makeAudit(
          'ASSIGNMENT_CHANGED',
          `Escala atualizada para ${member?.name ?? userId}.`,
        ),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleChangeProgrammingTeam = (team: ProgrammingTeam) => {
    setState((prev) => ({
      ...prev,
      programmingTeam: team,
      auditLogs: [
        makeAudit('PROGRAMMING_TEAM_CHANGED', `Equipe da semana definida como ${team}.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleUpdateLiveItem = (itemId: string, status: LiveItemStatus) => {
    setState((prev) => ({
      ...prev,
      runItems: prev.runItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            liveStatus: status,
            liveStartedAt: status === 'CURRENT' ? nowTime() : item.liveStartedAt,
            liveFinishedAt: status === 'DONE' ? nowTime() : item.liveFinishedAt,
          };
        }
        // If putting another block on air, mark previous CURRENT as DONE
        if (status === 'CURRENT' && item.liveStatus === 'CURRENT') {
          return { ...item, liveStatus: 'DONE', liveFinishedAt: nowTime() };
        }
        return item;
      }),
    }));
  };

  const handleToggleServiceLive = () => {
    setState((prev) => {
      const nextLive = prev.status !== 'LIVE';
      return {
        ...prev,
        status: nextLive ? 'LIVE' : 'APPROVED',
        liveStartedAt: nextLive ? nowTime() : prev.liveStartedAt,
        auditLogs: [
          makeAudit(
            nextLive ? 'SERVICE_LIVE_STARTED' : 'SERVICE_LIVE_ENDED',
            nextLive ? 'Culto iniciado em modo Ao Vivo.' : 'Modo Ao Vivo encerrado.',
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleUpdateLiveNotes = (notes: string) => {
    setState((prev) => ({
      ...prev,
      liveNotes: notes,
      auditLogs: [
        makeAudit('LIVE_NOTES_UPDATED', 'Recado operacional da mesa atualizado.'),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleAddSong = (songData: Omit<ServiceSong, 'id' | 'orderIndex'>) => {
    setState((prev) => ({
      ...prev,
      songs: [
        ...prev.songs,
        {
          ...songData,
          id: `sng-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          orderIndex: prev.songs.length + 1,
        },
      ],
      auditLogs: [
        makeAudit('SONG_ADDED', `Música "${songData.title}" adicionada ao culto.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleToggleApproveSong = (songId: string) => {
    setState((prev) => ({
      ...prev,
      songs: prev.songs.map((s) => (s.id === songId ? { ...s, approved: !s.approved } : s)),
    }));
  };

  const handleRemoveSong = (songId: string) => {
    setState((prev) => ({
      ...prev,
      songs: prev.songs
        .filter((s) => s.id !== songId)
        .map((s, idx) => ({ ...s, orderIndex: idx + 1 })),
    }));
  };

  const handleAddRunItem = (item: Omit<RunItem, 'id' | 'orderIndex' | 'liveStatus'>) => {
    setState((prev) => ({
      ...prev,
      runItems: [
        ...prev.runItems,
        {
          ...item,
          id: `run-${Date.now()}`,
          orderIndex: prev.runItems.length + 1,
          liveStatus: 'PENDING',
        },
      ],
      auditLogs: [
        makeAudit('RUN_ITEM_ADDED', `Bloco "${item.title}" inserido no roteiro.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleImportBatchRunItems = (
    items: Omit<RunItem, 'id' | 'orderIndex' | 'liveStatus'>[],
  ) => {
    setState((prev) => ({
      ...prev,
      runItems: [
        ...prev.runItems,
        ...items.map((item, idx) => ({
          ...item,
          id: `run-${Date.now()}-${idx}`,
          orderIndex: prev.runItems.length + idx + 1,
          liveStatus: 'PENDING' as const,
        })),
      ],
      auditLogs: [
        makeAudit('RUN_BATCH_IMPORTED', `${items.length} blocos importados no roteiro.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleAddMediaAsset = (asset: MediaAsset, rawFile?: File) => {
    if (rawFile) {
      uploadedFilesRef.current.set(asset.id, rawFile);
    }
    setState((prev) => ({
      ...prev,
      mediaAssets: [asset, ...prev.mediaAssets],
      auditLogs: [
        makeAudit(
          'MEDIA_UPLOADED',
          `Mídia "${asset.normalizedFilename}" enviada (${asset.validationStatus}).`,
        ),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleToggleApproveMedia = (assetId: string) => {
    setState((prev) => ({
      ...prev,
      mediaAssets: prev.mediaAssets.map((m) =>
        m.id === assetId ? { ...m, approved: !m.approved } : m,
      ),
    }));
  };

  const handleRemoveMediaAsset = (assetId: string) => {
    uploadedFilesRef.current.delete(assetId);
    setState((prev) => ({
      ...prev,
      mediaAssets: prev.mediaAssets.filter((m) => m.id !== assetId),
    }));
  };

  const handleSaveMdo = (entry: MdoEntry) => {
    setState((prev) => {
      const exists = prev.mdoEntries.some((m) => m.id === entry.id);
      return {
        ...prev,
        mdoEntries: exists
          ? prev.mdoEntries.map((m) => (m.id === entry.id ? entry : m))
          : [...prev.mdoEntries, entry],
        auditLogs: [
          makeAudit('MDO_SAVED', `MDO de ${entry.dayLabel} registrado.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleSaveSaturdayVerse = (record: SaturdayVerseRecord) => {
    const listener = INITIAL_MEMBERS.find((m) => m.id === record.spokenToUserId);
    setState((prev) => {
      const exists = prev.saturdayVerses.some((v) => v.id === record.id);
      return {
        ...prev,
        saturdayVerses: exists
          ? prev.saturdayVerses.map((v) => (v.id === record.id ? record : v))
          : [...prev.saturdayVerses, record],
        auditLogs: [
          makeAudit(
            'VERSE_SPOKEN',
            `Versículo falado para ${listener?.name ?? 'Líder'} (${record.verseReference}).`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handlePackageGenerated = (zipName: string, count: number) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [
        makeAudit(
          'PACKAGE_GENERATED',
          `Pacote Holyrics "${zipName}" gerado com ${count} itens.`,
        ),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleUpdateScreen = (code: ScreenCode, widthPx: number, heightPx: number) => {
    setState((prev) => ({
      ...prev,
      screens: prev.screens.map((s) =>
        s.code === code ? { ...s, widthPx, heightPx } : s,
      ),
    }));
  };

  const handleToggleFreeze = (reason?: string) => {
    setState((prev) => {
      const nextFrozen = !prev.isFrozen;
      return {
        ...prev,
        isFrozen: nextFrozen,
        auditLogs: [
          makeAudit(
            nextFrozen ? 'CUTOFF_FROZEN' : 'CUTOFF_OVERRIDE',
            nextFrozen ? 'Envios travados pelo Cutoff.' : 'Envios reabertos por exceção.',
            reason,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0A0B0E] dark:text-[#F5F6F8]">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeUser={activeUser}
        activeRole={activeRole}
        users={INITIAL_MEMBERS}
        onChangeUser={handleChangeUser}
        onChangeRole={setActiveRole}
        programmingTeam={state.programmingTeam}
        serviceDate={state.serviceDate}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onResetDemo={handleResetDemo}
      />

      <main className="mx-auto max-w-[1280px] px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8">
        {activeTab === 'escala' && (
          <OverviewDeskTab
            state={state}
            members={INITIAL_MEMBERS}
            activeUser={activeUser}
            activeRole={activeRole}
            onUpdateAttendance={handleUpdateAttendance}
            onToggleServingOnDesk={handleToggleServingOnDesk}
            onChangeAssignmentMember={handleChangeAssignmentMember}
            onChangeProgrammingTeam={handleChangeProgrammingTeam}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'aovivo' && (
          <LiveControlTab
            state={state}
            members={INITIAL_MEMBERS}
            activeRole={activeRole}
            onUpdateLiveItem={handleUpdateLiveItem}
            onToggleServiceLive={handleToggleServiceLive}
            onUpdateLiveNotes={handleUpdateLiveNotes}
          />
        )}

        {activeTab === 'musicas' && (
          <MusicTab
            songs={state.songs}
            activeRole={activeRole}
            activeUserName={activeUser.name}
            isFrozen={state.isFrozen}
            onAddSong={handleAddSong}
            onToggleApproveSong={handleToggleApproveSong}
            onRemoveSong={handleRemoveSong}
          />
        )}

        {activeTab === 'programacao' && (
          <ProgrammingTab
            state={state}
            activeRole={activeRole}
            activeUserName={activeUser.name}
            onChangeTeam={handleChangeProgrammingTeam}
            onAddRunItem={handleAddRunItem}
            onImportBatchRunItems={handleImportBatchRunItems}
            onAddMediaAsset={handleAddMediaAsset}
            onToggleApproveMedia={handleToggleApproveMedia}
            onRemoveMediaAsset={handleRemoveMediaAsset}
          />
        )}

        {activeTab === 'devocional' && (
          <DevotionalTab
            activeUser={activeUser}
            activeRole={activeRole}
            members={INITIAL_MEMBERS}
            saturdayDate={state.serviceDate}
            mdoEntries={state.mdoEntries}
            saturdayVerses={state.saturdayVerses}
            onSaveMdo={handleSaveMdo}
            onSaveSaturdayVerse={handleSaveSaturdayVerse}
          />
        )}

        {activeTab === 'holyrics' && (
          <HolyricsExportTab
            state={state}
            uploadedFilesMap={uploadedFilesRef.current}
            onPackageGenerated={handlePackageGenerated}
          />
        )}

        {activeTab === 'governanca' && (
          <GovernanceTab
            state={state}
            activeRole={activeRole}
            onUpdateScreen={handleUpdateScreen}
            onToggleFreeze={handleToggleFreeze}
          />
        )}
      </main>

      <footer className="hidden border-t border-zinc-200 py-5 text-center text-xs text-zinc-500 md:block dark:border-white/10 dark:text-zinc-400">
        Projeção Nova Jovens 2 · Padrão Holyrics · Telão Central 3840×2160 (16:9) · Laterais 3200×1800 (16:9)
      </footer>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
