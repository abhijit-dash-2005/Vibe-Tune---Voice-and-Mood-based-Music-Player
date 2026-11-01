function readPlaylists(){
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
    if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
      const restored=Object.create(null);
      Object.entries(saved).forEach(([name,ids])=>{
        if(typeof name!=='string'||!Array.isArray(ids))return;
        const trackIndexes=ids.map(id=>typeof id==='string'?tracks.findIndex(track=>track.id===id):-1);
        if(trackIndexes.length&&trackIndexes.every(id=>id>=0))restored[name]=trackIndexes;
      });
      customPlaylists=restored;
    }
  }catch(error){
    toast('Could not read saved playlists from this browser.');
  }
}

function readFavorites(){
  try{
    const saved=JSON.parse(localStorage.getItem(favoriteStorageKey)||'[]');
    if(Array.isArray(saved))favorites=new Set(saved.filter(id=>typeof id==='string'));
  }catch(error){
    toast('Could not read saved favorites from this browser.');
  }
}

function saveFavorites(){
  try{
    localStorage.setItem(favoriteStorageKey,JSON.stringify([...favorites]));
    return true;
  }catch(error){
    toast('Could not save favorites. Check your browser storage settings.');
    return false;
  }
}

function updateFavoriteButton(){
  const button=$('#favoriteButton'), track=tracks[index];
  const isFavorite=Boolean(track&&favorites.has(track.id));
  button.classList.toggle('active',isFavorite);
  button.textContent=isFavorite?'♥':'♡';
  button.setAttribute('aria-label',isFavorite?'Remove current track from favorites':'Add current track to favorites');
  button.title=isFavorite?'Remove from favorites':'Add to favorites';
}

function toggleFavorite(trackIndex=index){
  const track=tracks[trackIndex];
  if(!track)return;
  const wasFavorite=favorites.has(track.id);
  if(wasFavorite)favorites.delete(track.id);
  else favorites.add(track.id);
  if(!saveFavorites()){
    if(wasFavorite)favorites.add(track.id);
    else favorites.delete(track.id);
    return;
  }
  updateFavoriteButton();
  render();
  toast(wasFavorite?'Removed from favorites.':'Added to favorites.');
}

function savePlaylists(){
  try{
    const saved=Object.fromEntries(Object.entries(customPlaylists).map(([name,ids])=>
      [name,ids.map(id=>tracks[id].id)]
    ));
    localStorage.setItem(storageKey,JSON.stringify(saved));
    return true;
  }catch(error){
    toast('Could not save playlists. Check your browser storage settings.');
    return false;
  }
}

function playlistTracks(){
  return activePlaylist==='all'?tracks.map((_,i)=>i):(customPlaylists[activePlaylist]||[]);
}

function renderPlaylistOptions(){
  const select=$('#playlistSelect');
  select.replaceChildren(new Option('All tracks','all'));
  Object.keys(customPlaylists).forEach(name=>select.add(new Option(name,name)));
  if(activePlaylist!=='all'&&!customPlaylists[activePlaylist])activePlaylist='all';
  select.value=activePlaylist;
  $('#addTrackButton').disabled=activePlaylist==='all';
  $('#deletePlaylistButton').hidden=activePlaylist==='all';
}

function render(){
  cards.replaceChildren();
  if(!tracks.length){
    const empty=document.createElement('p');
    empty.className='empty-library';
    empty.textContent='Your library is empty. Add songs to static/music/Calm, Happy, Focus, or Energy, then refresh this page.';
    cards.appendChild(empty);
    $('#playlistCount').textContent='0 TRACKS';
    return;
  }
  const query=$('#trackSearch').value.trim().toLowerCase();
  const visible=playlistTracks().filter(i=>{
    const track=tracks[i];
    return track&&(libraryFilter!=='favorites'||favorites.has(track.id))&&
      (track.title+' '+track.artist+' '+track.mood).toLowerCase().includes(query);
  });
  if(!visible.length){
    const empty=document.createElement('p');
    empty.className='empty-library';
    empty.textContent=libraryFilter==='favorites'?'No favorites yet. Tap the heart on a track to save it here.':'No tracks match your search in this playlist.';
    cards.appendChild(empty);
  }
  visible.forEach(i=>{
    const t=tracks[i], card=document.createElement('button');
    card.type='button';
    card.className='track-card'+(i===index?' active':'');
    card.setAttribute('aria-label',`Play ${t.title}, ${t.mood}`);
    const art=document.createElement('span');
    art.className='track-art';
    art.style.background=t.color;
    art.textContent='♫';
    const mood=document.createElement('span');
    mood.className='mood';
    mood.textContent=t.mood;
    const title=document.createElement('strong');
    title.textContent=t.title;
    const artist=document.createElement('small');
    artist.textContent=t.artist;
    const heart=document.createElement('span');
    heart.className='card-favorite';
    heart.setAttribute('aria-hidden','true');
    heart.textContent=favorites.has(t.id)?'♥':'♡';
    card.append(art,mood,title,artist,heart);
    card.addEventListener('click',()=>loadTrack(i,true));
    card.addEventListener('contextmenu',event=>{
      event.preventDefault();
      toggleFavorite(i);
    });
    cards.appendChild(card);
  });
  $('#playlistCount').textContent=`${visible.length} TRACK${visible.length===1?'':'S'}`;
}

