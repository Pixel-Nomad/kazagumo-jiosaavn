import { HTTPException } from "hono/http-exception";
import {
    JioSaavnTrack,
    JioSaavnAlbum,
    JioSaavnArtist,
    JioSaavnPlaylist,
    SearchResponse,
    TrackResponse,
    AlbumResponse,
    ArtistResponse,
    PlaylistResponse,
    EncryptedMediaResponse,
    HTTPStatusCode
  } from './types';
export class JioSaavnAPI {
  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
        const status = response.status as HTTPStatusCode;
        throw new HTTPException(status, { 
          message: `JioSaavn API request failed with status ${status}`
        });
    }

    try {
      return await response.json() as T;
    } catch (error) {
      throw new HTTPException(500, { 
        message: "Failed to parse JioSaavn API response"
      });
    }
  }

  public async search(query: string): Promise<{ results: JioSaavnTrack[] }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=search.getResults&api_version=4&_format=json&_marker=0&cc=in&ctx=web6dot0&includeMetaTags=1&q=${encodeURIComponent(query)}`
    );

    if (!data?.results?.length) {
      throw new HTTPException(404, { message: `No results found for "${query}"` });
    }

    return {
      results: data.results.map((track: any) => this.formatTrack(track))
    };
  }

  public async getTrack(id: string): Promise<{ track: JioSaavnTrack }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${id}&type=song`
    );

    if (!data?.songs?.length) {
      throw new HTTPException(404, { message: "Track not found" });
    }

    return {
      track: this.formatTrack(data.songs[0])
    };
  }

  public async getTrackById(id: string): Promise<{ track: JioSaavnTrack }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=song.getDetails&api_version=4&_format=json&_marker=0&ctx=web6dot0&pids=${id}`
    );

    if (!data?.songs?.length) {
      throw new HTTPException(404, { message: "Track not found" });
    }

    return {
      track: this.formatTrack(data.songs[0])
    };
  }

  public async getAlbum(id: string): Promise<{ album: JioSaavnAlbum }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${id}&type=album`
    );

    if (!data) {
      throw new HTTPException(404, { message: "Album not found" });
    }

    return {
      album: this.formatAlbum(data)
    };
  }

  public async getArtist(id: string): Promise<{ artist: JioSaavnArtist }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${id}&type=artist&n_song=50`
    );

    if (!data) {
      throw new HTTPException(404, { message: "Artist not found" });
    }

    return {
      artist: this.formatArtist(data)
    };
  }

  public async getPlaylist(id: string, limit = 50): Promise<{ playlist: JioSaavnPlaylist }> {
    const data = await this.request<any>(
      `https://www.jiosaavn.com/api.php?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${id}&type=playlist&n=${limit}`
    );

    if (!data) {
      throw new HTTPException(404, { message: "Playlist not found" });
    }

    return {
      playlist: this.formatPlaylist(data)
    };
  }

  public async getEncryptedMediaUrl(encryptedMediaUrl: string): Promise<any> {
    const params = new URLSearchParams({
      "__call": "song.generateAuthToken",
      "url": encryptedMediaUrl,
      "bitrate": "320",
      "api_version": "4",
      "_format": "json",
      "ctx": "web6dot0",
      "_marker": "0",
    });

    return this.request<any>(
      `https://www.jiosaavn.com/api.php?${params.toString()}`
    );
  }

  private formatTrack(track: any): JioSaavnTrack {
    const data: JioSaavnTrack = {
      identifier: track.id,
      title: track.title || 'Unknown Track',
      length: Number(track.more_info?.duration || 0) * 1000,
      uri: track.perma_url || null,
      artworkUrl: track.image?.replace("150x150", "500x500") || '',
      author: track.more_info?.artistMap?.primary_artists?.[0]?.name || null,
      encryptedMediaUrl: track.more_info?.encrypted_media_url || null,
      albumUrl: track.more_info?.album_url || null,
      artistUrl: track.more_info?.artistMap?.primary_artists?.[0]?.perma_url || null,
      albumName: track.more_info?.album || null,
      artistArtworkUrl: track.more_info?.artistMap?.primary_artists?.[0]?.image?.replace("150x150", "500x500") || null,
      previewUrl: track.more_info?.media_preview_url || track.more_info?.vlink || null,
    };

    return data;
  }

  private formatAlbum(album: any): JioSaavnAlbum {
    return {
      id: album.id,
      name: album.title || 'Unknown Album',
      uri: album.perma_url || '',
      artworkUrl: album.image?.replace("150x150", "500x500") || '',
      author: album.subtitle || 'Unknown Artist',
      tracks: album.list?.map((song: any) => this.formatTrack(song)) || [],
      totalSongs: album.list_count || 0,
    };
  }

  private formatArtist(artist: any): JioSaavnArtist {
    return {
      name: artist.name || 'Unknown Artist',
      uri: artist.urls?.overview || '',
      artworkUrl: artist.image?.replace("150x150", "500x500") || '',
      tracks: artist.topSongs?.map((song: any) => this.formatTrack(song)) || [],
    };
  }

  private formatPlaylist(playlist: any): JioSaavnPlaylist {
    return {
      title: playlist.title || 'Unknown Playlist',
      uri: playlist.perma_url || '',
      artworkUrl: playlist.image?.replace("150x150", "500x500") || '',
      tracks: playlist.list?.map((song: any) => this.formatTrack(song)) || [],
      totalSongs: playlist.list_count || 0,
    };
  }

  public extract = {
    track: (url: string) => {
      const match = url.match(/jiosaavn\.com\/song\/[^/]+\/([^/]+)$/i);
      return match?.[1];
    },
    album: (url: string) => {
      const match = url.match(/jiosaavn\.com\/album\/[^/]+\/([^/]+)$/i);
      return match?.[1];
    },
    artist: (url: string) => {
      const match = url.match(/jiosaavn\.com\/artist\/[^/]+\/([^/]+)$/i);
      return match?.[1];
    },
    playlist: (url: string) => {
      const match = url.match(/(?:jiosaavn\.com|saavn\.com)\/(?:featured|s\/playlist)\/[^/]+\/[^/]+\/([^/]+)$|(?:\/([^/]+)$)/i);
      return match?.[1] || match?.[2];
    },
  };
}

// export interface JioSaavnTrack {
//   identifier: string;
//   title: string;
//   length: number;
//   uri: string | null;
//   artworkUrl: string;
//   author: string | null;
//   encryptedMediaUrl: string | null;
//   albumUrl: string | null;
//   artistUrl: string | null;
//   albumName: string | null;
//   artistArtworkUrl: string | null;
//   previewUrl: string | null;
// }

// export interface JioSaavnAlbum {
//   id: string;
//   name: string;
//   uri: string;
//   artworkUrl: string;
//   author: string;
//   tracks: JioSaavnTrack[];
//   totalSongs: number;
// }

// export interface JioSaavnArtist {
//   name: string;
//   uri: string;
//   artworkUrl: string;
//   tracks: JioSaavnTrack[];
// }

// export interface JioSaavnPlaylist {
//   title: string;
//   uri: string;
//   artworkUrl: string;
//   tracks: JioSaavnTrack[];
//   totalSongs: number;
// }