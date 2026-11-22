import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_SERVICE_STATE,
} from './data/initialState';
import type {
  AttendanceStatus,
  AuditLogEntry,
  DeskAssignment,
  LiveItemStatus,
  MdoEntry,
  MediaAsset,
  MemberUser,
  ProgrammingTeam,
  RunItem,
  SaturdaySchedule,
  SaturdayVerseRecord,
  ScreenCode,
  ServiceSong,
  ServiceState,
  TabId,
} from './types/portal';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { InicioTab } from './components/InicioTab';
import { MusicTab } from './components/MusicTab';
import { ProgrammingTab } from './components/ProgrammingTab';
import { CultoTab } from './components/CultoTab';
import { DevotionalTab } from './components/DevotionalTab';
import { EscalasTab } from './components/EscalasTab';
import { ConfiguracoesTab } from './components/ConfiguracoesTab';

const STORAGE_KEY = 'projecao-nova-jovens-v4';
const SESSION_KEY = 'projecao-nova-jovens-session';

function loadInitialState(): ServiceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SERVICE_STATE;
    const parsed = JSON.parse(raw) as ServiceState;
    if (!parsed || !parsed.screens || !parsed.assignments || !parsed.schedules) {
      return INITIAL_SERVICE_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_SERVICE_STATE;
  }
}

function loadSessionUser(): MemberUser | null {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return INITIAL_MEMBERS.find((m) => m.id === userId) ?? null;
  } catch {
    return null;
  }
}

function addSevenDays(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 7));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function App() {
  const [state, setState] = useState<ServiceState>(loadInitialState);
  const [activeUser, setActiveUser] = useState<MemberUser | null>(loadSessionUser);
  const [activeTab, setActiveTab] = useState<TabId>('inicio');

  const uploadedFilesRef = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    try {
      const serializable: ServiceState = {
        ...state,
        mediaAssets: state.mediaAssets.map(({ objectUrl: _omit, ...rest }) => rest),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  if (!activeUser) {
    return (
      <LoginScreen
        members={INITIAL_MEMBERS}
        onLoginSuccess={(member) => {
          setActiveUser(member);
          setActiveTab('inicio');
          try {
            localStorage.setItem(SESSION_KEY, member.id);
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  const isLeader =
    activeUser.roles.includes('ADMIN') || activeUser.roles.includes('CAPTAIN');
  const canEditMusic = isLeader || activeUser.roles.includes('MUSIC');
  const canEditProgramming = isLeader || activeUser.roles.includes('PROGRAMMING');
  const canOperateDesk =
    isLeader ||
    state.assignments.some((a) => a.userId === activeUser.id) ||
    activeUser.roles.includes('MEMBER');

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
    actorRole: activeUser.roles[0] ?? 'MEMBER',
    action,
    detail,
    reason,
  });

  const handleLogout = () => {
    setActiveUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const handleResetDemo = () => {
    uploadedFilesRef.current.clear();
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_SERVICE_STATE);
  };

  const updateScheduleAssignments = (
    prev: ServiceState,
    scheduleDate: string,
    updater: (asgs: DeskAssignment[]) => DeskAssignment[],
  ): { schedules: SaturdaySchedule[]; assignments: DeskAssignment[] } => {
    const schedules = prev.schedules.map((s) =>
      s.date === scheduleDate ? { ...s, assignments: updater(s.assignments) } : s,
    );
    const current = schedules.find((s) => s.date === prev.serviceDate);
    return {
      schedules,
      assignments: current ? current.assignments : prev.assignments,
    };
  };

  const handleUpdateAttendance = (
    scheduleDate: string,
    assignmentId: string,
    status: AttendanceStatus,
  ) => {
    setState((prev) => {
      const targetSched = prev.schedules.find((s) => s.date === scheduleDate);
      const target = targetSched?.assignments.find((a) => a.id === assignmentId);
      const updated = updateScheduleAssignments(prev, scheduleDate, (list) =>
        list.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                attendanceStatus: status,
                confirmedAt: status === 'CONFIRMED' ? nowTime() : undefined,
              }
            : a,
        ),
      );
      return {
        ...prev,
        ...updated,
        auditLogs: [
          makeAudit(
            'Presença',
            `confirmou ${status === 'CONFIRMED' ? 'presença' : 'ausência'} em ${target?.position ?? ''} (${scheduleDate}).`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleToggleServingOnDesk = (scheduleDate: string, assignmentId: string) => {
    setState((prev) => {
      const targetSched = prev.schedules.find((s) => s.date === scheduleDate);
      const target = targetSched?.assignments.find((a) => a.id === assignmentId);
      const nextServing = !target?.servingOnDesk;
      const updated = updateScheduleAssignments(prev, scheduleDate, (list) =>
        list.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                attendanceStatus: nextServing ? 'CONFIRMED' : a.attendanceStatus,
                servingOnDesk: nextServing,
                deskCheckinAt: nextServing ? nowTime() : undefined,
              }
            : a,
        ),
      );
      return {
        ...prev,
        ...updated,
        auditLogs: [
          makeAudit(
            'Mesa',
            `${nextServing ? 'entrou na' : 'saiu da'} posição ${target?.position ?? ''}.`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleChangeAssignmentMember = (
    scheduleDate: string,
    assignmentId: string,
    userId: string,
  ) => {
    const member = INITIAL_MEMBERS.find((m) => m.id === userId);
    setState((prev) => {
      const updated = updateScheduleAssignments(prev, scheduleDate, (list) =>
        list.map((a) =>
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
      );
      return {
        ...prev,
        ...updated,
        auditLogs: [
          makeAudit('Escala', `escalou ${member?.name ?? userId} para ${scheduleDate}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleChangeProgrammingTeam = (team: ProgrammingTeam) => {
    setState((prev) => ({
      ...prev,
      programmingTeam: team,
      auditLogs: [
        makeAudit('Programação', `definiu equipe da programação como ${team}.`),
        ...prev.auditLogs,
      ],
    }));
  };

  const handleAddNextSaturday = () => {
    setState((prev) => {
      const sorted = prev.schedules.slice().sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      const nextDate = addSevenDays(last?.date ?? prev.serviceDate);

      const newSched: SaturdaySchedule = {
        date: nextDate,
        assignments: [
          { id: `s-${nextDate}-1`, position: 'CAPITAO', userId: 'usr-1', attendanceStatus: 'PENDING', servingOnDesk: false },
          { id: `s-${nextDate}-2`, position: 'PRINCIPAL', userId: 'usr-3', attendanceStatus: 'PENDING', servingOnDesk: false },
          { id: `s-${nextDate}-3`, position: 'RETORNO', userId: 'usr-4', attendanceStatus: 'PENDING', servingOnDesk: false },
          { id: `s-${nextDate}-4`, position: 'CORTE', userId: 'usr-5', attendanceStatus: 'PENDING', servingOnDesk: false },
          { id: `s-${nextDate}-5`, position: 'APOIO', userId: 'usr-2', attendanceStatus: 'PENDING', servingOnDesk: false },
        ],
      };

      return {
        ...prev,
        schedules: [...prev.schedules, newSched],
        auditLogs: [
          makeAudit('Escala', `criou escala do sábado ${nextDate}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleReplaceScheduleFromImport = (params: {
    runItems: RunItem[];
    detectedSongs: ServiceSong[];
    detectedDate?: string;
    sourceLabel: string;
  }) => {
    setState((prev) => {
      const mergedSongs: ServiceSong[] = params.detectedSongs.map((ds) => {
        const existing = prev.songs.find(
          (es) =>
            (es.songCode && es.songCode === ds.songCode) ||
            es.title.toLowerCase() === ds.title.toLowerCase(),
        );
        return existing ? { ...existing, songCode: ds.songCode, orderIndex: ds.orderIndex } : ds;
      });

      return {
        ...prev,
        serviceDate: params.detectedDate || prev.serviceDate,
        startsAtTime: params.runItems[0]?.plannedTime || prev.startsAtTime,
        runItems: params.runItems,
        songs: mergedSongs.length > 0 ? mergedSongs : prev.songs,
        auditLogs: [
          makeAudit(
            'Roteiro',
            `importou ${params.runItems.length} momentos via ${params.sourceLabel}.`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
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
          makeAudit('Culto', nextLive ? 'iniciou o culto ao vivo.' : 'encerrou o modo ao vivo.'),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleUpdateLiveNotes = (notes: string) => {
    setState((prev) => ({
      ...prev,
      liveNotes: notes,
      auditLogs: [makeAudit('Mesa', 'atualizou o aviso da mesa.'), ...prev.auditLogs],
    }));
  };

  const handleSaveOrAddSong = (song: ServiceSong) => {
    setState((prev) => {
      const exists = prev.songs.some((s) => s.id === song.id);
      return {
        ...prev,
        songs: exists
          ? prev.songs.map((s) => (s.id === song.id ? song : s))
          : [...prev.songs, song],
        auditLogs: [
          makeAudit('Música', `salvou a letra de "${song.title}".`),
          ...prev.auditLogs,
        ],
      };
    });
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

  const handleAddMediaAsset = (asset: MediaAsset, rawFile?: File) => {
    if (rawFile) {
      uploadedFilesRef.current.set(asset.id, rawFile);
    }
    setState((prev) => ({
      ...prev,
      mediaAssets: [asset, ...prev.mediaAssets],
      auditLogs: [
        makeAudit('Mídia', `enviou "${asset.normalizedFilename}".`),
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
          makeAudit('Versículos', `falou versículos para ${listener?.name ?? 'líder'}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handlePackageGenerated = (zipName: string) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [
        makeAudit('Holyrics', `baixou pacote ${zipName}.`),
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
            'Prazo',
            nextFrozen ? 'travou os envios da semana.' : 'reabriu os envios da semana.',
            reason,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F] text-[#F4F5F7]">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeUser={activeUser}
        isLeader={isLeader}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-[1200px] px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-12 lg:px-8">
        {activeTab === 'inicio' && (
          <InicioTab
            state={state}
            activeUser={activeUser}
            onUpdateAttendance={(id, status) => handleUpdateAttendance(state.serviceDate, id, status)}
            onToggleServingOnDesk={(id) => handleToggleServingOnDesk(state.serviceDate, id)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'musicas' && (
          <MusicTab
            songs={state.songs}
            canEditMusic={canEditMusic}
            isLeader={isLeader}
            activeUserName={activeUser.name}
            isFrozen={state.isFrozen}
            onSaveOrAddSong={handleSaveOrAddSong}
            onToggleApproveSong={handleToggleApproveSong}
            onRemoveSong={handleRemoveSong}
          />
        )}

        {activeTab === 'programacao' && (
          <ProgrammingTab
            state={state}
            canEditProgramming={canEditProgramming}
            isLeader={isLeader}
            activeUserName={activeUser.name}
            onChangeTeam={handleChangeProgrammingTeam}
            onReplaceScheduleFromImport={handleReplaceScheduleFromImport}
            onAddMediaAsset={handleAddMediaAsset}
            onToggleApproveMedia={handleToggleApproveMedia}
            onRemoveMediaAsset={handleRemoveMediaAsset}
          />
        )}

        {activeTab === 'culto' && (
          <CultoTab
            state={state}
            members={INITIAL_MEMBERS}
            canOperateDesk={canOperateDesk}
            uploadedFilesMap={uploadedFilesRef.current}
            onUpdateLiveItem={handleUpdateLiveItem}
            onToggleServiceLive={handleToggleServiceLive}
            onUpdateLiveNotes={handleUpdateLiveNotes}
            onPackageGenerated={(zipName) => handlePackageGenerated(zipName)}
          />
        )}

        {activeTab === 'meditacao' && (
          <DevotionalTab
            activeUser={activeUser}
            isLeader={isLeader}
            members={INITIAL_MEMBERS}
            saturdayDate={state.serviceDate}
            mdoEntries={state.mdoEntries}
            saturdayVerses={state.saturdayVerses}
            onSaveMdo={handleSaveMdo}
            onSaveSaturdayVerse={handleSaveSaturdayVerse}
          />
        )}

        {activeTab === 'escalas' && (
          <EscalasTab
            state={state}
            members={INITIAL_MEMBERS}
            activeUser={activeUser}
            isLeader={isLeader}
            onUpdateAttendance={handleUpdateAttendance}
            onToggleServingOnDesk={handleToggleServingOnDesk}
            onChangeAssignmentMember={handleChangeAssignmentMember}
            onAddNextSaturday={handleAddNextSaturday}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfiguracoesTab
            state={state}
            isLeader={isLeader}
            onUpdateScreen={handleUpdateScreen}
            onToggleFreeze={handleToggleFreeze}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
