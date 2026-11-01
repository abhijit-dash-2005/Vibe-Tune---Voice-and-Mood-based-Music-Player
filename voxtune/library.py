import re
from pathlib import Path


MUSIC_MOODS = {
    "Calm": ("Calm", "linear-gradient(135deg,#72b9c5,#5269a9)"),
    "Happy": ("Happy", "linear-gradient(135deg,#f6bd60,#f28482)"),
    "Focus": ("Focus", "linear-gradient(135deg,#7c83fd,#4c4f82)"),
    "Energy": ("Energy", "linear-gradient(135deg,#d66efd,#f36f9c)"),
}
MUSIC_EXTENSIONS = {".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".opus", ".flac"}


def discover_user_tracks(static_folder):
    static_path = Path(static_folder)
    music_dir = static_path / "music"
    tracks = []

    for folder, (mood, color) in MUSIC_MOODS.items():
        mood_dir = music_dir / folder
        if not mood_dir.is_dir():
            continue

        for path in sorted(mood_dir.iterdir(), key=lambda item: item.name.casefold()):
            if not path.is_file() or path.suffix.casefold() not in MUSIC_EXTENSIONS:
                continue

            title = re.sub(r"\s*\(MP3_\d+K\)$", "", path.stem, flags=re.IGNORECASE)
            title = title.split(" _ ", 1)[0].replace("_", " ").strip()
            title = re.sub(r"^Full Video[_\s:.-]*", "", title, flags=re.IGNORECASE)
            title = re.sub(
                r"\s*\((?:official music video|music video|lyrics?|tamil)\)\s*$",
                "",
                title,
                flags=re.IGNORECASE,
            )
            title = re.sub(
                r"\s*(?:-\s*)?(?:with lyrics|lyrics?|lyrical|lyric video|video song|official music video)\s*$",
                "",
                title,
                flags=re.IGNORECASE,
            )
            title = re.sub(r"\s+", " ", title).strip(" _-")

            tracks.append(
                {
                    "title": title or path.stem,
                    "artist": "Your Library",
                    "mood": mood,
                    "color": color,
                    "url": f"/static/{path.relative_to(static_path).as_posix()}",
                }
            )

    return tracks
