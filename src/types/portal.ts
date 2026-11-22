export type Role = 'ADMIN' | 'CAPTAIN' | 'MEMBER' | 'MUSIC' | 'PROGRAMMING';

export type ProgrammingTeam = 'ALPHA' | 'BRAVO' | 'CHARLIE';

export type DeskPosition = 'CAPITAO' | 'PRINCIPAL' | 'RETORNO' | 'CORTE' | 'APOIO';

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

export type TabId =
  | 'escala'
  | 'aovivo'
  | 'musicas'
  | 'programacao'
  | 'devocional'
  | 'holyrics'
  | 'governanca';

export interface MemberUser {
  id: string;
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
  notes?: string;
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
  requiresMedia: boolean;
  liveStatus: LiveItemStatus;
  liveStartedAt?: string;
  liveFinishedAt?: string;
  captainNotes?: string;
}

export interface ServiceSong {
  id: string;
  orderIndex: number;
  title: string;
  artist: string;
  key: string;
  bpm?: number;
  rawLyrics: string;
  holyricsTxt: string;
  approved: boolean;
  notes?: string;
  addedBy: string;
}

export interface MediaAsset {
  id: string;
  runItemId: string;
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
  objectUrl?: string;
  isDemoPlaceholder?: boolean;
}

export interface MdoEntry {
  id: string;
  userId: string;
  dayKey: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
  dayLabel: string;
  completed: boolean;
  bibleReference: string;
  reflectionNote: string;
  updatedAt?: string;
}

export interface SaturdayVerseRecord {
  id: string;
  userId: string;
  saturdayDate: string;
  spoken: boolean;
  spokenToUserId: string;
  verseReference: string;
  spokenAt?: string;
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
  assignments: DeskAssignment[];
  runItems: RunItem[];
  songs: ServiceSong[];
  mediaAssets: MediaAsset[];
  mdoEntries: MdoEntry[];
  saturdayVerses: SaturdayVerseRecord[];
  auditLogs: AuditLogEntry[];
}
