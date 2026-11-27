export type Role = 'ADMIN' | 'CAPTAIN' | 'MEMBER' | 'MUSIC' | 'PROGRAMMING';

export type ProgrammingTeam = 'ALPHA' | 'BRAVO' | 'CHARLIE';

export type DeskPosition =
  | 'CAPITAO'
  | 'PRINCIPAL'
  | 'RETORNO'
  | 'CORTE'
  | 'STUDIO'
  | 'APOIO';

export type ServiceStatus =
  | 'DRAFT'
  | 'RECEIVING'
  | 'VALIDATING'
  | 'APPROVED'
  | 'LIVE'
  | 'ARCHIVED';

export type AttendanceStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export type RunItemType =
  | 'OPENING'
  | 'WORSHIP'
  | 'PROGRAMMING'
  | 'ANNOUNCEMENTS'
  | 'WORD'
  | 'OFFERING'
  | 'CLOSING'
  | 'OTHER';

export type LiveItemStatus = 'PENDING' | 'CURRENT' | 'DONE' | 'SKIPPED';

export type MediaCategory = 'VIDEO' | 'IMAGE' | 'AUDIO' | 'DOCUMENT';

export type MediaValidationStatus = 'VALID' | 'WARNING' | 'REJECTED';

export type ScreenCode = 'LEFT' | 'CENTER' | 'RIGHT';

export type ScreenTarget = 'ALL' | 'CENTER' | 'SIDES' | 'LEFT' | 'RIGHT';

export type MediaDisplayTrigger =
  | 'RUN_ITEM'
  | 'ON_REQUEST'
  | 'ARRANQUE'
  | 'ESQUETE'
  | 'BRINCADEIRA';

export type ScheduleLocationType = 'AUDITORIO_PRINCIPAL' | 'SALA';

export type TabId =
  | 'inicio'
  | 'musicas'
  | 'programacao'
  | 'culto'
  | 'meditacao'
  | 'escalas'
  | 'configuracoes';

export interface MemberUser {
  id: string;
  senibId: string;
  pin: string;
  name: string;
  ministry: string;
  roles: Role[];
  programmingTeam?: ProgrammingTeam;
  active: boolean;
}

export interface StageScreen {
  code: ScreenCode;
  label: string;
  widthPx: number;
  heightPx: number;
  aspectRatio: string;
}

export interface DeskAssignment {
  id: string;
  position: DeskPosition;
  userId: string;
  attendanceStatus: AttendanceStatus;
  confirmedAt?: string;
  servingOnDesk: boolean;
  deskCheckinAt?: string;
}

/**
 * Conteúdo próprio de cada culto (roteiro, letras, mídias e aviso da mesa).
 * O culto ativo espelha esse conteúdo nos campos de topo de ServiceState;
 * ao trocar de culto, o conteúdo atual é guardado no culto anterior.
 */
export interface ServiceContent {
  startsAtTime: string;
  programmingTeam: ProgrammingTeam;
  liveNotes: string;
  runItems: RunItem[];
  songs: ServiceSong[];
  mediaAssets: MediaAsset[];
}

export interface SaturdaySchedule {
  id: string;
  date: string;
  title: string;
  locationType: ScheduleLocationType;
  roomName?: string;
  isPast?: boolean;
  assignments: DeskAssignment[];
  content?: ServiceContent;
}

export interface RunItem {
  id: string;
  orderIndex: number;
  plannedTime: string;
  durationMinutes: number;
  title: string;
  description: string;
  itemType: RunItemType;
  responsibleName: string;
  songCode?: string;
  requiresMedia: boolean;
  liveStatus: LiveItemStatus;
  liveStartedAt?: string;
  liveFinishedAt?: string;
  captainNotes?: string;
}

export interface AdjustmentRequest {
  reason: string;
  requestedBy: string;
  requestedAt: string;
}

export interface ServiceSong {
  id: string;
  songCode?: string;
  orderIndex: number;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  rawLyrics: string;
  holyricsTxt: string;
  holyricsOneLineTxt?: string;
  holyricsTwoLinesTxt?: string;
  approved: boolean;
  notes?: string;
  slideNotes?: Record<string, string>;
  matchedSongCode?: string;
  validatedBySchedule?: boolean;
  adjustmentRequest?: AdjustmentRequest;
  addedBy: string;
}

export type MediaRoleLabel = 'VIDEO' | 'IMAGEM' | 'BG' | 'APRESENTACAO';

export interface MediaAsset {
  id: string;
  runItemId?: string;
  mediaRole?: MediaRoleLabel;
  displayTrigger: MediaDisplayTrigger;
  requestedBy?: string;
  note: string;
  targetScreen: ScreenTarget;
  category: MediaCategory;
  originalFilename: string;
  normalizedFilename: string;
  extension: string;
  mimeType: string;
  fileSizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: string;
  durationSeconds?: number;
  validationStatus: MediaValidationStatus;
  validationMessages: string[];
  uploadedBy: string;
  createdAt: string;
  approved: boolean;
  adjustmentRequest?: AdjustmentRequest;
  objectUrl?: string;
  isDemoPlaceholder?: boolean;
}

export interface SaturdayMdoRecord {
  id: string;
  userId: string;
  saturdayDate: string;
  present: boolean;
  /** M — Dias meditados na semana (0 a 5) */
  meditationDays: number;
  /** D — Versículos decorados (mínimo 5, máximo 70) */
  memorizedVerses: number;
  /** O — Dias de oração (0 a 5) */
  prayerDays: number;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: Role;
  action: string;
  detail: string;
  reason?: string;
}

export interface ServiceState {
  id: string;
  title: string;
  serviceDate: string;
  startsAtTime: string;
  programmingTeam: ProgrammingTeam;
  status: ServiceStatus;
  cutoffLabel: string;
  isFrozen: boolean;
  liveStartedAt?: string;
  liveNotes: string;
  screens: StageScreen[];
  members: MemberUser[];
  activeScheduleId: string;
  assignments: DeskAssignment[];
  schedules: SaturdaySchedule[];
  runItems: RunItem[];
  songs: ServiceSong[];
  mediaAssets: MediaAsset[];
  saturdayMdoRecords: SaturdayMdoRecord[];
  auditLogs: AuditLogEntry[];
}
