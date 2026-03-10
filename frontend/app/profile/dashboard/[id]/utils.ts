export interface DashboardStats {
  totalTime: string;
  avgTimePerDay: string;
  totalStreams: string;
  avgStreamsPerDay: number;
  peakHour: string;
  peakDay: string;
  peakMonth: string;
  ratio: string;
  clockData: any[];
  weeklyData: any[];
  monthlyData: any[];
  annualData: any[];
  cumulativeData: any[];
  uniqueTracks: number;
  uniqueAlbums: number;
  uniqueArtists: number;
  topTrack: TopItem[] | null;
  topAlbum: TopItem[] | null;
  topArtist: TopItem[] | null;
  entityEvolution: any[];
}

export const INITIAL_STATS = {
  totalTime: "-- min",
  avgTimePerDay: "-- min",
  totalStreams: "0",
  avgStreamsPerDay: 0,
  uniqueTracks: 0,
  uniqueAlbums: 0,
  uniqueArtists: 0,
  peakHour: "--:--",
  peakDay: "--",
  peakMonth: "--",
  ratio: "0%",
  clockData: [],
  weeklyData: [],
  monthlyData: [],
  annualData: [],
  cumulativeData: [],
  topTrack: null,
  topAlbum: null,
  topArtist: null,
  entityEvolution: [],
};

interface TopItem {
  name: string;
  artist?: string;
  album?: string;
  image: string | null;
}

export const formatToInputDate = (dateISO: string | null) => {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  
  // On récupère l'année, le mois et le jour localement
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const getDateRange = (range: string, offset:number = 0) => {
  const start = new Date();
  const end = new Date();
  
  switch (range) {
    case 'today':
      start.setDate(start.getDate() + offset);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + offset);
      end.setHours(23, 59, 59, 999);
      break;

    case '24h':
      start.setHours(start.getHours() + (offset * 24) - 24);
      end.setHours(end.getHours() + (offset * 24));
      break;

    case 'week':
      const currentDay = start.getDay();
      start.setDate(start.getDate() - currentDay + (offset * 7));
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case '7d':
      start.setDate(start.getDate() + (offset * 7) - 7);
      end.setDate(end.getDate() + (offset * 7));
      break;

    case 'month':
      // Décale de X mois calendaires
      start.setMonth(start.getMonth() + offset, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + offset + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case '1m':
      start.setDate(start.getDate() + (offset * 30) - 30);
      end.setDate(end.getDate() + (offset * 30));
      break;

    case 'season': {
      // 1. Déterminer le début de la saison actuelle (Mars, Juin, Sept, Déc)
      const currentMonth = start.getMonth();
      let startMonth = 11; // Décembre (Hiver)
      if (currentMonth >= 2 && currentMonth <= 4) startMonth = 2;      // Mars (Printemps)
      else if (currentMonth >= 5 && currentMonth <= 7) startMonth = 5; // Juin (Été)
      else if (currentMonth >= 8 && currentMonth <= 10) startMonth = 8;// Sept (Automne)
      
      // 2. Appliquer l'offset (1 unité = 3 mois)
      start.setMonth(startMonth + (offset * 3), 1);
      start.setHours(0, 0, 0, 0);
      
      // La fin de la saison est 3 mois après le début, moins 1 jour
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 3, 0); 
      end.setHours(23, 59, 59, 999);
      break;
    }

    case '3m':
      start.setDate(start.getDate() + (offset * 90) - 90);
      end.setDate(end.getDate() + (offset * 90));
      break;

    case 'half': {
      // 1. Déterminer le début du semestre (Janvier ou Juillet)
      const isFirstHalf = start.getMonth() < 6;
      const startMonth = isFirstHalf ? 0 : 6;
      
      // 2. Appliquer l'offset (1 unité = 6 mois)
      start.setMonth(startMonth + (offset * 6), 1);
      start.setHours(0, 0, 0, 0);
      
      // La fin du semestre est 6 mois après le début, moins 1 jour
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 6, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case '6m':
      start.setDate(start.getDate() + (offset * 180) - 180);
      end.setDate(end.getDate() + (offset * 180));
      break;

    case 'year':
      start.setFullYear(start.getFullYear() + offset, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;

    case '1y':
      start.setFullYear(start.getFullYear() + offset - 1);
      end.setFullYear(end.getFullYear() + offset);
      break;

    case 'lifetime':
      return { start: null, end: null };

    default:
      start.setHours(0, 0, 0, 0);
  }

  return { 
    start: start.toISOString(), 
    end: end.toISOString() 
  };
};

export const getRangeLabel = (range: string, offset: number) => {
  const { start } = getDateRange(range, offset);
  if (!start && range === 'lifetime') return "Tout le temps";
  
  const date = new Date(start!);
  const year = date.getFullYear();

  switch (range) {
    case 'today': return date.toLocaleDateString('fr-FR');
    
    case 'month':
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
      return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    case 'season':
      const months = date.getMonth();
      if (months === 2) return `Printemps ${year}`;
      if (months === 5) return `Été ${year}`;
      if (months === 8) return `Automne ${year}`;
      return `Hiver ${year}`;
    
    case 'half':
      const month = date.getMonth();
      if (month < 6) return `1ère moitié ${year}`;
      return `2ème moitié ${year}`

    case 'year': return `${year}`;
    case 'lifetime': return "Lifetime";
    default: return null;
  }
};