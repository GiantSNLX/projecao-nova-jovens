import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_SERVICE_STATE,
} from './data/initialState';
import type {
  AttendanceStatus,
  AuditLogEntry,
  DeskAssignment,
  DeskPosition,
  MdoEntry,
  MediaAsset,
  MemberUser,
  ProgrammingTeam,
  Role,
  RunItem,
  SaturdaySchedule,
  SaturdayVerseRecord,
  ScheduleLocationType,
  ScreenCode,
  ServiceSong,
  ServiceState,
  TabId,
} from './types/portal';
import { findMatchingSong } from './utils/scheduleOcr';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { InicioTab } from './components/InicioTab';
import { MusicTab } from './components/MusicTab';
import { ProgrammingTab } from './components/ProgrammingTab';
import { CultoTab } from './components/CultoTab';
import { DevotionalTab } from './components/DevotionalTab';
import { EscalasTab, type NewSchedulePayload } from './components/EscalasTab';
import { ConfiguracoesTab, type NewUserPayload } from './components/ConfiguracoesTab';

const STORAGE_KEY = 'projecao-nova-jovens-v8';
const SESSION_KEY = 'projecao-nova-jovens-session';

function loadInitialState(): ServiceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SERVICE_STATE;
    const parsed = JSON.parse(raw) as ServiceState;
    if (!parsed || !parsed.screens || !parsed.assignments || !parsed.schedules) {
      return INITIAL_SERVICE_STATE;
    }
    return {
      ...INITIAL_SERVICE_STATE,
      ...parsed,
      members: parsed.members && parsed.members.length > 0 ? parsed.members : INITIAL_MEMBERS,
      activeScheduleId: parsed.activeScheduleId || INITIAL_SERVICE_STATE.activeScheduleId,
    };
  } catch {
    return INITIAL_SERVICE_STATE;
  }
}

function loadSessionUser(membersList: MemberUser[]): MemberUser | null {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return membersList.find((m) => m.id === userId) ?? null;
  } catch {
    return null;
  }
}

const AUDITORIO_POSITIONS: DeskPosition[] = [
  'CAPITAO',
  'PRINCIPAL',
  'RETORNO',
  'CORTE',
  'STUDIO',
  'APOIO',
];

const ROOM_POSITIONS: DeskPosition[] = ['PRINCIPAL', 'RETORNO'];

function buildAssignmentsForPositions(
  positions: DeskPosition[],
  existing: DeskAssignment[],
  membersList: MemberUser[],
  prefix: string,
): DeskAssignment[] {
  const defaultMap: Record<DeskPosition, string> = {
    CAPITAO: membersList[0]?.id ?? 'usr-1',
    PRINCIPAL: membersList[2]?.id ?? membersList[0]?.id ?? 'usr-3',
    RETORNO: membersList[3]?.id ?? membersList[0]?.id ?? 'usr-4',
    CORTE: membersList[4]?.id ?? membersList[0]?.id ?? 'usr-5',
    STUDIO: membersList[9]?.id ?? membersList[0]?.id ?? 'usr-10',
    APOIO: membersList[1]?.id ?? membersList[0]?.id ?? 'usr-2',
  };
  return positions.map((pos, idx) => {
    const prev = existing.find((e) => e.position === pos);
    if (prev) return prev;
    return {
      id: `${prefix}-${pos.toLowerCase()}-${idx}`,
      position: pos,
      userId: defaultMap[pos],
      attendanceStatus: 'PENDING',
      servingOnDesk: false,
    };
  });
}

export function App() {
  const [state, setState] = useState<ServiceState>(loadInitialState);
  const [activeUser, setActiveUser] = useState<MemberUser | null>(() =>
    loadSessionUser(loadInitialState().members),
  );
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
        members={state.members}
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
    scheduleId: string,
    updater: (asgs: DeskAssignment[]) => DeskAssignment[],
  ): { schedules: SaturdaySchedule[]; assignments: DeskAssignment[] } => {
    const schedules = prev.schedules.map((s) =>
      s.id === scheduleId ? { ...s, assignments: updater(s.assignments) } : s,
    );
    const current =
      schedules.find((s) => s.id === prev.activeScheduleId) ??
      schedules.find((s) => s.date === prev.serviceDate);
    return {
      schedules,
      assignments: current ? current.assignments : prev.assignments,
    };
  };

  const handleUpdateAttendance = (
    scheduleId: string,
    assignmentId: string,
    status: AttendanceStatus,
  ) => {
    setState((prev) => {
      const targetSched = prev.schedules.find((s) => s.id === scheduleId);
      const target = targetSched?.assignments.find((a) => a.id === assignmentId);
      const updated = updateScheduleAssignments(prev, scheduleId, (list) =>
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
            `confirmou ${status === 'CONFIRMED' ? 'presença' : 'ausência'} em ${target?.position ?? ''} (${targetSched?.date ?? ''}).`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleToggleServingOnDesk = (scheduleId: string, assignmentId: string) => {
    setState((prev) => {
      const targetSched = prev.schedules.find((s) => s.id === scheduleId);
      const target = targetSched?.assignments.find((a) => a.id === assignmentId);
      const nextServing = !target?.servingOnDesk;
      const updated = updateScheduleAssignments(prev, scheduleId, (list) =>
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
    scheduleId: string,
    assignmentId: string,
    userId: string,
  ) => {
    const member = state.members.find((m) => m.id === userId);
    setState((prev) => {
      const targetSched = prev.schedules.find((s) => s.id === scheduleId);
      const updated = updateScheduleAssignments(prev, scheduleId, (list) =>
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
          makeAudit('Escala', `escalou ${member?.name ?? userId} para ${targetSched?.title ?? scheduleId}.`),
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

  const handleAddSchedule = (payload: NewSchedulePayload): string => {
    const newId = `sch-${Date.now()}`;
    const positions =
      payload.locationType === 'SALA' ? ROOM_POSITIONS : AUDITORIO_POSITIONS;
    const newSched: SaturdaySchedule = {
      id: newId,
      date: payload.date,
      title: payload.title,
      locationType: payload.locationType,
      roomName: payload.locationType === 'SALA' ? payload.roomName : undefined,
      assignments: buildAssignmentsForPositions(positions, [], state.members, newId),
    };

    setState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, newSched],
      auditLogs: [
        makeAudit(
          'Escala',
          `criou evento "${payload.title}" (${payload.date}) em ${payload.locationType === 'SALA' ? payload.roomName || 'Sala' : 'Auditório Principal'}.`,
        ),
        ...prev.auditLogs,
      ],
    }));
    return newId;
  };

  const handleToggleArchiveSchedule = (scheduleId: string, archived: boolean) => {
    setState((prev) => {
      const target = prev.schedules.find((s) => s.id === scheduleId);
      const schedules = prev.schedules.map((s) =>
        s.id === scheduleId ? { ...s, isPast: archived } : s,
      );
      return {
        ...prev,
        schedules,
        auditLogs: [
          makeAudit(
            'Escala',
            `${archived ? 'arquivou' : 'reativou'} o culto "${target?.title ?? scheduleId}".`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleUpdateScheduleDetails = (
    scheduleId: string,
    patch: { title?: string; locationType?: ScheduleLocationType; roomName?: string },
  ) => {
    setState((prev) => {
      const schedules = prev.schedules.map((s) => {
        if (s.id !== scheduleId) return s;
        const nextLocation = patch.locationType ?? s.locationType;
        let nextAssignments = s.assignments;

        if (patch.locationType && patch.locationType !== s.locationType) {
          const targetPositions =
            nextLocation === 'SALA' ? ROOM_POSITIONS : AUDITORIO_POSITIONS;
          nextAssignments = buildAssignmentsForPositions(
            targetPositions,
            s.assignments,
            prev.members,
            s.id,
          );
        }

        return {
          ...s,
          title: patch.title !== undefined ? patch.title : s.title,
          locationType: nextLocation,
          roomName:
            nextLocation === 'SALA'
              ? patch.roomName !== undefined
                ? patch.roomName
                : s.roomName
              : undefined,
          assignments: nextAssignments,
        };
      });

      const current = schedules.find((s) => s.id === prev.activeScheduleId);
      return {
        ...prev,
        title:
          patch.title !== undefined && scheduleId === prev.activeScheduleId
            ? patch.title
            : prev.title,
        schedules,
        assignments: current ? current.assignments : prev.assignments,
      };
    });
  };

  const handleTogglePositionInSchedule = (scheduleId: string, position: DeskPosition) => {
    setState((prev) => {
      const schedules = prev.schedules.map((s) => {
        if (s.id !== scheduleId) return s;
        const exists = s.assignments.some((a) => a.position === position);
        const nextAssignments = exists
          ? s.assignments.filter((a) => a.position !== position)
          : buildAssignmentsForPositions(
              [...s.assignments.map((a) => a.position), position],
              s.assignments,
              prev.members,
              s.id,
            );
        return { ...s, assignments: nextAssignments };
      });
      const current = schedules.find((s) => s.id === prev.activeScheduleId);
      return {
        ...prev,
        schedules,
        assignments: current ? current.assignments : prev.assignments,
      };
    });
  };

  const handleSelectSchedule = (scheduleId: string) => {
    setState((prev) => {
      const found = prev.schedules.find((s) => s.id === scheduleId);
      if (!found) return prev;
      return {
        ...prev,
        activeScheduleId: found.id,
        serviceDate: found.date,
        title: found.title,
        assignments: found.assignments,
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
      const usedExistingIds = new Set<string>();
      const mergedFromSchedule: ServiceSong[] = params.detectedSongs.map((ds) => {
        const matched = findMatchingSong(ds.title, prev.songs, usedExistingIds);
        if (matched) {
          usedExistingIds.add(matched.id);
          return {
            ...matched,
            songCode: ds.songCode,
            orderIndex: ds.orderIndex,
            validatedBySchedule: matched.rawLyrics.trim().length > 0,
          };
        }
        return { ...ds, validatedBySchedule: false };
      });

      const unmatchedPreUploaded = prev.songs
        .filter((s) => !usedExistingIds.has(s.id) && s.rawLyrics.trim().length > 0)
        .map((s, idx) => ({
          ...s,
          orderIndex: mergedFromSchedule.length + idx + 1,
          validatedBySchedule: false,
        }));

      const finalSongs = [...mergedFromSchedule, ...unmatchedPreUploaded];

      return {
        ...prev,
        serviceDate: params.detectedDate || prev.serviceDate,
        startsAtTime: params.runItems[0]?.plannedTime || prev.startsAtTime,
        runItems: params.runItems,
        songs: finalSongs.length > 0 ? finalSongs : prev.songs,
        auditLogs: [
          makeAudit(
            'Roteiro',
            `importou ${params.runItems.length} momentos via ${params.sourceLabel} e validou músicas.`,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleAddMember = (payload: NewUserPayload): { ok: boolean; error?: string } => {
    if (!payload.name || !payload.senibId || !payload.pin) {
      return { ok: false, error: 'Preencha nome, matrícula SENIB e PIN.' };
    }
    const duplicate = state.members.some((m) => m.senibId === payload.senibId);
    if (duplicate) {
      return { ok: false, error: `Matrícula SENIB ${payload.senibId} já cadastrada.` };
    }

    let roles: Role[] = ['MEMBER'];
    let ministry = 'Projeção';
    let programmingTeam: ProgrammingTeam | undefined = undefined;

    if (payload.ministryChoice === 'MUSICA') {
      roles = ['MUSIC', 'MEMBER'];
      ministry = 'Música';
    } else if (payload.ministryChoice === 'PROGRAMACAO') {
      programmingTeam = payload.programmingTeam || 'ALPHA';
      const label = programmingTeam === 'ALPHA' ? 'Alpha' : programmingTeam === 'BRAVO' ? 'Bravo' : 'Charlie';
      roles = ['PROGRAMMING', 'MEMBER'];
      ministry = `Programação ${label}`;
    } else {
      roles = payload.isCaptain ? ['CAPTAIN', 'MEMBER'] : ['MEMBER'];
      ministry = payload.isLeader ? 'Liderança / Projeção' : 'Projeção';
    }

    if (payload.isLeader && !roles.includes('ADMIN')) {
      roles = ['ADMIN', ...roles];
    }

    const newMember: MemberUser = {
      id: `usr-${Date.now()}`,
      senibId: payload.senibId,
      pin: payload.pin,
      name: payload.name,
      ministry,
      roles,
      programmingTeam,
      active: true,
    };

    setState((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      auditLogs: [
        makeAudit('Configurações', `cadastrou usuário ${newMember.name} (${newMember.ministry}).`),
        ...prev.auditLogs,
      ],
    }));
    return { ok: true };
  };

  const handleUpdateMember = (userId: string, updater: (m: MemberUser) => MemberUser) => {
    setState((prev) => {
      const nextMembers = prev.members.map((m) => (m.id === userId ? updater(m) : m));
      const updatedTarget = nextMembers.find((m) => m.id === userId);
      if (updatedTarget && activeUser.id === userId) {
        setActiveUser(updatedTarget);
      }
      return {
        ...prev,
        members: nextMembers,
        auditLogs: [
          makeAudit('Configurações', `atualizou permissões de ${updatedTarget?.name ?? userId}.`),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleRemoveMember = (userId: string) => {
    setState((prev) => {
      const removed = prev.members.find((m) => m.id === userId);
      return {
        ...prev,
        members: prev.members.filter((m) => m.id !== userId),
        auditLogs: [
          makeAudit('Configurações', `removeu usuário ${removed?.name ?? userId}.`),
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

  const handleRequestMediaAdjustment = (assetId: string, reason: string) => {
    setState((prev) => {
      const target = prev.mediaAssets.find((m) => m.id === assetId);
      return {
        ...prev,
        mediaAssets: prev.mediaAssets.map((m) =>
          m.id === assetId
            ? {
                ...m,
                approved: false,
                adjustmentRequest: {
                  reason,
                  requestedBy: activeUser.name,
                  requestedAt: nowTime(),
                },
              }
            : m,
        ),
        auditLogs: [
          makeAudit(
            'Ajuste',
            `solicitou ajuste na mídia "${target?.normalizedFilename ?? assetId}".`,
            reason,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleRequestSongAdjustment = (songId: string, reason: string) => {
    setState((prev) => {
      const target = prev.songs.find((s) => s.id === songId);
      return {
        ...prev,
        songs: prev.songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                approved: false,
                adjustmentRequest: {
                  reason,
                  requestedBy: activeUser.name,
                  requestedAt: nowTime(),
                },
              }
            : s,
        ),
        auditLogs: [
          makeAudit(
            'Ajuste',
            `solicitou ajuste na música "${target?.title ?? songId}".`,
            reason,
          ),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleSaveOrAddSong = (song: ServiceSong) => {
    setState((prev) => {
      const worshipSlots = prev.runItems
        .filter((r) => r.itemType === 'WORSHIP')
        .map((r, idx) => ({
          id: r.id,
          orderIndex: idx + 1,
          songCode: r.songCode,
          title: r.title,
          rawLyrics: '',
          holyricsTxt: '',
          approved: false,
          addedBy: 'Roteiro',
        }));
      const matchedSlot = findMatchingSong(song.title, worshipSlots);
      const cleanSong: ServiceSong = {
        ...song,
        adjustmentRequest: undefined,
        songCode: matchedSlot?.songCode || song.songCode,
        validatedBySchedule: Boolean(matchedSlot) || song.validatedBySchedule,
      };
      const exists = prev.songs.some((s) => s.id === cleanSong.id);
      return {
        ...prev,
        songs: exists
          ? prev.songs.map((s) => (s.id === cleanSong.id ? cleanSong : s))
          : [...prev.songs, cleanSong],
        auditLogs: [
          makeAudit('Música', `salvou a letra de "${cleanSong.title}".`),
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
            onUpdateAttendance={(id, status) =>
              handleUpdateAttendance(state.activeScheduleId, id, status)
            }
            onToggleServingOnDesk={(id) => handleToggleServingOnDesk(state.activeScheduleId, id)}
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
            members={state.members}
            canOperateDesk={canOperateDesk}
            uploadedFilesMap={uploadedFilesRef.current}
            onSelectSchedule={handleSelectSchedule}
            onUpdateLiveNotes={handleUpdateLiveNotes}
            onRequestMediaAdjustment={handleRequestMediaAdjustment}
            onRequestSongAdjustment={handleRequestSongAdjustment}
            onPackageGenerated={(zipName) => handlePackageGenerated(zipName)}
          />
        )}

        {activeTab === 'meditacao' && (
          <DevotionalTab
            activeUser={activeUser}
            isLeader={isLeader}
            members={state.members}
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
            members={state.members}
            activeUser={activeUser}
            isLeader={isLeader}
            onUpdateAttendance={handleUpdateAttendance}
            onToggleServingOnDesk={handleToggleServingOnDesk}
            onChangeAssignmentMember={handleChangeAssignmentMember}
            onUpdateScheduleDetails={handleUpdateScheduleDetails}
            onTogglePositionInSchedule={handleTogglePositionInSchedule}
            onAddSchedule={handleAddSchedule}
            onToggleArchiveSchedule={handleToggleArchiveSchedule}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfiguracoesTab
            state={state}
            currentUserId={activeUser.id}
            isLeader={isLeader}
            onUpdateScreen={handleUpdateScreen}
            onToggleFreeze={handleToggleFreeze}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onRemoveMember={handleRemoveMember}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
