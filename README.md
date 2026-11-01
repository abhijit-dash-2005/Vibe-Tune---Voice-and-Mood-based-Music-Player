# VibeTune — Voice and Mood Based Music Player

VibeTune is a small web application that uses English browser speech recognition for microphone input and a scikit-learn text classifier to recognize music-player commands. No paid speech-recognition API or Google Cloud credentials are used. The classifier is trained on the English example phrases in `voxtune/commands.py` when the server starts. Mood requests select a matching playlist category; mood labels are user-intent categories, not emotion detection from vocal tone.

## Run it

1. Install Python 3.10 or newer.
2. Open a terminal in this folder and run:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\\Scripts\\Activate.ps1
   # macOS/Linux:
   # source .venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```
3. Open http://127.0.0.1:5000 in a browser. For voice commands, use a browser that supports the Web Speech API (typically Chrome or Edge) and allow microphone access. Try commands such as “play,” “next song,” “shuffle,” “repeat,” “play [track title],” or “play calm music.”

Both microphone buttons use the browser's built-in English speech recognition. VibeTune does not send audio to a paid cloud API; the browser may process microphone audio according to its own provider and privacy settings. Speech recognition availability varies by browser. Typed commands always remain available.

After a player command is understood, VibeTune displays a spoken-style confirmation such as “Okay, I’ll play happy songs.” Voice commands are also read aloud when the browser supports speech synthesis; typed commands show the confirmation on screen.

Voice input and command recognition are English-only. The player and Music Guide use the English (United States) locale. Browser speech-recognition quality may vary; if the microphone is unavailable, type commands into the command box or Music Guide.

Voice and text commands include play/resume, pause, stop (stops and rewinds the current track), next/previous, shuffle/repeat, mute/unmute, volume up/down, mood selection, and playing a named library track. Clear transport and volume commands are matched before the ML intent classifier so words such as “stop the song” cannot be mistaken for a mood. Unsupported phrases should get an ask-for-clarification response rather than trigger an unrelated action. Mood requests use the local scikit-learn text classifier. The optional face-detection feature is isolated in `static/js/camera.js`: after you click the camera button and grant permission, face-api.js estimates an expression locally, maps it to a music category, displays up to three tracks from that category, and tries to play the first suggestion. If browser autoplay is blocked, use a recommendation's Play button. Camera frames are not uploaded or saved. Expression estimates can be inaccurate and do not determine a person's actual mood. The model files are downloaded from a public CDN on first use. Camera access generally requires localhost or HTTPS. If no permission prompt appears, use the browser site controls beside the address bar to allow camera access, then reload the page and try again.

## Project structure

```text
VibeTune/
├── app.py                 # Simple development-server entry point
├── requirements.txt       # Python dependencies
├── README.md              # Setup and project guide
├── voxtune/               # Backend application package
│   ├── __init__.py        # Flask app factory and configuration
│   ├── routes.py          # Web page and command API endpoints
│   ├── commands.py        # English command training data and classifier
│   └── library.py         # Music discovery and track metadata
├── templates/
│   └── index.html         # Main player page
└── static/
    ├── css/
    │   └── style.css      # Layout, themes, and responsive design
    ├── js/
    │   ├── core.js        # Shared state, UI helpers, and command messages
    │   ├── library.js     # Track list, favorites, and custom playlists
    │   ├── player.js      # Playback controls and command execution
    │   ├── camera.js      # Optional camera mood feature
    │   └── app.js         # Event wiring, voice recognition, and Music Guide
    └── music/
        ├── Calm/          # Calm tracks
        ├── Energy/        # Energy tracks
        ├── Focus/         # Focus tracks
        ├── Happy/         # Happy tracks
        └── README.txt     # Music library instructions
```

Start the app from the project root with `python app.py`. Backend responsibilities are separated into `voxtune/`; templates and frontend assets stay separate; audio files are organized by mood under `static/music/`.

## Add your own music

Copy audio files into the matching folder under `static/music/`:

```text
static/
├── css/
│   └── style.css
├── js/
│   ├── core.js
│   ├── library.js
│   ├── player.js
│   ├── camera.js
│   └── app.js
└── music/
    ├── Calm/
    ├── Energy/
    ├── Focus/
    └── Happy/
```

For example, `static/music/Focus/my-study-track.mp3` is automatically added to the Focus library when you reload VibeTune. Supported formats include MP3, WAV, OGG, M4A, AAC, OPUS, and FLAC; actual playback support depends on your browser. The track title comes from the filename. You do not need to edit `static/js/app.js`. Custom playlists save stable track paths, so adding songs will not break them. Use music you own or have permission to play.

Add training phrases and intents to `TRAINING` in `app.py` to improve command recognition.
