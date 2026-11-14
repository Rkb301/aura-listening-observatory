import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export const REDIRECT_URI = 'http://127.0.0.1:4373/auth/callback';
export const SCOPES = [
  'user-read-private','user-library-read','user-library-modify',
  'playlist-read-private','playlist-read-collaborative',
  'playlist-modify-private','playlist-modify-public',
  'user-read-playback-state','user-modify-playback-state','user-read-currently-playing',
  'user-read-recently-played','user-top-read','user-read-playback-position',
];

export class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export const validClientId = (s) => typeof s === 'string' && /^[a-f\d]{32}$/i.test(s.trim());
export const validSpotifyUri = (uri) => typeof uri === 'string' && /^spotify:(track|album|playlist|episode|show|artist|audiobook):[A-Za-z0-9]{10,64}$/.test(uri);
export const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9]{10,64}$/.test(id);

export class SpotifyAuth {
  constructor(dataDir) {
    this.dataDir = dataDir; this.clientId = ''; this.tokens = null;
    this.pending = null; this.refreshing = null;
  }
  async init() {
    await mkdir(this.dataDir, { recursive:true, mode:0o700 });
    try { this.clientId = JSON.parse(await readFile(path.join(this.dataDir,'config.json'), 'utf8')).clientId || ''; } catch {}
    try { this.tokens = JSON.parse(await readFile(path.join(this.dataDir,'tokens.json'), 'utf8')); } catch {}
    if (process.env.SPOTIFY_CLIENT_ID && validClientId(process.env.SPOTIFY_CLIENT_ID)) this.clientId = process.env.SPOTIFY_CLIENT_ID;
  }
  async setClientId(id) {
    if (!validClientId(id)) throw new HttpError(400,'Enter the 32-character Spotify Client ID from your developer dashboard.');
    if (id !== this.clientId) await this.logout();
    this.clientId = id.trim();
    await writeFile(path.join(this.dataDir,'config.json'), JSON.stringify({clientId:this.clientId},null,2), {mode:0o600});
  }
  async logout() {
    this.tokens = null; this.pending = null;
    try { await unlink(path.join(this.dataDir,'tokens.json')); } catch {}
  }
  status() { return { configured: validClientId(this.clientId), loggedIn: !!this.tokens?.refresh_token, clientId: this.clientId, redirectUri: REDIRECT_URI }; }
  loginUrl() {
    if (!validClientId(this.clientId)) throw new HttpError(400,'Set up your Spotify Client ID first.');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(24).toString('hex');
    this.pending = { state, verifier, expires: Date.now()+10*60*1000 };
    const params = new URLSearchParams({ response_type:'code', client_id:this.clientId,
      redirect_uri:REDIRECT_URI, scope:SCOPES.join(' '), code_challenge_method:'S256',
      code_challenge: challenge, state, show_dialog:'true' });
    return `https://accounts.spotify.com/authorize?${params}`;
  }
  async handleCallback(query) {
    const pending = this.pending; this.pending = null;
    if (query.get('error')) throw new HttpError(400,`Spotify authorization rejected: ${query.get('error')}`);
    const state = query.get('state') || '';
    if (!pending || Date.now() > pending.expires || !/^[a-f0-9]{48}$/.test(state)
      || !timingSafeEqual(Buffer.from(state), Buffer.from(pending.state))) throw new HttpError(400,'Authorization session expired or state mismatch. Start login again.');
    if (!query.get('code')) throw new HttpError(400,'No authorization code received.');
    await this.exchange({ grant_type:'authorization_code', code:query.get('code'),
      redirect_uri:REDIRECT_URI, code_verifier:pending.verifier });
  }
  async exchange(params) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:this.clientId,...params})
    });
    const result = await res.json().catch(()=>({}));
    if (!res.ok) throw new HttpError(res.status,`Spotify token request failed (${result.error_description || result.error || res.status}).`);
    const previous = this.tokens || {};
    this.tokens = {access_token:result.access_token, refresh_token:result.refresh_token || previous.refresh_token,
      expires_at:Date.now() + Math.max(30, Number(result.expires_in || 3600)-45)*1000, scope:result.scope || previous.scope};
    await writeFile(path.join(this.dataDir,'tokens.json'), JSON.stringify(this.tokens), {mode:0o600});
  }
  async token(force=false) {
    if (!this.tokens?.refresh_token) throw new HttpError(401,'Connect your Spotify account in Settings first.');
    if (!force && this.tokens.access_token && this.tokens.expires_at > Date.now()) return this.tokens.access_token;
    if (!this.refreshing) this.refreshing = this.exchange({grant_type:'refresh_token',refresh_token:this.tokens.refresh_token}).finally(()=>{this.refreshing=null;});
    await this.refreshing;
    return this.tokens.access_token;
  }
  async spotify(apiPath, { method='GET', json }={}) {
    if (!apiPath.startsWith('/') || apiPath.startsWith('//')) throw new HttpError(400,'Invalid Spotify API path.');
    const safeRead=method==='GET';
    const request = async (force=false) => {
      try {
        return await fetch(`https://api.spotify.com/v1${apiPath}`, {
          method, headers:{Authorization:`Bearer ${await this.token(force)}`,...(json===undefined?{}:{'Content-Type':'application/json'})},
          ...(json===undefined?{}:{body:JSON.stringify(json)}), signal:AbortSignal.timeout(15000)
        });
      } catch(error) {
        // Preserve HttpError from OAuth refresh, but don't leak network details to UI.
        if (error instanceof HttpError) throw error;
        throw new HttpError(error?.name==='TimeoutError'?504:502,
          error?.name==='TimeoutError'?'Spotify did not respond in time.':'Could not reach Spotify. Check connectivity.');
      }
    };
    let res=await request();
    if(safeRead&&res.status===401)res=await request(true);

    // Spotify rate limits are sometimes transient. Retry only safe GETs and
    // only within a bounded budget; NEVER replay POST/PUT/DELETE mutations.
    for(let retry=0;safeRead&&retry<2;retry++){
      const temporary=[429,500,502,503,504].includes(res.status);
      if(!temporary)break;
      const retryAfter=res.headers.get('retry-after');
      const seconds=Number(retryAfter);
      // A longer Retry-After should reach the UI rather than blocking a local
      // request for tens of seconds. Invalid values use a small backoff.
      const ms=retryAfter!==null&&Number.isFinite(seconds)&&seconds>=0
        ?Math.round(seconds*1000):[350,850][retry];
      if(ms>2500)break;
      await new Promise(resolve=>setTimeout(resolve,ms));
      res=await request();
      if(safeRead&&res.status===401)res=await request(true);
    }
    const txt=await res.text();let data;try{data=txt?JSON.parse(txt):null;}catch{data=null;}
    if(!res.ok){
      // Mutations are never replayed. Explain ambiguous outcomes and permission
      // failures without exposing upstream response text or OAuth credentials.
      if(!safeRead && res.status===401)
        throw new HttpError(401,'Spotify authorization was rejected. Check the playlist before retrying; the change may already have happened.');
      if(!safeRead && res.status===403)
        throw new HttpError(403,'Spotify denied this change. Check playlist ownership, collaboration access and granted permissions.');
      if(!safeRead && res.status===409)
        throw new HttpError(409,'Spotify reports a playlist conflict. Reload the playlist and its latest snapshot before trying again.');
      if(!safeRead && [429,500,502,503,504].includes(res.status))
        throw new HttpError(res.status,'Spotify could not confirm this change. Check the current playlist before retrying.',res.headers.get('retry-after'));
      throw new HttpError(res.status,data?.error?.message||`Spotify API returned ${res.status}`,res.headers.get('retry-after'));
    }
    return data;
  }

}
