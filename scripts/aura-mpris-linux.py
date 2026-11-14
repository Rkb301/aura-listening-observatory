#!/usr/bin/python3
"""Linux MPRIS adapter for AURA's official Spotify/Soloist playback engine.

No credentials stored or printed. Read state from AURA's localhost backend.
Media-key methods are translated to confirmed local AURA commands. The main
GObject thread stays responsive while HTTP requests run on a single worker.
Requires Ubuntu's system python3-gi (Gio/GLib), not a pip package.
"""
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor

import gi
gi.require_version('Gio','2.0')
from gi.repository import Gio, GLib

BASE='http://127.0.0.1:4373'
NAME='org.mpris.MediaPlayer2.aura'
OBJECT='/org/mpris/MediaPlayer2'
NO_TRACK='/org/mpris/MediaPlayer2/TrackList/NoTrack'
TRACK_ID=re.compile(r'^spotify:track:([A-Za-z0-9]{10,64})$')
INTRO='''<node>
  <interface name="org.mpris.MediaPlayer2">
    <method name="Raise"/>
    <method name="Quit"/>
    <property name="CanQuit" type="b" access="read"/>
    <property name="CanRaise" type="b" access="read"/>
    <property name="HasTrackList" type="b" access="read"/>
    <property name="Identity" type="s" access="read"/>
    <property name="DesktopEntry" type="s" access="read"/>
    <property name="SupportedUriSchemes" type="as" access="read"/>
    <property name="SupportedMimeTypes" type="as" access="read"/>
  </interface>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Next"/>
    <method name="Previous"/>
    <method name="Pause"/>
    <method name="PlayPause"/>
    <method name="Stop"/>
    <method name="Play"/>
    <method name="Seek"><arg name="Offset" type="x" direction="in"/></method>
    <method name="SetPosition"><arg name="TrackId" type="o" direction="in"/>
      <arg name="Position" type="x" direction="in"/></method>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="LoopStatus" type="s" access="read"/>
    <property name="Rate" type="d" access="read"/>
    <property name="Shuffle" type="b" access="readwrite"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Volume" type="d" access="readwrite"/>
    <property name="Position" type="x" access="read"/>
    <property name="MinimumRate" type="d" access="read"/>
    <property name="MaximumRate" type="d" access="read"/>
    <property name="CanGoNext" type="b" access="read"/>
    <property name="CanGoPrevious" type="b" access="read"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanPause" type="b" access="read"/>
    <property name="CanSeek" type="b" access="read"/>
    <property name="CanControl" type="b" access="read"/>
  </interface>
</node>'''
PLAYER='org.mpris.MediaPlayer2.Player'
ROOT='org.mpris.MediaPlayer2'

def request_json(path,method='GET',body=None,csrf=None):
    raw=None if body is None else json.dumps(body).encode('utf-8')
    headers={}
    if body is not None:
        headers={'Content-Type':'application/json','X-Aura-Request':csrf or ''}
    req=urllib.request.Request(BASE+path,data=raw,method=method,headers=headers)
    with urllib.request.urlopen(req,timeout=2.2) as response:
        return json.load(response)

def music_state():
    try:return request_json('/api/soloist/state')
    except (OSError,ValueError,urllib.error.HTTPError):return {}

def title_of(track):
    return str(track.get('name') or
        (track.get('decorations') or {}).get('identity',{}).get('name') or 'AURA Music')

def artists_of(track):
    artists=[x.get('name','') for x in track.get('artists',[]) if isinstance(x,dict)]
    if not artists:
        for entry in (track.get('decorations') or {}).get('creators',[]):
            artist=entry.get('entity',{}).get('decorations',{}).get('identity',{}).get('name')
            if artist:artists.append(str(artist))
    return artists

def playback_status(state):
    val=(state.get('playback') or {}).get('status')
    return 'Playing' if val in ('playing','buffering') else ('Paused' if val=='paused' else 'Stopped')

def current_track_id(state):
    uri=((state.get('playback') or {}).get('item') or {}).get('uri','')
    m=TRACK_ID.match(uri)
    return '/org/mpris/MediaPlayer2/Track/'+m.group(1) if m else NO_TRACK

def position_us(state):
    p=(state.get('playback') or {}).get('position') or {}
    val=max(0,float(p.get('position_ms') or 0))
    speed=float(p.get('speed') or 0)
    stamp=float(p.get('timestamp_ms') or 0)
    if stamp and speed>0:
        val+=max(0,time.time()*1000-stamp)*speed
    return int(max(0,val)*1000)

def metadata(state):
    item=(state.get('playback') or {}).get('item') or {}
    trackid=current_track_id(state)
    if trackid==NO_TRACK:return {}
    fields={
      'mpris:trackid':GLib.Variant('o',trackid),
      'xesam:title':GLib.Variant('s',title_of(item)),
      'xesam:artist':GLib.Variant('as',artists_of(item))
    }
    length=(item.get('duration_ms') or (item.get('decorations') or {}).get('playback',{}).get('duration_ms') or 0)
    try:
        if int(length)>0:fields['mpris:length']=GLib.Variant('x',int(length)*1000)
    except (TypeError,ValueError):pass
    covers=((item.get('decorations') or {}).get('visual_identity') or {}).get('cover') or []
    images=(item.get('album') or {}).get('images') or []
    urls=[entry.get('url') for entry in [*covers,*images] if isinstance(entry,dict)]
    for candidate in urls:
        if not isinstance(candidate,str):continue
        url=urlparse(candidate)
        if url.scheme=='https' and url.hostname in ('i.scdn.co','mosaic.scdn.co','image-cdn-ak.spotifycdn.com'):
            fields['mpris:artUrl']=GLib.Variant('s',candidate)
            break
    album=(item.get('album') or {}).get('name')
    if album:fields['xesam:album']=GLib.Variant('s',str(album))
    return fields

class AuraMpris:
    def __init__(self):
        self.connection=None
        self.state={}
        self.worker=ThreadPoolExecutor(max_workers=1,thread_name_prefix='aura-mpris')
        self.csrf=''
        self.last_status=None
        self.last_track=None
        self.last_volume=None
        self.last_shuffle=None
        self.node=Gio.DBusNodeInfo.new_for_xml(INTRO)

    def command(self,name,**options):
        def perform():
            try:
                if not self.csrf:self.csrf=request_json('/api/bootstrap')['csrf']
                request_json('/api/soloist/command','POST',{'command':name,**options},self.csrf)
            except urllib.error.HTTPError as e:
                if e.code==403:
                    try:
                        self.csrf=request_json('/api/bootstrap')['csrf']
                        request_json('/api/soloist/command','POST',{'command':name,**options},self.csrf)
                    except Exception:pass
            except Exception:pass
        self.worker.submit(perform)

    def get_property(self,_connection,_sender,_path,interface,name):
        state=self.state
        if interface==ROOT:
            vals={
              'CanQuit':GLib.Variant('b',False),
              'CanRaise':GLib.Variant('b',False),
              'HasTrackList':GLib.Variant('b',False),
              'Identity':GLib.Variant('s','AURA'),
              'DesktopEntry':GLib.Variant('s','aura'),
              'SupportedUriSchemes':GLib.Variant('as',[]),
              'SupportedMimeTypes':GLib.Variant('as',[])
            }
            return vals.get(name)
        playback=state.get('playback') or {}
        control=bool(state.get('connected') and (state.get('auth') or {}).get('logged_in'))
        status=playback_status(state)
        repeat=(playback.get('options') or {}).get('repeat')
        vals={
          'PlaybackStatus':GLib.Variant('s',status),
          'LoopStatus':GLib.Variant('s','Track' if repeat=='track' else 'Playlist' if repeat=='context' else 'None'),
          'Rate':GLib.Variant('d',1.0),
          'Shuffle':GLib.Variant('b',bool((playback.get('options') or {}).get('shuffle'))),
          'Metadata':GLib.Variant('a{sv}',metadata(state)),
          'Volume':GLib.Variant('d',float(playback.get('volume',0) or 0)/100),
          'Position':GLib.Variant('x',position_us(state)),
          'MinimumRate':GLib.Variant('d',1.0),
          'MaximumRate':GLib.Variant('d',1.0),
          'CanGoNext':GLib.Variant('b',control),
          'CanGoPrevious':GLib.Variant('b',control),
          'CanPlay':GLib.Variant('b',control),
          'CanPause':GLib.Variant('b',control),
          'CanSeek':GLib.Variant('b',control and current_track_id(state)!=NO_TRACK),
          'CanControl':GLib.Variant('b',control)
        }
        return vals.get(name)

    def set_property(self,_connection,_sender,_path,interface,name,value):
        if interface!=PLAYER:return False
        if name=='Volume':
            self.command('set_volume',volume=max(0,min(100,int(float(value.unpack())*100))))
            return True
        if name=='Shuffle':
            self.command('set_shuffle',enabled=bool(value.unpack()))
            return True
        return False

    def method(self,_connection,_sender,_path,interface,name,parameters,invocation):
        if interface==ROOT:
            invocation.return_value(None)
            return
        p=self.state.get('playback',{})
        commands={
          'Next':'skip_next','Previous':'skip_prev','Pause':'pause','Play':'play',
          'Stop':'pause'
        }
        if name in commands:self.command(commands[name])
        elif name=='PlayPause':
            self.command('pause' if playback_status(self.state)=='Playing' else 'play')
        elif name=='Seek':
            offset=parameters.unpack()[0]
            ms=max(0,position_us(self.state)//1000+int(offset//1000))
            self.command('seek',position_ms=ms)
        elif name=='SetPosition':
            trackid,pos=parameters.unpack()
            if trackid==current_track_id(self.state) and pos>=0:
                self.command('seek',position_ms=pos//1000)
        invocation.return_value(None)

    def acquired(self,connection,_name):
        self.connection=connection
        for iface in self.node.interfaces:
            connection.register_object(OBJECT,iface,self.method,self.get_property,self.set_property)

    def poll(self):
        self.state=music_state()
        if not self.connection:return True
        status=playback_status(self.state)
        track=current_track_id(self.state)
        volume=self.get_property(None,None,None,PLAYER,'Volume').unpack()
        shuffle=self.get_property(None,None,None,PLAYER,'Shuffle').unpack()
        changed={}
        if status!=self.last_status:changed['PlaybackStatus']=GLib.Variant('s',status)
        if track!=self.last_track:changed['Metadata']=GLib.Variant('a{sv}',metadata(self.state))
        if volume!=self.last_volume:changed['Volume']=GLib.Variant('d',volume)
        if shuffle!=self.last_shuffle:changed['Shuffle']=GLib.Variant('b',shuffle)
        if changed:
            self.connection.emit_signal(None,OBJECT,'org.freedesktop.DBus.Properties',
                'PropertiesChanged',GLib.Variant('(sa{sv}as)',(PLAYER,changed,[])))
        self.last_status,self.last_track,self.last_volume,self.last_shuffle=status,track,volume,shuffle
        return True

def main():
    adapter=AuraMpris()
    loop=GLib.MainLoop()
    def lost(_connection,_name):
        print('AURA MPRIS name unavailable; another adapter may be running.',flush=True)
        loop.quit()
    Gio.bus_own_name(Gio.BusType.SESSION,NAME,Gio.BusNameOwnerFlags.NONE,
        adapter.acquired,None,lost)
    GLib.timeout_add_seconds(1,adapter.poll)
    adapter.poll()
    print('AURA MPRIS adapter starting on user D-Bus.',flush=True)
    loop.run()

def selftest():
    sample={'connected':True,'auth':{'logged_in':True},'playback':{
        'status':'playing','volume':32,
        'item':{'uri':'spotify:track:4fsQ0K37TOXa3hEQfjEic1','name':'ANTIFRAGILE',
          'artists':[{'name':'LE SSERAFIM'}],'duration_ms':185000},
        'position':{'position_ms':30000,'speed':0},
        'options':{'shuffle':False,'repeat':'off'}}}
    assert playback_status(sample)=='Playing'
    assert current_track_id(sample).endswith('4fsQ0K37TOXa3hEQfjEic1')
    assert metadata(sample)['xesam:title'].unpack()=='ANTIFRAGILE'
    assert metadata(sample)['xesam:artist'].unpack()==['LE SSERAFIM']
    assert metadata(sample)['mpris:length'].unpack()==185000000
    assert position_us(sample)==30000000
    sample['playback']['status']='paused'
    assert playback_status(sample)=='Paused'
    no_state={'connected':False,'auth':None,'playback':None}
    assert playback_status(no_state)=='Stopped'
    assert current_track_id(no_state)==NO_TRACK
    assert position_us(no_state)==0
    assert metadata(no_state)=={}
    adapter=AuraMpris()
    adapter.state=no_state
    assert adapter.get_property(None,None,None,PLAYER,'PlaybackStatus').unpack()=='Stopped'
    print('AURA MPRIS offline metadata/position/status tests passed.')

if __name__=='__main__':
    import sys
    if '--selftest' in sys.argv:selftest()
    else:main()
