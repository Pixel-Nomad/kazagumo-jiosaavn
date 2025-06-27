import { Kazagumo, KazagumoPlugin as Plugin, KazagumoSearchOptions, KazagumoSearchResult, KazagumoTrack, SearchResultTypes } from 'kazagumo';
import { JioSaavnAPI } from './JioSaavnAPI';
import { KazagumoError } from 'kazagumo';
import { 
    JioSaavnPluginOptions,
    JioSaavnTrack,
    Result
  } from './types';
const REGEX = /(?:https?:\/\/)?(?:www\.)?(?:jiosaavn\.com|saavn\.com)\/(song|album|artist|featured)\/[^\/]+\/([^\/]+)/i;
const newREGEX = /(?:https?:\/\/)?(?:www\.)?(?:jiosaavn\.com|saavn\.com)\/s\/(playlist)\/[^\/]+\/[^\/]+\/([^\/]+)/i;
const bkpREGEX = /(?:https?:\/\/)?(?:www\.)?(?:jiosaavn\.com|saavn\.com)\/s\/(song)\/[^\/]+\/[^\/]+\/[^\/]+\/([^\/]+)/i;
// export interface JioSaavnPluginOptions {
//   /**
//    * The number of tracks to fetch per page for playlists/albums
//    * @default 50
//    */
//   pageLimit?: number;
  
//   /**
//    * The track limit when searching
//    * @default 10
//    */
//   searchLimit?: number;
  
//   /**
//    * Number of retries for failed requests
//    * @default 2
//    */
//   retryLimit?: number;
// }

export class KazagumoPlugin extends Plugin {
  public options: Required<JioSaavnPluginOptions>;
  private api: JioSaavnAPI;
  private _search: ((query: string, options?: KazagumoSearchOptions) => Promise<KazagumoSearchResult>) | null;
  private kazagumo: Kazagumo | null;
  private retriesLeft: number;

  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;

  constructor(options: JioSaavnPluginOptions = {}) {
    super();
    this.options = {
      pageLimit: options.pageLimit ?? 50,
      searchLimit: options.searchLimit ?? 10,
      retryLimit: options.retryLimit ?? 2,
    };
    
    this.api = new JioSaavnAPI();
    this.kazagumo = null;
    this._search = null;
    this.retriesLeft = this.options.retryLimit;

    this.methods = {
      song: this.getTrack.bind(this),
      album: this.getAlbum.bind(this),
      artist: this.getArtist.bind(this),
      playlist: this.getPlaylist.bind(this),
      featured: this.getPlaylist.bind(this),
    };
  }

  public load(kazagumo: Kazagumo): void {
    this.kazagumo = kazagumo;
    this._search = kazagumo.search.bind(kazagumo);
    kazagumo.search = this.search.bind(this);
  }

  private async search(query: string, options?: KazagumoSearchOptions): Promise<KazagumoSearchResult> {
    if (!this.kazagumo || !this._search) {
      throw new KazagumoError(1, 'kazagumo-jiosaavn is not loaded yet.');
    }

    if (!query) throw new KazagumoError(3, 'Query is required');
    const isUrl = /^https?:\/\//i.test(query);
    const normalURL = REGEX.test(query)
    const bkpURL = bkpREGEX.test(query)
    
    if (normalURL) {
      const [, type, id] = REGEX.exec(query) || [];
      if (type in this.methods) {
        try {
          // Try with Lavalink first if enabled
          if (this.retriesLeft > 0) {
            const lavalinkResult = await this._search(query, options);
            if (lavalinkResult.tracks.length > 0) return lavalinkResult;
            this.retriesLeft--;
          }
  
          const result = await this.methods[type](id, options?.requester);
          const loadType = type === 'song' ? 'TRACK' : 'PLAYLIST';
          
          return this.buildSearch(result.name, result.tracks, loadType);
        } catch (e) {
          return this.buildSearch(undefined, [], 'SEARCH');
        }
      } else if (options?.engine === 'jiosaavn' && !isUrl) {
        const result = await this.searchTrack(query, options?.requester);
        return this.buildSearch(undefined, result.tracks, 'SEARCH');
      }
    } else if (bkpURL){
      const [, type, id] = bkpREGEX.exec(query) || [];
      if (type in this.methods) {
        try {
          // Try with Lavalink first if enabled
          if (this.retriesLeft > 0) {
            const lavalinkResult = await this._search(query, options);
            if (lavalinkResult.tracks.length > 0) return lavalinkResult;
            this.retriesLeft--;
          }
  
          const result = await this.methods[type](id, options?.requester);
          const loadType = type === 'song' ? 'TRACK' : 'PLAYLIST';
          
          return this.buildSearch(result.name, result.tracks, loadType);
        } catch (e) {
          return this.buildSearch(undefined, [], 'SEARCH');
        }
      } else if (options?.engine === 'jiosaavn' && !isUrl) {
        const result = await this.searchTrack(query, options?.requester);
        return this.buildSearch(undefined, result.tracks, 'SEARCH');
      }
    } else {
      const [, type, id] = newREGEX.exec(query) || [];
      if (type in this.methods) {
        try {
          // Try with Lavalink first if enabled
          if (this.retriesLeft > 0) {
            const lavalinkResult = await this._search(query, options);
            if (lavalinkResult.tracks.length > 0) return lavalinkResult;
            this.retriesLeft--;
          }
  
          const result = await this.methods[type](id, options?.requester);
          const loadType = type === 'song' ? 'TRACK' : 'PLAYLIST';
          
          return this.buildSearch(result.name, result.tracks, loadType);
        } catch (e) {
          return this.buildSearch(undefined, [], 'SEARCH');
        }
      } else if (options?.engine === 'jiosaavn' && !isUrl) {
        const result = await this.searchTrack(query, options?.requester);
        return this.buildSearch(undefined, result.tracks, 'SEARCH');
      }
    }
    

    return this._search(query, options);
  }

  private async searchTrack(query: string, requester: unknown): Promise<Result> {
    const { results } = await this.api.search(query);
    const tracks = results.slice(0, this.options.searchLimit)
      .map(track => this.buildKazagumoTrack(track, requester));
    
    return { tracks };
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    const { track } = await this.api.getTrack(id);
    return { tracks: [this.buildKazagumoTrack(track, requester)] };
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    const { album } = await this.api.getAlbum(id);
    const tracks = album.tracks
      .slice(0, this.options.pageLimit)
      .map(track => this.buildKazagumoTrack(track, requester));
    
    return { tracks, name: album.name };
  }

  private async getArtist(id: string, requester: unknown): Promise<Result> {
    const { artist } = await this.api.getArtist(id);
    const tracks = artist.tracks
      .slice(0, this.options.pageLimit)
      .map(track => this.buildKazagumoTrack(track, requester));
    
    return { tracks, name: artist.name };
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    const { playlist } = await this.api.getPlaylist(id, this.options.pageLimit);
    const tracks = playlist.tracks
      .map(track => this.buildKazagumoTrack(track, requester));
    
    return { tracks, name: playlist.title };
  }

  private buildSearch(
    playlistName?: string,
    tracks: KazagumoTrack[] = [],
    type?: SearchResultTypes,
  ): KazagumoSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? 'TRACK',
    };
  }

  private buildKazagumoTrack(jiosaavnTrack: JioSaavnTrack, requester: unknown): KazagumoTrack {
    return new KazagumoTrack(
      {
        encoded: '',
        pluginInfo: {
          name: 'kazagumo-jiosaavn',
        },
        info: {
          sourceName: 'jiosaavn',
          identifier: jiosaavnTrack.identifier,
          isSeekable: true,
          author: jiosaavnTrack.author || 'Unknown Artist',
          length: jiosaavnTrack.length,
          isStream: false,
          position: 0,
          title: jiosaavnTrack.title,
          uri: jiosaavnTrack.uri || `https://www.jiosaavn.com/song/${jiosaavnTrack.identifier}`,
          artworkUrl: jiosaavnTrack.artworkUrl,
        },
      },
      requester,
    ).setKazagumo(this.kazagumo!);
  }
}

// interface Result {
//   tracks: KazagumoTrack[];
//   name?: string;
// }

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