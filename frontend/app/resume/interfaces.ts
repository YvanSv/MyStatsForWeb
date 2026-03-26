export type SortOption = "streams" | "minutes" | "rating";
export type RangeOption = "day" | "month" | "season" | "year" | "lifetime";

export interface UserProfile {
    display_name: string;
    bio: string;
    avatar: string;
    banner: string;
    perms: any[];
}

export interface ItemBrief {
  name: string;
  minutes: number;
  rating: number;
  streams: number;
  image?: string;
}

export interface DataFormat {
  user: UserProfile;
  topArtists: ItemBrief[];
  topTracks: ItemBrief[];
  topAlbums: ItemBrief[];
  minutes: number;
  streams: number;
  distinct_tracks: number;
  distinct_albums: number;
  distinct_artists: number;
}

export interface PlacedWidget {
  id: number;
  type: string;
  index: number;
  data: any;
  w: number;
  h: number;
  settings: any;
}

export interface SelectedWidget {
  id: number;
  type: string;
  settings: any;
}