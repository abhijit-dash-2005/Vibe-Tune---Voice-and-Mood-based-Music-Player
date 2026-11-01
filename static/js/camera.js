function showCameraRecommendations(expression,mood,recommendedTracks){
  const panel=$('#cameraRecommendations');
  const title=$('#cameraRecommendationTitle');
  const list=$('#cameraRecommendationTracks');
  title.textContent=`Expression estimate: ${expression}. Music suggestion: ${mood}.`;
  list.replaceChildren();

  recommendedTracks.forEach((track,position)=>{
    const row=document.createElement('div');
    const label=document.createElement('span');
    const playButton=document.createElement('button');
    const trackIndex=tracks.indexOf(track);

    row.className='camera-recommendation';
    label.textContent=`${track.title} · ${track.mood}`;
    playButton.type='button';
    playButton.textContent=position===0?'Play suggestion':'Play';
    playButton.setAttribute('aria-label',`Play recommended track ${track.title}`);
    playButton.addEventListener('click',()=>{
      if(trackIndex<0)return;
      loadTrack(trackIndex,true);
      $('#cameraStatus').textContent=`Playing ${track.title}.`;
    });
    row.append(label,playButton);
    list.appendChild(row);
  });

  panel.hidden=false;
}

async function estimateCameraMood(){
  const button=$('#cameraMoodButton'), video=$('#moodCamera');
  const status=$('#cameraStatus');
  if(!window.isSecureContext){
    status.textContent='Camera access requires HTTPS or localhost. Open VibeTune at http://127.0.0.1:5000.';
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia){
    status.textContent='This browser does not support camera access. Try the latest Chrome or Edge.';
    return;
  }
  button.disabled=true;
  status.textContent='Requesting camera permission…';
  button.textContent='Starting camera…';
  let stream, permissionTimedOut=false, permissionTimer;
  try{
    if(!window.faceapi)throw new Error('The expression model library did not load. Check your internet connection, then reload the page.');
    const permissionRequest=navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(cameraStream=>{
      if(permissionTimedOut){
        cameraStream.getTracks().forEach(track=>track.stop());
        return null;
      }
      return cameraStream;
    });
    const permissionTimeout=new Promise((resolve,reject)=>{
      permissionTimer=setTimeout(()=>{
        permissionTimedOut=true;
        reject(new Error('Camera permission is still pending. Allow camera access in the browser prompt or site settings, then try again.'));
      },15000);
    });
    stream=await Promise.race([permissionRequest,permissionTimeout]);
    if(!stream)throw new Error('The camera permission request expired. Please try again.');
    const metadataReady=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Camera startup timed out. Check that the camera is connected and not being used by another app.')),10000);
      video.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve()}, {once:true});
      video.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('The camera preview could not start.'))}, {once:true});
    });
    video.srcObject=stream;
    video.hidden=false;
    if(video.readyState<1)await metadataReady;
    await video.play();
    if(!video.videoWidth||!video.videoHeight)throw new Error('The camera did not provide a video image. Check camera permissions and try again.');
    status.textContent='Camera ready. Loading the expression model…';
    button.textContent='Loading expression model…';
    const modelUrl='https://justadudewhohacks.github.io/face-api.js/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl)
    ]);
    button.textContent='Estimating expression…';
    status.textContent='Look toward the camera in good lighting. Estimating expression…';
    const samples=[];
    for(let attempt=0;attempt<24&&samples.length<5;attempt++){
      const result=await faceapi.detectSingleFace(video,new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
      if(result)samples.push(result.expressions);
      if(samples.length<5)await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!samples.length)throw new Error('No face was detected after 6 seconds. Center your face in the preview, improve the lighting, and try again.');
    const average={};
    samples.forEach(sample=>Object.entries(sample).forEach(([key,value])=>average[key]=(average[key]||0)+value/samples.length));
    const expression=Object.entries(average).sort((a,b)=>b[1]-a[1])[0][0];
    const mood={happy:'Happy',surprised:'Energy',sad:'Calm',fearful:'Calm',neutral:'Focus',angry:'Energy',disgusted:'Focus'}[expression]||'Focus';
    $('#voiceTitle').textContent=`Expression estimate: ${expression}`;
    $('#voiceHint').textContent=`Suggested ${mood.toLowerCase()} tracks based on an imperfect expression estimate.`;
    const moodTracks=tracks.filter(track=>track.mood===mood);
    if(!moodTracks.length){
      $('#cameraRecommendations').hidden=true;
      status.textContent=`Estimated ${expression}, but there are no ${mood.toLowerCase()} tracks in your library. Add tracks to static/music/${mood}.`;
      return;
    }

    const recommendations=moodTracks
      .map(track=>({track,sort:Math.random()}))
      .sort((left,right)=>left.sort-right.sort)
      .slice(0,3)
      .map(item=>item.track);
    showCameraRecommendations(expression,mood,recommendations);
    status.textContent=`Suggested ${recommendations.length} ${mood.toLowerCase()} track${recommendations.length===1?'':'s'}. Trying the first suggestion; if playback is blocked, use its Play button.`;
    const recommendedIndex=tracks.indexOf(recommendations[0]);
    $('#moodLabel').textContent=mood;
    loadTrack(recommendedIndex,true);
  }catch(error){
    const detail=error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access for this site in your browser settings, then try again.':
      error.name==='NotFoundError'?'No camera was found. Connect a camera and try again.':
      error.name==='NotReadableError'?'The camera is already in use by another app. Close that app and try again.':
      error.message||'Camera expression estimation failed.';
    status.textContent=detail;
    toast(detail);
  }finally{
    clearTimeout(permissionTimer);
    if(stream)stream.getTracks().forEach(track=>track.stop());
    video.srcObject=null;
    video.hidden=true;
    button.disabled=false;
    button.textContent='Try a camera expression estimate';
  }
}
