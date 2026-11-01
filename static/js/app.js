$('#sendButton').onclick=()=>sendCommand($('#commandInput').value);
$('#commandInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendCommand(e.target.value)});
document.querySelectorAll('[data-command]').forEach(button=>button.onclick=()=>sendCommand(button.dataset.command));
$('#playButton').onclick=()=>audio.paused?play():pause();
$('#nextButton').onclick=next;
$('#previousButton').onclick=()=>applyIntent('previous');
$('#favoriteButton').onclick=()=>toggleFavorite();
$('#volumeBar').oninput=e=>audio.volume=Number(e.target.value);
$('#shuffleButton').onclick=()=>toggleMode('shuffle');
$('#repeatButton').onclick=()=>toggleMode('repeat');
$('#trackSearch').addEventListener('input',render);
document.querySelectorAll('[data-library-filter]').forEach(button=>
  button.addEventListener('click',()=>setLibraryFilter(button.dataset.libraryFilter))
);
$('#playlistSelect').addEventListener('change',e=>{activePlaylist=e.target.value;renderPlaylistOptions();render()});
$('#createPlaylistButton').onclick=createPlaylist;
$('#addTrackButton').onclick=addCurrentTrack;
$('#deletePlaylistButton').onclick=deletePlaylist;
$('#cameraMoodButton').onclick=estimateCameraMood;
$('#randomTrackButton').onclick=surpriseMe;
document.addEventListener('keydown',handleKeyboardShortcuts);
$('#themeToggle').addEventListener('click',toggleTheme);
$('#assistantLauncher').addEventListener('click',openAssistant);
$('#assistantClose').addEventListener('click',closeAssistant);
$('#assistantForm').addEventListener('submit',event=>{
  event.preventDefault();
  askMusicGuide($('#assistantInput').value);
});
document.querySelectorAll('[data-assistant-prompt]').forEach(button=>
  button.addEventListener('click',()=>askMusicGuide(button.dataset.assistantPrompt))
);
const assistantSpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(assistantSpeechRecognition){
  const assistantRecognition=new assistantSpeechRecognition();
  assistantRecognition.lang='en-US';
  assistantRecognition.interimResults=false;
  assistantRecognition.maxAlternatives=5;
  assistantRecognition.onresult=event=>{
    const results=event.results[0];
    askMusicGuide(results[0].transcript,Array.from(results).slice(1).map(result=>result.transcript));
  };
  assistantRecognition.onerror=event=>{
    const message=event.error==='language-not-supported'
      ?'English speech recognition is not supported by this browser. You can type your message instead.'
      :'I could not hear that. Check microphone permission or type your message instead.';
    addAssistantMessage(message);
  };
  $('#assistantMic').addEventListener('click',()=>{
    assistantRecognition.lang='en-US';
    try{assistantRecognition.start()}catch(error){addAssistantMessage('Voice input could not start. You can type your message instead.');}
  });
}else{
  $('#assistantMic').addEventListener('click',()=>addAssistantMessage('Voice input is not supported in this browser. You can type your message instead.'));
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#assistantPanel').hidden)closeAssistant();
});
audio.volume=.7;
audio.ontimeupdate=()=>{
  if(audio.duration){
    $('#seekBar').value=audio.currentTime/audio.duration*100;
    $('#currentTime').textContent=fmt(audio.currentTime);
    $('#duration').textContent=fmt(audio.duration);
  }
};
$('#seekBar').oninput=e=>{if(audio.duration)audio.currentTime=Number(e.target.value)/100*audio.duration};
audio.onended=next;
audio.onpause=()=>{$('#playButton').textContent='▶';document.body.classList.remove('playing')};
audio.onplay=()=>{$('#playButton').textContent='Ⅱ';document.body.classList.add('playing')};
function fmt(seconds){return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`}

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
  const recognition=new SpeechRecognition();
  recognition.lang='en-US';
  recognition.interimResults=false;
  recognition.maxAlternatives=5;
  recognition.onstart=()=>{
    listening=true;
    document.body.classList.add('listening');
    $('#voiceTitle').textContent='Listening in English...';
    $('#voiceHint').textContent='Say a player command or mood';
  };
  recognition.onend=()=>{listening=false;document.body.classList.remove('listening')};
  recognition.onerror=event=>{
    $('#voiceTitle').textContent=event.error==='language-not-supported'?'English speech recognition is not supported':'Microphone unavailable';
    $('#voiceHint').textContent=event.error==='language-not-supported'
      ?'Try Chrome or Edge, or type your command.'
      :'Allow microphone access, or type a command.';
  };
  recognition.onresult=e=>{
    const results=e.results[0];
    sendCommand(results[0].transcript,Array.from(results).slice(1).map(result=>result.transcript),true);
  };
  $('#micButton').onclick=()=>{
    if(listening)recognition.stop();
    else{
      recognition.lang='en-US';
      try{recognition.start()}catch(error){toast('Voice recognition could not start. Try typing your command.');}
    }
  };
}else{
  $('#micButton').onclick=()=>toast('English voice recognition is not supported in this browser. Try Chrome or Edge, or type your command.');
  $('#voiceHint').textContent='English voice input needs a supported browser; typing is available';
}

function renderModeButtons(){
  $('#shuffleButton').classList.toggle('active',shuffleEnabled);
  $('#repeatButton').classList.toggle('active',repeatEnabled);
}

function setLibraryFilter(filter){
  libraryFilter=filter;
  document.querySelectorAll('[data-library-filter]').forEach(button=>{
    const active=button.dataset.libraryFilter===filter;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  render();
}

function surpriseMe(){
  const available=playlistTracks();
  if(!available.length){toast('There are no tracks in this playlist yet.');return}
  const choices=available.filter(trackIndex=>libraryFilter!=='favorites'||favorites.has(tracks[trackIndex].id));
  if(!choices.length){toast('There are no favorite tracks to play.');return}
  const choice=choices[Math.floor(Math.random()*choices.length)];
  loadTrack(choice,true);
  toast(`Surprise pick: ${tracks[choice].title}`);
}

function handleKeyboardShortcuts(event){
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const target=event.target;
  if(target instanceof HTMLElement&&(
    target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)
  ))return;
  if(event.code==='Space'){
    event.preventDefault();
    audio.paused?play():pause();
  }else if(event.key==='ArrowRight'){
    event.preventDefault();
    next();
  }else if(event.key==='ArrowLeft'){
    event.preventDefault();
    applyIntent('previous');
  }else if(event.key.toLowerCase()==='f'){
    event.preventDefault();
    toggleFavorite();
  }else if(event.key==='/'){
    event.preventDefault();
    $('#trackSearch').focus();
  }
}

function addAssistantMessage(text,sender='assistant'){
  const messages=$('#assistantMessages'), bubble=document.createElement('div');
  bubble.className=`assistant-message ${sender}`;
  bubble.textContent=text;
  messages.appendChild(bubble);
  messages.scrollTop=messages.scrollHeight;
  if(sender==='assistant'&&$('#assistantSpeak').checked&&'speechSynthesis' in window){
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang='en-US';
    window.speechSynthesis.speak(utterance);
  }
}

function addTrackRecommendations(recommendations){
  const messages=$('#assistantMessages'), list=document.createElement('div');
  list.className='assistant-recommendations';
  recommendations.forEach(track=>{
    const row=document.createElement('div'), info=document.createElement('span'), button=document.createElement('button');
    row.className='assistant-recommendation';
    info.textContent=`${track.title} · ${track.mood}`;
    button.type='button';
    button.textContent='Play';
    button.setAttribute('aria-label',`Play ${track.title}`);
    button.addEventListener('click',()=>{
      const trackIndex=tracks.indexOf(track);
      if(trackIndex>=0){
        loadTrack(trackIndex,true);
        addAssistantMessage(`Playing ${track.title}. Enjoy!`);
      }
    });
    row.append(info,button);
    list.appendChild(row);
  });
  messages.appendChild(list);
  messages.scrollTop=messages.scrollHeight;
}

function openAssistant(){
  $('#assistantPanel').hidden=false;
  $('#assistantLauncher').setAttribute('aria-expanded','true');
  $('#assistantInput').focus();
  if(!$('#assistantMessages').childElementCount){
    addAssistantMessage(assistantText('welcome'));
  }
}

function closeAssistant(){
  $('#assistantPanel').hidden=true;
  $('#assistantLauncher').setAttribute('aria-expanded','false');
  $('#assistantLauncher').focus();
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
}

async function askMusicGuide(message,alternatives=[]){
  const text=message.trim();
  if(!text)return;
  addAssistantMessage(text,'user');
  $('#assistantInput').value='';
  $('#assistantMic').disabled=true;
  try{
    const response=await fetch('/api/command',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,alternatives})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'I could not understand that message.');
    if(/surprise|anything|whatever|recommend|suggest|what should/i.test(text)){
      if(!tracks.length){
        addAssistantMessage(assistantText('unknown'));
      }else{
        const choices=tracks.slice().sort(()=>Math.random()-.5).slice(0,3);
        addAssistantMessage(assistantText('surprise'));
        addTrackRecommendations(choices);
      }
      return;
    }
    const moodByIntent={mood_calm:'Calm',mood_happy:'Happy',mood_energy:'Energy',mood_focus:'Focus'};
    const mood=moodByIntent[result.intent];
    if(mood){
      const matches=tracks.filter(track=>track.mood.toLowerCase()===mood.toLowerCase());
      if(!matches.length){
        addAssistantMessage(`I don't see any ${mood.toLowerCase()} songs in your library yet. Try another mood or add music to the ${mood} folder.`);
      }else{
        const recommendations=[...matches].sort(()=>Math.random()-.5).slice(0,3);
        addAssistantMessage(assistantText('recommend',mood));
        addTrackRecommendations(recommendations);
      }
      return;
    }
    if(result.intent==='play_track'){
      const track=tracks.find(item=>text.toLowerCase().includes(item.title.toLowerCase()));
      if(track){
        addAssistantMessage(`You mentioned ${track.title}. Want to give it a listen?`);
        addTrackRecommendations([track]);
      }else{
        addAssistantMessage('I couldn’t match that to a song. Try a shorter part of the track title, or tell me a mood like calm, happy, energy, or focus.');
      }
      return;
    }
    if(['volume_down','volume_up','volume_mute','volume_unmute'].includes(result.intent)){
      applyIntent(result.intent);
      addAssistantMessage(assistantText(result.intent));
      return;
    }
    if(['play','pause','stop','next','previous','shuffle','repeat','volume_mute','volume_unmute'].includes(result.intent)){
      applyIntent(result.intent);
      const responseText=assistantText(result.intent);
      addAssistantMessage(responseText);
      return;
    }
    addAssistantMessage(assistantText('unknown'));
  }catch(error){
    addAssistantMessage(`${error.message} Check that VibeTune is running and try again.`);
  }finally{
    $('#assistantMic').disabled=false;
  }
}

readPlaylists();
readFavorites();
initializeTheme();
renderPlaylistOptions();
renderModeButtons();
render();
loadTrack(0,false);
