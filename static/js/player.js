function loadTrack(i,autoplay=false){
  if(!tracks.length){
    index=-1;
    audio.removeAttribute('src');
    $('#trackTitle').textContent='Add your music to get started';
    $('#trackArtist').textContent='Place audio files in static/music/<Mood>';
    $('#coverArt').style.background='linear-gradient(135deg,#34313f,#201e29)';
    $('#favoriteButton').disabled=true;
    updateFavoriteButton();
    render();
    return;
  }
  index=(i+tracks.length)%tracks.length;
  if(activePlaylist!=='all'&&!playlistTracks().includes(index)){
    activePlaylist='all';
    renderPlaylistOptions();
  }
  const t=tracks[index];
  audio.src=t.url;
  $('#trackTitle').textContent=t.title;
  $('#trackArtist').textContent=t.artist;
  $('#coverArt').style.background=t.color;
  $('#favoriteButton').disabled=false;
  updateFavoriteButton();
  render();
  if(autoplay)play();
}

async function play(){
  if(!tracks.length){toast('Add music to a folder in static/music before playing.');return}
  if(!audio.src)loadTrack(index,false);
  try{
    await audio.play();
  }catch(error){
    toast('Could not play this track. Check the file format and try again.');
  }
}

function pause(){audio.pause()}

function stop(){
  audio.pause();
  audio.currentTime=0;
  $('#seekBar').value=0;
  $('#currentTime').textContent='0:00';
}

function next(){
  const available=playlistTracks();
  if(!available.length){toast('There are no tracks in this playlist.');return}
  if(repeatEnabled){audio.currentTime=0;play();return}
  if(shuffleEnabled&&available.length>1){
    const choices=available.filter(i=>i!==index);
    loadTrack(choices[Math.floor(Math.random()*choices.length)],true);
    return;
  }
  const position=available.indexOf(index);
  loadTrack(available[(position+1+available.length)%available.length]??0,true);
}

function toggleMode(mode){
  if(mode==='shuffle'){
    shuffleEnabled=!shuffleEnabled;
    $('#shuffleButton').classList.toggle('active',shuffleEnabled);
    toast(`Shuffle ${shuffleEnabled?'on':'off'}`);
  }else{
    repeatEnabled=!repeatEnabled;
    $('#repeatButton').classList.toggle('active',repeatEnabled);
    toast(`Repeat ${repeatEnabled?'on':'off'}`);
  }
}

function playMood(mood){
  const selected=tracks.findIndex(t=>t.mood.toLowerCase()===mood.toLowerCase());
  if(selected<0){toast(`No ${mood.toLowerCase()} tracks found. Add music to static/music/${mood}.`);return}
  $('#moodLabel').textContent=mood;
  loadTrack(selected,true);
  toast(`Finding a ${mood.toLowerCase()} match`);
}

function applyIntent(intent,transcript=''){
  switch(intent){
    case'play':play();break;
    case'pause':pause();break;
    case'stop':stop();break;
    case'next':next();break;
    case'previous':{
      const available=playlistTracks(), position=available.indexOf(index);
      if(!available.length){toast('This playlist has no tracks yet.');break}
      loadTrack(available[(position-1+available.length)%available.length]??0,true);
      break;
    }
    case'volume_up':
      audio.volume=Math.min(1,audio.volume+.15);
      $('#volumeBar').value=audio.volume;
      toast('Volume up');
      break;
    case'volume_down':
      audio.volume=Math.max(0,audio.volume-.15);
      $('#volumeBar').value=audio.volume;
      toast('Volume down');
      break;
    case'volume_mute':
      audio.dataset.previousVolume=String(audio.volume||Number($('#volumeBar').value)||.7);
      audio.volume=0;
      $('#volumeBar').value=0;
      toast('Muted');
      break;
    case'volume_unmute':
      audio.volume=Number(audio.dataset.previousVolume)||.7;
      $('#volumeBar').value=audio.volume;
      toast('Unmuted');
      break;
    case'shuffle':toggleMode('shuffle');break;
    case'repeat':toggleMode('repeat');break;
    case'play_track':{
      const text=transcript.toLowerCase();
      const match=tracks.findIndex(t=>text.includes(t.title.toLowerCase()));
      if(match>=0)loadTrack(match,true);
      else toast('I could not match that request to a track. Try saying its full title.');
      break;
    }
    default:
      if(intent.startsWith('mood_')){
        const mood={calm:'Calm',happy:'Happy',focus:'Focus',energy:'Energy'}[intent.slice(5)];
        if(mood)playMood(mood);
      }else toast('I did not recognize that command. Try play, shuffle, repeat, or a mood.');
  }
}

async function sendCommand(text,alternatives=[],fromVoice=false){
  if(!text.trim())return;
  $('#voiceTitle').textContent='Understanding your request…';
  try{
    const res=await fetch('/api/command',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,alternatives})
    });
    const data=await res.json();
    if(!res.ok)throw Error(data.error||'Command failed');
    const confirmation=commandConfirmation(data.intent,data.transcript);
    $('#voiceTitle').textContent=confirmation;
    $('#voiceHint').textContent=`Heard: “${data.transcript}” · ${Math.round(data.confidence*100)}% match`;
    if(fromVoice)speakCommandConfirmation(confirmation,()=>applyIntent(data.intent,data.transcript));
    else applyIntent(data.intent,data.transcript);
  }catch(error){
    $('#voiceTitle').textContent='Could not process command';
    $('#voiceHint').textContent=error.message;
    toast('Check that the VibeTune server is running.');
  }
  $('#commandInput').value='';
}

function createPlaylist(){
  if(!tracks.length){toast('Add music before creating a playlist.');return}
  const name=prompt('Name your playlist:');
  if(name===null)return;
  const clean=name.trim();
  if(!clean){toast('Enter a playlist name.');return}
  if(clean.toLowerCase()==='all tracks'||Object.keys(customPlaylists).some(n=>n.toLowerCase()===clean.toLowerCase())){
    toast('That playlist name is already in use.');
    return;
  }
  customPlaylists[clean]=[index];
  if(!savePlaylists()){delete customPlaylists[clean];return}
  activePlaylist=clean;
  renderPlaylistOptions();
  render();
  toast(`Created “${clean}” with the current track.`);
}

function addCurrentTrack(){
  const list=customPlaylists[activePlaylist];
  if(!list||index<0)return;
  if(list.includes(index)){toast('This track is already in the playlist.');return}
  list.push(index);
  if(!savePlaylists()){list.pop();return}
  render();
  toast(`Added ${tracks[index].title} to “${activePlaylist}”.`);
}

function deletePlaylist(){
  if(activePlaylist==='all'||!confirm(`Delete the playlist “${activePlaylist}”?`))return;
  const deletedName=activePlaylist, deletedTracks=customPlaylists[activePlaylist];
  delete customPlaylists[activePlaylist];
  activePlaylist='all';
  if(!savePlaylists()){
    customPlaylists[deletedName]=deletedTracks;
    activePlaylist=deletedName;
    renderPlaylistOptions();
    return;
  }
  renderPlaylistOptions();
  render();
  toast('Playlist deleted.');
}
