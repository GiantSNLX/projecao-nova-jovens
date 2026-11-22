import type {
  DeskPosition,
  MemberUser,
  ProgrammingTeam,
  Role,
  ServiceState,
} from '../types/portal';

export const TEAM_LABELS: Record<
  ProgrammingTeam,
  { code: string; name: string; phonetic: string; badgeClass: string }
> = {
  ALPHA: {
    code: 'A',
    name: 'Equipe Alpha',
    phonetic: 'Alfa (OTAN)',
    badgeClass: 'bg-[#0095FF]/15 text-[#38BDF8] border-[#0095FF]/40',
  },
  BRAVO: {
    code: 'B',
    name: 'Equipe Bravo',
    phonetic: 'Bravo (OTAN)',
    badgeClass: 'bg-[#F5C41E]/15 text-[#F5C41E] border-[#F5C41E]/40',
  },
  CHARLIE: {
    code: 'C',
    name: 'Equipe Charlie',
    phonetic: 'Charlie (OTAN)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  },
};

export const DESK_POSITION_INFO: Record<
  DeskPosition,
  { label: string; short: string; responsibility: string }
> = {
  CAPITAO: {
    label: 'Capitão',
    short: 'Capitão',
    responsibility: 'Coordena a mesa, aprova o pacote, lidera o roteiro ao vivo e valida presenças.',
  },
  PRINCIPAL: {
    label: 'Principal',
    short: 'Principal',
    responsibility: 'Opera o Holyrics principal: letras, versículos, vídeos e avisos nos telões.',
  },
  RETORNO: {
    label: 'Retorno',
    short: 'Retorno',
    responsibility: 'Controla o retorno de palco (letras, cronômetro e recados para louvor/pregação).',
  },
  CORTE: {
    label: 'Corte',
    short: 'Corte',
    responsibility: 'Gerencia a mesa de corte/câmeras e transições entre projeção e transmissão.',
  },
  APOIO: {
    label: 'Apoio',
    short: 'Apoio',
    responsibility: 'Suporte operacional, conferência de mídias, passagens rápidas e backup da mesa.',
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin / Coordenação',
  CAPTAIN: 'Capitão de Mesa',
  MEMBER: 'Operador / Membro',
  MUSIC: 'Ministério de Música',
  PROGRAMMING: 'Programação (A/B/C)',
};

export interface HolyricsSpecRule {
  category: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'LYRICS' | 'AUTOMATION';
  title: string;
  acceptedExtensions: string[];
  recommended: string;
  resolutionRule: string;
  maxRecommendedMb: number;
  notes: string;
}

export const HOLYRICS_SPECS: HolyricsSpecRule[] = [
  {
    category: 'VIDEO',
    title: 'Vídeos e Fundos Animados',
    acceptedExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'],
    recommended: '.mp4 (Codec H.264 + Áudio AAC)',
    resolutionRule: '1920×1080 (Full HD) ou 3840×2160 (4K) / 3200×1800 em 16:9, 30/60 fps',
    maxRecommendedMb: 450,
    notes:
      'O Holyrics usa o motor do VLC integrado. Evite 4K com bitrate extremo se o computador da mesa não tiver GPU dedicada.',
  },
  {
    category: 'IMAGE',
    title: 'Imagens, Banners e Avisos',
    acceptedExtensions: ['.png', '.jpg', '.jpeg', '.bmp', '.gif'],
    recommended: '.png (transparência) ou .jpg (alta qualidade)',
    resolutionRule: 'Central 3840×2160 px | Laterais 3200×1800 px (16:9 exato)',
    maxRecommendedMb: 25,
    notes:
      'Imagens verticais (9:16) ou quadradas geram faixas pretas ou corte; valide antes no Simulador de 3 Telas.',
  },
  {
    category: 'AUDIO',
    title: 'Áudios, Trilhas e Playbacks',
    acceptedExtensions: ['.mp3', '.wav', '.aac', '.ogg', '.flac'],
    recommended: '.mp3 (320 kbps) ou .wav',
    resolutionRule: 'Estéreo 44.1 kHz / 48 kHz com volume normalizado',
    maxRecommendedMb: 60,
    notes:
      'Suportados pelo player interno do Holyrics, inclusive com disparo sincronizado por slide.',
  },
  {
    category: 'DOCUMENT',
    title: 'Documentos e Apresentações',
    acceptedExtensions: ['.pdf', '.ppt', '.pptx'],
    recommended: '.pdf ou slides exportados em .png/.jpg (16:9)',
    resolutionRule: 'Proporção 16:9 (Widescreen)',
    maxRecommendedMb: 80,
    notes:
      'Arquivos .ppt/.pptx funcionam apenas no Windows com Microsoft PowerPoint instalado na mesa. Prefira PDF ou PNG para evitar quebra de fontes.',
  },
  {
    category: 'LYRICS',
    title: 'Letras de Músicas',
    acceptedExtensions: ['.txt'],
    recommended: '.txt estruturado em blocos de 2 a 4 linhas (Widescreen)',
    resolutionRule: 'Estrofes separadas por linha em branco e tags [Verso], [Coro], [Ponte]',
    maxRecommendedMb: 2,
    notes:
      'O portal formata e gera automaticamente o .txt de cada música pronto para importar no acervo do Holyrics.',
  },
  {
    category: 'AUTOMATION',
    title: 'Roteiro e API Server',
    acceptedExtensions: ['.json', '.js'],
    recommended: 'culto_holyrics.json + script_holyrics_import.js',
    resolutionRule: 'Compatível com Holyrics API Server e Holyrics Script',
    maxRecommendedMb: 5,
    notes:
      'O pacote .zip gerado já entrega o roteiro estruturado e o script para automação de playlist.',
  },
];

export const INITIAL_MEMBERS: MemberUser[] = [
  {
    id: 'usr-1',
    name: 'Lucas Mendes',
    ministry: 'Projeção',
    roles: ['ADMIN', 'CAPTAIN', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-2',
    name: 'Mariana Souza',
    ministry: 'Projeção',
    roles: ['CAPTAIN', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-3',
    name: 'Rafael Oliveira',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-4',
    name: 'Camila Ferreira',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-5',
    name: 'Gabriel Costa',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-6',
    name: 'Beatriz Almeida',
    ministry: 'Ministério de Música',
    roles: ['MUSIC', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-7',
    name: 'Matheus Rocha',
    ministry: 'Programação Alpha',
    roles: ['PROGRAMMING', 'MEMBER'],
    programmingTeam: 'ALPHA',
    active: true,
  },
  {
    id: 'usr-8',
    name: 'Juliana Lima',
    ministry: 'Programação Bravo',
    roles: ['PROGRAMMING', 'MEMBER'],
    programmingTeam: 'BRAVO',
    active: true,
  },
  {
    id: 'usr-9',
    name: 'Thiago Santos',
    ministry: 'Programação Charlie',
    roles: ['PROGRAMMING', 'MEMBER'],
    programmingTeam: 'CHARLIE',
    active: true,
  },
];

export const INITIAL_SERVICE_STATE: ServiceState = {
  id: 'srv-2026-11-21',
  title: 'Culto Nova Jovens 2',
  serviceDate: '2026-11-21',
  startsAtTime: '19:30',
  programmingTeam: 'ALPHA',
  status: 'VALIDATING',
  cutoffLabel: 'Sexta-feira, 20:00',
  isFrozen: false,
  liveNotes: 'Checar áudio do vídeo de abertura às 19:05 antes da entrada da igreja.',
  screens: [
    {
      code: 'LEFT',
      label: 'Lateral Esquerda',
      widthPx: 3200,
      heightPx: 1800,
      aspectRatio: '16:9',
    },
    {
      code: 'CENTER',
      label: 'Telão Central (Principal)',
      widthPx: 3840,
      heightPx: 2160,
      aspectRatio: '16:9',
    },
    {
      code: 'RIGHT',
      label: 'Lateral Direita',
      widthPx: 3200,
      heightPx: 1800,
      aspectRatio: '16:9',
    },
  ],
  assignments: [
    {
      id: 'asg-1',
      position: 'CAPITAO',
      userId: 'usr-1',
      attendanceStatus: 'CONFIRMED',
      confirmedAt: '18:10',
      servingOnDesk: true,
      deskCheckinAt: '18:48',
    },
    {
      id: 'asg-2',
      position: 'PRINCIPAL',
      userId: 'usr-3',
      attendanceStatus: 'CONFIRMED',
      confirmedAt: '17:40',
      servingOnDesk: true,
      deskCheckinAt: '18:52',
    },
    {
      id: 'asg-3',
      position: 'RETORNO',
      userId: 'usr-4',
      attendanceStatus: 'CONFIRMED',
      confirmedAt: '18:02',
      servingOnDesk: false,
    },
    {
      id: 'asg-4',
      position: 'CORTE',
      userId: 'usr-5',
      attendanceStatus: 'CONFIRMED',
      confirmedAt: '18:15',
      servingOnDesk: false,
    },
    {
      id: 'asg-5',
      position: 'APOIO',
      userId: 'usr-2',
      attendanceStatus: 'PENDING',
      servingOnDesk: false,
    },
  ],
  runItems: [
    {
      id: 'run-1',
      orderIndex: 1,
      plannedTime: '19:20',
      durationMinutes: 10,
      title: 'Pré-culto e Contagem Regressiva',
      description: 'Loop visual nas três telas com trilha ambiente até 19:30.',
      itemType: 'OPENING',
      responsibleName: 'Mesa de Projeção',
      requiresMedia: true,
      liveStatus: 'DONE',
      liveStartedAt: '19:20',
      liveFinishedAt: '19:30',
    },
    {
      id: 'run-2',
      orderIndex: 2,
      plannedTime: '19:30',
      durationMinutes: 5,
      title: 'Vídeo de Abertura — Nova Jovens 2',
      description: 'Execução sincronizada no Telão Central e Laterais com áudio em linha.',
      itemType: 'PROGRAMMING',
      responsibleName: 'Equipe Alpha',
      requiresMedia: true,
      liveStatus: 'CURRENT',
      liveStartedAt: '19:31',
      captainNotes: 'Atenção ao corte imediato para câmera 1 ao final do vídeo.',
    },
    {
      id: 'run-3',
      orderIndex: 3,
      plannedTime: '19:35',
      durationMinutes: 25,
      title: 'Bloco de Louvor',
      description: 'Três músicas em sequência no Holyrics com retorno ativo para o palco.',
      itemType: 'WORSHIP',
      responsibleName: 'Ministério de Música',
      requiresMedia: false,
      liveStatus: 'PENDING',
    },
    {
      id: 'run-4',
      orderIndex: 4,
      plannedTime: '20:00',
      durationMinutes: 12,
      title: 'Dinâmica e Avisos da Semana',
      description: 'Slides da Equipe Alpha + QR de inscrição no acampamento.',
      itemType: 'ANNOUNCEMENTS',
      responsibleName: 'Equipe Alpha',
      requiresMedia: true,
      liveStatus: 'PENDING',
    },
    {
      id: 'run-5',
      orderIndex: 5,
      plannedTime: '20:12',
      durationMinutes: 38,
      title: 'Palavra e Versículos Projetados',
      description: 'Texto bíblico no Telão Central e tópicos nas laterais.',
      itemType: 'WORD',
      responsibleName: 'Preletor + Principal/Retorno',
      requiresMedia: true,
      liveStatus: 'PENDING',
    },
    {
      id: 'run-6',
      orderIndex: 6,
      plannedTime: '20:50',
      durationMinutes: 10,
      title: 'Oração Final e Encerramento',
      description: 'Tela institucional Nova Jovens 2 durante a saída.',
      itemType: 'CLOSING',
      responsibleName: 'Mesa de Projeção',
      requiresMedia: false,
      liveStatus: 'PENDING',
    },
  ],
  songs: [
    {
      id: 'sng-1',
      orderIndex: 1,
      title: 'Lugar Secreto',
      artist: 'Gabriela Rocha',
      key: 'G',
      bpm: 72,
      rawLyrics: `[Verso 1]
Tu és tudo o que eu mais quero
O meu fôlego Tu és
Em Teus braços é o meu lugar
Estou aqui, estou aqui

[Coro]
Pai, eu amo Tua presença
Teu sorriso é vida em mim
Eu seguro em Tuas mãos
Confio em Ti, confio em Ti`,
      holyricsTxt: `Lugar Secreto - Gabriela Rocha
Tom: G | BPM: 72

[Verso 1]
Tu és tudo o que eu mais quero
O meu fôlego Tu és

Em Teus braços é o meu lugar
Estou aqui, estou aqui

[Coro]
Pai, eu amo Tua presença
Teu sorriso é vida em mim

Eu seguro em Tuas mãos
Confio em Ti, confio em Ti`,
      approved: true,
      notes: 'Entrar com fundo azul escuro e letra branca sem sombra pesada.',
      addedBy: 'Beatriz Almeida',
    },
    {
      id: 'sng-2',
      orderIndex: 2,
      title: 'A Casa É Sua',
      artist: 'Casa Worship',
      key: 'A',
      bpm: 76,
      rawLyrics: `[Verso 1]
Você é bem-vindo aqui
A casa é Sua, pode entrar
Me esvazio de mim
Me esvazio de mim

[Coro]
Sopra o Teu vento aqui
Toma o Teu lugar
Faz o que quiseres fazer`,
      holyricsTxt: `A Casa É Sua - Casa Worship
Tom: A | BPM: 76

[Verso 1]
Você é bem-vindo aqui
A casa é Sua, pode entrar

Me esvazio de mim
Me esvazio de mim

[Coro]
Sopra o Teu vento aqui
Toma o Teu lugar
Faz o que quiseres fazer`,
      approved: true,
      addedBy: 'Beatriz Almeida',
    },
    {
      id: 'sng-3',
      orderIndex: 3,
      title: 'Bondade de Deus',
      artist: 'Isaías Saad',
      key: 'G',
      bpm: 64,
      rawLyrics: `[Verso 1]
Te amo, Deus, Tua graça nunca falha
Todos os dias eu estou em Tuas mãos
Desde quando me levanto até eu me deitar
Eu cantarei da bondade de Deus

[Coro]
És fiel em todo tempo
Em todo tempo Tu és tão, tão bom
Com todo fôlego que tenho
Eu cantarei da bondade de Deus`,
      holyricsTxt: `Bondade de Deus - Isaías Saad
Tom: G | BPM: 64

[Verso 1]
Te amo, Deus, Tua graça nunca falha
Todos os dias eu estou em Tuas mãos

Desde quando me levanto até eu me deitar
Eu cantarei da bondade de Deus

[Coro]
És fiel em todo tempo
Em todo tempo Tu és tão, tão bom

Com todo fôlego que tenho
Eu cantarei da bondade de Deus`,
      approved: false,
      notes: 'Confirmar se vai repetir a ponte duas vezes no final.',
      addedBy: 'Beatriz Almeida',
    },
  ],
  mediaAssets: [
    {
      id: 'med-1',
      runItemId: 'run-1',
      targetScreen: 'ALL',
      category: 'VIDEO',
      originalFilename: 'contagem_10min_4k.mp4',
      normalizedFilename: '01_Abertura_contagem_10min_4k.mp4',
      extension: '.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 142_600_000,
      widthPx: 3840,
      heightPx: 2160,
      aspectRatio: '16:9',
      durationSeconds: 600,
      validationStatus: 'VALID',
      validationMessages: ['Proporção 16:9 exata para Telão Central (3840×2160) e Laterais (3200×1800).'],
      uploadedBy: 'Matheus Rocha',
      createdAt: '18:20',
      approved: true,
      isDemoPlaceholder: true,
    },
    {
      id: 'med-2',
      runItemId: 'run-2',
      targetScreen: 'ALL',
      category: 'VIDEO',
      originalFilename: 'abertura_alpha_novembro.mp4',
      normalizedFilename: '02_Programacao_abertura_alpha_novembro.mp4',
      extension: '.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 86_400_000,
      widthPx: 1920,
      heightPx: 1080,
      aspectRatio: '16:9',
      durationSeconds: 95,
      validationStatus: 'WARNING',
      validationMessages: [
        'Proporção 16:9 validada para Holyrics (.mp4).',
        'Resolução 1920×1080 será escalonada no Telão Central (3840×2160) — aceito, mas 4K traz mais nitidez.',
      ],
      uploadedBy: 'Matheus Rocha',
      createdAt: '18:35',
      approved: true,
      isDemoPlaceholder: true,
    },
    {
      id: 'med-3',
      runItemId: 'run-4',
      targetScreen: 'CENTER',
      category: 'IMAGE',
      originalFilename: 'aviso_acampamento_2026.png',
      normalizedFilename: '04_Avisos_aviso_acampamento_2026.png',
      extension: '.png',
      mimeType: 'image/png',
      fileSizeBytes: 4_200_000,
      widthPx: 3840,
      heightPx: 2160,
      aspectRatio: '16:9',
      validationStatus: 'VALID',
      validationMessages: ['Resolução nativa 3840×2160 (4K UHD) compatível com o Telão Central.'],
      uploadedBy: 'Matheus Rocha',
      createdAt: '18:40',
      approved: false,
      isDemoPlaceholder: true,
    },
  ],
  mdoEntries: [
    {
      id: 'mdo-1',
      userId: 'usr-3',
      dayKey: 'SEG',
      dayLabel: 'Segunda',
      completed: true,
      bibleReference: 'Salmos 27:1-4',
      reflectionNote: 'Foco em permanecer firme mesmo nos dias corridos.',
      updatedAt: 'Seg 07:30',
    },
    {
      id: 'mdo-2',
      userId: 'usr-3',
      dayKey: 'TER',
      dayLabel: 'Terça',
      completed: true,
      bibleReference: 'Romanos 12:1-2',
      reflectionNote: 'Renovar a mente antes de servir no ministério.',
      updatedAt: 'Ter 07:15',
    },
    {
      id: 'mdo-3',
      userId: 'usr-3',
      dayKey: 'QUA',
      dayLabel: 'Quarta',
      completed: true,
      bibleReference: 'Filipenses 4:6-8',
      reflectionNote: 'Entregar a ansiedade em oração.',
      updatedAt: 'Qua 08:05',
    },
    {
      id: 'mdo-4',
      userId: 'usr-3',
      dayKey: 'QUI',
      dayLabel: 'Quinta',
      completed: true,
      bibleReference: 'Colossenses 3:23',
      reflectionNote: 'Fazer tudo para o Senhor, inclusive na mesa de projeção.',
      updatedAt: 'Qui 21:10',
    },
    {
      id: 'mdo-5',
      userId: 'usr-3',
      dayKey: 'SEX',
      dayLabel: 'Sexta',
      completed: false,
      bibleReference: '',
      reflectionNote: '',
    },
    {
      id: 'mdo-6',
      userId: 'usr-3',
      dayKey: 'SAB',
      dayLabel: 'Sábado',
      completed: false,
      bibleReference: '',
      reflectionNote: '',
    },
  ],
  saturdayVerses: [
    {
      id: 'ver-1',
      userId: 'usr-1',
      saturdayDate: '2026-11-21',
      spoken: true,
      spokenToUserId: 'usr-2',
      verseReference: 'Colossenses 3:23-24',
      spokenAt: '18:30',
    },
    {
      id: 'ver-2',
      userId: 'usr-3',
      saturdayDate: '2026-11-21',
      spoken: false,
      spokenToUserId: '',
      verseReference: '',
    },
  ],
  auditLogs: [
    {
      id: 'aud-1',
      timestamp: '18:48',
      actorName: 'Lucas Mendes',
      actorRole: 'CAPTAIN',
      action: 'DESK_CHECKIN',
      detail: 'Check-in na mesa confirmado na posição Capitão.',
    },
    {
      id: 'aud-2',
      timestamp: '18:52',
      actorName: 'Rafael Oliveira',
      actorRole: 'MEMBER',
      action: 'DESK_CHECKIN',
      detail: 'Check-in na mesa confirmado na posição Principal.',
    },
    {
      id: 'aud-3',
      timestamp: '18:40',
      actorName: 'Matheus Rocha',
      actorRole: 'PROGRAMMING',
      action: 'MEDIA_UPLOADED',
      detail: 'Enviou aviso_acampamento_2026.png (3840×2160) para o bloco 04.',
    },
  ],
};
