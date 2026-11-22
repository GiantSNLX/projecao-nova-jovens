import type {
  DeskPosition,
  MemberUser,
  ProgrammingTeam,
  Role,
  ServiceState,
} from '../types/portal';

export const TEAM_LABELS: Record<
  ProgrammingTeam,
  { code: string; name: string; subtitle: string }
> = {
  ALPHA: {
    code: 'A',
    name: 'Alpha',
    subtitle: 'Programação A (Alpha)',
  },
  BRAVO: {
    code: 'B',
    name: 'Bravo',
    subtitle: 'Programação B (Bravo)',
  },
  CHARLIE: {
    code: 'C',
    name: 'Charlie',
    subtitle: 'Programação C (Charlie)',
  },
};

export const DESK_POSITION_INFO: Record<
  DeskPosition,
  { label: string; short: string; responsibility: string }
> = {
  CAPITAO: {
    label: 'Capitão',
    short: 'Capitão',
    responsibility: 'Coordena a mesa, aprova o culto e acompanha a equipe.',
  },
  PRINCIPAL: {
    label: 'Principal',
    short: 'Principal',
    responsibility: 'Opera o Holyrics principal com letras, vídeos e avisos.',
  },
  RETORNO: {
    label: 'Retorno',
    short: 'Retorno',
    responsibility: 'Cuida do retorno de palco para louvor e pregação.',
  },
  CORTE: {
    label: 'Corte',
    short: 'Corte',
    responsibility: 'Faz os cortes de câmera e transições com a projeção.',
  },
  APOIO: {
    label: 'Apoio',
    short: 'Apoio',
    responsibility: 'Dá suporte rápido para conferência de mídias e trocas na mesa.',
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Coordenação',
  CAPTAIN: 'Capitão',
  MEMBER: 'Projeção',
  MUSIC: 'Música',
  PROGRAMMING: 'Programação',
};

export interface HolyricsSpecRule {
  category: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'LYRICS';
  title: string;
  acceptedExtensions: string[];
  recommended: string;
  resolutionRule: string;
  notes: string;
}

export const HOLYRICS_SPECS: HolyricsSpecRule[] = [
  {
    category: 'VIDEO',
    title: 'Vídeos',
    acceptedExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'],
    recommended: '.mp4 (H.264 + AAC)',
    resolutionRule: '1920×1080 ou 3840×2160 (Central) / 3200×1800 (Laterais) em 16:9',
    notes: 'Reprodução pelo motor VLC do Holyrics. Evite arquivos 4K pesados demais sem necessidade.',
  },
  {
    category: 'IMAGE',
    title: 'Imagens e Avisos',
    acceptedExtensions: ['.png', '.jpg', '.jpeg', '.bmp', '.gif'],
    recommended: '.png (com transparência) ou .jpg',
    resolutionRule: 'Central 3840×2160 px · Laterais 3200×1800 px (16:9)',
    notes: 'Imagens verticais de celular ficam com barras pretas ou cortes nos telões.',
  },
  {
    category: 'AUDIO',
    title: 'Áudios e Trilhas',
    acceptedExtensions: ['.mp3', '.wav', '.aac', '.ogg', '.flac'],
    recommended: '.mp3 (320 kbps) ou .wav',
    resolutionRule: 'Áudio estéreo com volume equilibrado',
    notes: 'Compatível com o player interno do Holyrics.',
  },
  {
    category: 'DOCUMENT',
    title: 'Apresentações e Slides',
    acceptedExtensions: ['.pdf', '.ppt', '.pptx'],
    recommended: '.pdf ou imagens .png/.jpg 16:9',
    resolutionRule: 'Tela widescreen 16:9',
    notes: 'PowerPoint (.ppt/.pptx) exige PowerPoint instalado no Windows da mesa. PDF ou PNG evitam fontes desconfiguradas.',
  },
  {
    category: 'LYRICS',
    title: 'Letras de Músicas',
    acceptedExtensions: ['.txt'],
    recommended: '.txt separado em blocos de 2 a 4 linhas',
    resolutionRule: 'Estrofes com linha em branco e marcadores [Verso], [Coro], [Ponte]',
    notes: 'O portal gera os arquivos .txt já formatados para importar direto no Holyrics.',
  },
];

export const INITIAL_MEMBERS: MemberUser[] = [
  {
    id: 'usr-1',
    senibId: '1042',
    pin: '1234',
    name: 'Lucas Mendes',
    ministry: 'Liderança / Projeção',
    roles: ['ADMIN', 'CAPTAIN', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-2',
    senibId: '1058',
    pin: '1234',
    name: 'Mariana Souza',
    ministry: 'Projeção',
    roles: ['CAPTAIN', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-3',
    senibId: '1085',
    pin: '1234',
    name: 'Rafael Oliveira',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-4',
    senibId: '1091',
    pin: '1234',
    name: 'Camila Ferreira',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-5',
    senibId: '1103',
    pin: '1234',
    name: 'Gabriel Costa',
    ministry: 'Projeção',
    roles: ['MEMBER'],
    active: true,
  },
  {
    id: 'usr-6',
    senibId: '1120',
    pin: '1234',
    name: 'Beatriz Almeida',
    ministry: 'Música',
    roles: ['MUSIC', 'MEMBER'],
    active: true,
  },
  {
    id: 'usr-7',
    senibId: '1194',
    pin: '1234',
    name: 'Matheus Rocha',
    ministry: 'Programação Alpha',
    roles: ['PROGRAMMING', 'MEMBER'],
    programmingTeam: 'ALPHA',
    active: true,
  },
  {
    id: 'usr-8',
    senibId: '1208',
    pin: '1234',
    name: 'Juliana Lima',
    ministry: 'Programação Bravo',
    roles: ['PROGRAMMING', 'MEMBER'],
    programmingTeam: 'BRAVO',
    active: true,
  },
  {
    id: 'usr-9',
    senibId: '1231',
    pin: '1234',
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
  liveNotes: 'Conferir áudio do vídeo de abertura às 19:05 antes da entrada da igreja.',
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
      label: 'Telão Central',
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
      description: 'Vídeo em loop nas três telas com trilha ambiente.',
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
      description: 'Soltar vídeo nas três telas com áudio em linha.',
      itemType: 'PROGRAMMING',
      responsibleName: 'Equipe Alpha',
      requiresMedia: true,
      liveStatus: 'CURRENT',
      liveStartedAt: '19:31',
      captainNotes: 'Corte para câmera 1 assim que terminar o vídeo.',
    },
    {
      id: 'run-3',
      orderIndex: 3,
      plannedTime: '19:35',
      durationMinutes: 25,
      title: 'Bloco de Louvor',
      description: 'Três músicas em sequência com retorno ativo para o palco.',
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
      description: 'Slides da Equipe Alpha e QR do acampamento.',
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
      description: 'Textos bíblicos no telão central e pontos nas laterais.',
      itemType: 'WORD',
      responsibleName: 'Preletor e Mesa',
      requiresMedia: true,
      liveStatus: 'PENDING',
    },
    {
      id: 'run-6',
      orderIndex: 6,
      plannedTime: '20:50',
      durationMinutes: 10,
      title: 'Oração Final e Encerramento',
      description: 'Tela fixa do Nova Jovens 2 na saída.',
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
      notes: 'Fundo escuro com letra branca limpa.',
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
      notes: 'Confirmar repetição da ponte no ensaio.',
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
      validationMessages: ['Proporção 16:9 pronta para o Telão Central (3840×2160) e Laterais (3200×1800).'],
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
        'Proporção 16:9 aceita no Holyrics (.mp4).',
        'Arquivo em Full HD (1920×1080); funciona bem, mas o Telão Central suporta até 3840×2160.',
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
      validationMessages: ['Resolução exata do Telão Central (3840×2160).'],
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
      reflectionNote: 'Permanecer firme no Senhor durante a semana.',
      updatedAt: 'Seg 07:30',
    },
    {
      id: 'mdo-2',
      userId: 'usr-3',
      dayKey: 'TER',
      dayLabel: 'Terça',
      completed: true,
      bibleReference: 'Romanos 12:1-2',
      reflectionNote: 'Renovar a mente antes de servir.',
      updatedAt: 'Ter 07:15',
    },
    {
      id: 'mdo-3',
      userId: 'usr-3',
      dayKey: 'QUA',
      dayLabel: 'Quarta',
      completed: true,
      bibleReference: 'Filipenses 4:6-8',
      reflectionNote: 'Entregar as preocupações em oração.',
      updatedAt: 'Qua 08:05',
    },
    {
      id: 'mdo-4',
      userId: 'usr-3',
      dayKey: 'QUI',
      dayLabel: 'Quinta',
      completed: true,
      bibleReference: 'Colossenses 3:23',
      reflectionNote: 'Servir com excelência na mesa de projeção.',
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
      action: 'Mesa',
      detail: 'Lucas Mendes entrou na posição Capitão.',
    },
    {
      id: 'aud-2',
      timestamp: '18:52',
      actorName: 'Rafael Oliveira',
      actorRole: 'MEMBER',
      action: 'Mesa',
      detail: 'Rafael Oliveira entrou na posição Principal.',
    },
    {
      id: 'aud-3',
      timestamp: '18:40',
      actorName: 'Matheus Rocha',
      actorRole: 'PROGRAMMING',
      action: 'Mídia',
      detail: 'Enviou aviso_acampamento_2026.png (3840×2160) no bloco 04.',
    },
  ],
};
