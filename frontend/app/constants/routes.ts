const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API_AUTH = API_BASE_URL+"/auth";
const API_IMPORT = API_BASE_URL+"/import";
const API_MY_DATA = API_BASE_URL+"/data/my";
const API_ALL_DATA = API_BASE_URL+"/data/all";
const API_ADMIN = API_BASE_URL+"/admin";

export const API_ENDPOINTS = {
  REGISTER: `${API_AUTH}/register`,
  LOGIN: `${API_AUTH}/login`,
  LOGOUT:`${API_AUTH}/logout`,
  ME: `${API_AUTH}/me`,
  EDIT_INFOS: `${API_AUTH}/update`,
  DELETE_ACCOUNT: `${API_AUTH}/delete`,
  SPOTIFY_LOGIN: `${API_AUTH}/spotify-login`,

  SPOTIFY_IMPORT: `${API_IMPORT}/spotify`,
  APPLE_IMPORT:`${API_IMPORT}/apple`,
 
  HOME_DATA: `${API_BASE_URL}/data/overview`,

  SPOTIFY_STATUS:`${API_BASE_URL}/spotify/status`,
  PROFILE_DATA: `${API_BASE_URL}/profile`,
  PROFILE_DATA_TOPS: `${API_BASE_URL}/profile/tops`,
  SIMPLE_PROFILE_DATA: `${API_BASE_URL}/profile/simple`,
  EDITABLE_PROFILE_DATA: `${API_BASE_URL}/edit-profile`,
  DASHBOARD_DATA: `${API_BASE_URL}/profile/dashboard`,
  WEBSOCKET_PROGRESS: `${API_BASE_URL}/ws/progress`,
  
  ALL_HISTORY:`${API_ALL_DATA}/history`,
  ALL_TRACKS:`${API_ALL_DATA}/tracks`,
  ALL_TRACKS_METADATA:`${API_ALL_DATA}/tracks/metadata`,
  ALL_ARTISTS:`${API_ALL_DATA}/artists`,
  ALL_ARTISTS_METADATA:`${API_ALL_DATA}/artists/metadata`,
  ALL_ALBUMS:`${API_ALL_DATA}/albums`,
  ALL_ALBUMS_METADATA:`${API_ALL_DATA}/albums/metadata`,

  HISTORY:`${API_MY_DATA}/history`,
  TRACKS:`${API_MY_DATA}/tracks`,
  TRACKS_METADATA:`${API_MY_DATA}/tracks/metadata`,
  ARTISTS:`${API_MY_DATA}/artists`,
  ARTISTS_METADATA:`${API_MY_DATA}/artists/metadata`,
  ALBUMS:`${API_MY_DATA}/albums`,
  ALBUMS_METADATA:`${API_MY_DATA}/albums/metadata`,
  CLEAR_ACCOUNT: `${API_MY_DATA}/clear`,
  REFRESH_USER_DATA: `${API_MY_DATA}/refresh`,
  TODAY_STATS: `${API_MY_DATA}/today`,
  CURRENTLY_PLAYING: `${API_MY_DATA}/currently-playing`,
  PAUSE: `${API_MY_DATA}/currently-playing/pause`,
  RESUME: `${API_MY_DATA}/currently-playing/resume`,
  NEXT: `${API_MY_DATA}/currently-playing/next`,
  PREVIOUS: `${API_MY_DATA}/currently-playing/previous`,
  SHARE: `${API_MY_DATA}/resume`,

  ERRORS: `${API_ADMIN}/errors`,
  MERGE_REQUESTS: `${API_ADMIN}/merge-requests`,
  CREATE_REQUESTS: `${API_ADMIN}/create-requests`,
};

export const FRONT_ROUTES = {
  ACCUEIL: '/',
  AUTH: '/auth',
  MY_RANKINGS: '/my/',
  ALL_RANKINGS: '/all/',
  IMPORT: '/import',
  ACCOUNT: '/account',
  DASHBOARD: '/profile/dashboard',
  ABOUT: '/about',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  HELP: '/faq',
  SETTINGS: '/settings',
  RESUME: '/resume',
}