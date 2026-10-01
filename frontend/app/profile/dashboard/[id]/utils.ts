import { seasonEnd, seasonOfMonth, seasonStart } from "@/app/services/seasons";

export interface HourlyData {
  hour: string;
  value: number;
  streams: number;
}

export interface DashboardStats {
  totalTime: number;
  avgTimePerDay: number;
  totalStreams: number;
  avgStreamsPerDay: number;
  peakHour: any[];
  peakDay: any[];
  peakMonth: any[];
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
  streamsEvolution: any[];
}

export const INITIAL_STATS = {
  totalTime: 0,
  avgTimePerDay: 0,
  totalStreams: 0,
  avgStreamsPerDay: 0,
  uniqueTracks: 0,
  uniqueAlbums: 0,
  uniqueArtists: 0,
  peakHour: [],
  peakDay: [],
  peakMonth: [],
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
  streamsEvolution: [],
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
  if (isNaN(d.getTime())) return "";
  
  // On récupère l'année, le mois et le jour localement
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Bornes de la période demandée, en ISO UTC.
 * Les journées sont calculées en heure locale de l'utilisateur (minuit local, 23:59:59.999 local)
 * puis converties en instants UTC : c'est voulu, l'API filtre ainsi sur les journées locales
 * de l'utilisateur et non sur les journées UTC. Les dates sont construites par composantes
 * (année, mois, jour) pour rester correctes lors des changements d'heure.
 */
export const getDateRange = (range: string, offset: number = 0) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const endOfDay = (yy: number, mm: number, dd: number) => new Date(yy, mm, dd, 23, 59, 59, 999);
  let start: Date;
  let end: Date;

  switch (range) {
    case 'today':
      start = new Date(y, m, d + offset);
      end = endOfDay(y, m, d + offset);
      break;

    case 'week': {
      // La semaine commence le lundi
      const sinceMonday = (now.getDay() + 6) % 7;
      start = new Date(y, m, d - sinceMonday + offset * 7);
      end = endOfDay(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      break;
    }

    case 'month':
      // Décale de X mois calendaires
      start = new Date(y, m + offset, 1);
      end = endOfDay(y, m + offset + 1, 0);
      break;

    case '1m':
      // 30 jours glissants alignés sur les jours, aujourd'hui compris
      start = new Date(y, m, d + offset * 30 - 29);
      end = endOfDay(y, m, d + offset * 30);
      break;

    case 'season':
      start = seasonStart(now, offset);
      end = seasonEnd(start);
      break;

    case '6m':
      // 6 mois calendaires, le mois courant compris
      start = new Date(y, m + offset * 6 - 5, 1);
      end = endOfDay(y, m + offset * 6 + 1, 0);
      break;

    case 'year':
      start = new Date(y + offset, 0, 1);
      end = endOfDay(y + offset, 11, 31);
      break;

    case 'lifetime':
      return { start: null, end: null };

    default:
      start = new Date(y, m, d);
      end = now;
  }

  return { start: start.toISOString(), end: end.toISOString() };
};

const SEASON_NAMES = ["Hiver", "Printemps", "Été", "Automne"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// « 5 oct. – 11 oct. 2026 » ; l'année du début n'apparaît que si elle diffère de celle de la fin
const formatDaySpan = (from: Date, to: Date) => {
  const day = (x: Date, withYear: boolean) =>
    x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  return `${day(from, from.getFullYear() !== to.getFullYear())} – ${day(to, true)}`;
};

const formatMonthSpan = (from: Date, to: Date) => {
  const month = (x: Date) => x.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  return `${month(from)} – ${month(to)}`;
};

/** Libellé de la période affichée, ou null pour une période personnalisée (dates éditables). */
export const getRangeLabel = (range: string, offset: number) => {
  const { start, end } = getDateRange(range, offset);
  if (!start || !end) return range === 'lifetime' ? "Tout l'historique" : null;

  const from = new Date(start);
  const to = new Date(end);
  const year = from.getFullYear();

  switch (range) {
    case 'today': return from.toLocaleDateString('fr-FR');

    case 'week': return formatDaySpan(from, to);

    case 'month': return `${capitalize(from.toLocaleDateString('fr-FR', { month: 'long' }))} ${year}`;

    case 'season': return `${SEASON_NAMES[seasonOfMonth(from.getMonth())]} ${year}`;

    case '1m': return offset === 0 ? "30 derniers jours" : formatDaySpan(from, to);

    case '6m': return offset === 0 ? "6 derniers mois" : formatMonthSpan(from, to);

    case 'year': return `${year}`;

    default: return null;
  }
};

/**
 * Lisse les minutes d'une journée (24 entrées horaires) : chaque heure est plafonnée à 60 minutes
 * et le surplus est reporté sur les heures suivantes, de façon cyclique (23h -> 0h), sur 24 heures
 * au plus. Le total est conservé, sauf s'il dépasse 24 * 60 minutes (le reste est alors perdu).
 * L'entrée n'est pas modifiée ; moins de 24 entrées : renvoyée telle quelle.
 */
export const smoothHourlyData = (rawData: HourlyData[]): HourlyData[] => {
  if (rawData.length < 24) return rawData;
  const data = rawData.map(h => ({ ...h }));
  let carry = 0;

  // Premier tour : chaque heure reçoit son propre volume plus le report des heures précédentes
  for (let i = 0; i < 24; i++) {
    const total = rawData[i].value + carry;
    data[i].value = Math.min(60, total);
    carry = total - data[i].value;
  }
  // Second tour (cycle 23h -> 0h) : le report comble la place restante, heure après heure
  for (let i = 0; i < 24 && carry > 0; i++) {
    const added = Math.min(60 - data[i].value, carry);
    data[i].value += added;
    carry -= added;
  }

  return data;
};
