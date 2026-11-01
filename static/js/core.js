const tracks=window.VOXTUNE_USER_TRACKS||[];
tracks.forEach(track=>{track.id=track.url});
const $=s=>document.querySelector(s);
const audio=$('#audio'), cards=$('#playlist'), storageKey='voxtune.customPlaylists', favoriteStorageKey='voxtune.favorites';
let index=0, listening=false, toastTimer, shuffleEnabled=false, repeatEnabled=false, customPlaylists=Object.create(null), favorites=new Set(), activePlaylist='all', libraryFilter='all';
function toast(msg){
  const el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3000);
}

function applyTheme(theme){
  const selected=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=selected;
  const isDark=selected==='dark';
  const button=$('#themeToggle');
  button.setAttribute('aria-pressed',String(isDark));
  button.setAttribute('aria-label',`Switch to ${isDark?'light':'dark'} mode`);
  $('#themeIcon').textContent=isDark?'☀':'☾';
  $('#themeLabel').textContent=isDark?'Light mode':'Dark mode';
  document.querySelector('meta[name="theme-color"]').content=isDark?'#111a19':'#f5f7f4';
}

function initializeTheme(){
  let savedTheme;
  try{
    savedTheme=localStorage.getItem('voxtune.theme');
  }catch(error){
    toast('Theme preference could not be loaded from browser storage.');
  }
  const preferred=savedTheme==='dark'||savedTheme==='light'
    ?savedTheme
    :'dark';
  applyTheme(preferred);
}

function assistantText(key,...args){
  const messages={
    welcome:'Hi! What are you in the mood for? Tell me how you feel or what you are doing, and I will find a song from your library.',
    surprise:'Here are a few picks from your library. Want to try one?',
    recommend:mood=>`For a ${mood.toLowerCase()} mood, these songs from your library may fit:`,
    stop:'Stopped the song and returned it to the beginning.',
    pause:'Paused the music.',
    play:'Resumed playback.',
    next:'Skipped to the next song.',
    previous:'Went back to the previous song.',
    volume_down:'I lowered the music volume.',
    volume_up:'I raised the music volume.',
    volume_mute:'I muted the music.',
    volume_unmute:'I turned the volume back on.',
    unknown:'I did not understand that. Try saying stop, pause, next song, lower the volume, or ask for a mood.'
  };
  const message=messages[key]||messages.unknown;
  return typeof message==='function'?message(...args):message;
}

function commandConfirmation(intent,transcript){
  if(intent.startsWith('mood_')){
    const mood={calm:'calm',happy:'happy',focus:'focus',energy:'energetic'}[intent.slice(5)];
    return mood?`Okay, I’ll play ${mood} songs.`:'I could not find that music mood.';
  }
  if(intent==='play_track'){
    const track=tracks.find(item=>transcript.toLowerCase().includes(item.title.toLowerCase()));
    return track?`Okay, I’ll play ${track.title}.`:'I could not find that track in your library.';
  }
  return {
    play:'Okay, resuming the music.',
    pause:'Okay, pausing the music.',
    stop:'Okay, stopping the song.',
    next:'Okay, playing the next song.',
    previous:'Okay, playing the previous song.',
    volume_up:'Okay, turning the volume up.',
    volume_down:'Okay, turning the volume down.',
    volume_mute:'Okay, muting the music.',
    volume_unmute:'Okay, unmuting the music.',
    shuffle:'Okay, changing shuffle mode.',
    repeat:'Okay, changing repeat mode.',
    unknown:'Sorry, I did not understand that command. Please try again.'
  }[intent]||'Sorry, I did not understand that command. Please try again.';
}

function speakCommandConfirmation(message,onComplete){
  if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){
    onComplete();
    return;
  }
  const utterance=new SpeechSynthesisUtterance(message);
  let completed=false;
  const finish=()=>{
    if(completed)return;
    completed=true;
    onComplete();
  };
  utterance.lang='en-US';
  utterance.onend=finish;
  utterance.onerror=finish;
  try{
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }catch(error){
    finish();
  }
}

function toggleTheme(){
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyTheme(theme);
  try{
    localStorage.setItem('voxtune.theme',theme);
  }catch(error){
    toast('Theme changed, but could not be saved in browser storage.');
  }
}

