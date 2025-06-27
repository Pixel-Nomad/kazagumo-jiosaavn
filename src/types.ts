import { KazagumoTrack } from '@pixel_nomad/kazagumo';

export interface JioSaavnPluginOptions {
  /**
   * The number of tracks to fetch per page for playlists/albums
   * @default 50
   */
  pageLimit?: number;
  
  /**
   * The track limit when searching
   * @default 10
   */
  searchLimit?: number;
  
  /**
   * Number of retries for failed requests
   * @default 2
   */
  retryLimit?: number;
}

export interface JioSaavnTrack {
  identifier: string;
  title: string;
  length: number;
  uri: string | null;
  artworkUrl: string;
  author: string | null;
  encryptedMediaUrl: string | null;
  albumUrl: string | null;
  artistUrl: string | null;
  albumName: string | null;
  artistArtworkUrl: string | null;
  previewUrl: string | null;
}

export interface JioSaavnAlbum {
  id: string;
  name: string;
  uri: string;
  artworkUrl: string;
  author: string;
  tracks: JioSaavnTrack[];
  totalSongs: number;
}

export interface JioSaavnArtist {
  name: string;
  uri: string;
  artworkUrl: string;
  tracks: JioSaavnTrack[];
}

export interface JioSaavnPlaylist {
  title: string;
  uri: string;
  artworkUrl: string;
  tracks: JioSaavnTrack[];
  totalSongs: number;
}

export interface Result {
  tracks: KazagumoTrack[];
  name?: string;
}

export interface SearchResponse {
  results: JioSaavnTrack[];
}

export interface TrackResponse {
  track: JioSaavnTrack;
}

export interface AlbumResponse {
  album: JioSaavnAlbum;
}

export interface ArtistResponse {
  artist: JioSaavnArtist;
}

export interface PlaylistResponse {
  playlist: JioSaavnPlaylist;
}

export interface EncryptedMediaResponse {
  auth_url: string;
  // Add other response fields as needed
}

export type HTTPStatusCode = 
  | 200 | 201 | 202 | 203 | 206
  | 300 | 301 | 302 | 303 | 305 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417
  | 500 | 501 | 502 | 503 | 504 | 505;