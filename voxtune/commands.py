import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline


TRAINING = [
    ("play music", "play"), ("start playing", "play"), ("resume song", "play"), ("begin playback", "play"),
    ("pause music", "pause"), ("hold playback", "pause"),
    ("stop music", "stop"), ("stop the song", "stop"), ("stop playback", "stop"),
    ("stop the music", "stop"), ("halt playback", "stop"),
    ("next track", "next"), ("next song", "next"), ("skip this song", "next"),
    ("skip to the next song", "next"), ("skip ahead", "next"), ("play something else", "next"),
    ("previous track", "previous"), ("go back a song", "previous"), ("play the last song", "previous"),
    ("turn it up", "volume_up"), ("increase volume", "volume_up"), ("make it louder", "volume_up"),
    ("turn the volume up", "volume_up"), ("raise the volume", "volume_up"), ("volume up", "volume_up"),
    ("turn it down", "volume_down"), ("lower volume", "volume_down"), ("make it quieter", "volume_down"),
    ("turn the volume down", "volume_down"), ("low the volume", "volume_down"), ("low volume", "volume_down"),
    ("decrease volume", "volume_down"), ("reduce the volume", "volume_down"), ("volume down", "volume_down"),
    ("quiet the volume", "volume_down"), ("make the volume lower", "volume_down"),
    ("shuffle songs", "shuffle"), ("shuffle my playlist", "shuffle"), ("play in random order", "shuffle"),
    ("randomize this playlist", "shuffle"), ("mix it up", "shuffle"),
    ("repeat this song", "repeat"), ("loop the current track", "repeat"), ("turn repeat on", "repeat"),
    ("repeat", "repeat"), ("loop this song", "repeat"),
    ("play calm music", "mood_calm"), ("I feel relaxed", "mood_calm"), ("something peaceful", "mood_calm"),
    ("I want something calm", "mood_calm"), ("I want to relax", "mood_calm"),
    ("I feel stressed", "mood_calm"), ("play relaxing music", "mood_calm"),
    ("play happy music", "mood_happy"), ("I feel cheerful", "mood_happy"), ("something joyful", "mood_happy"),
    ("I am happy", "mood_happy"), ("I feel good", "mood_happy"), ("play cheerful music", "mood_happy"),
    ("play energetic music", "mood_energy"), ("play something upbeat", "mood_energy"),
    ("I need a boost", "mood_energy"), ("something upbeat", "mood_energy"), ("I need energy", "mood_energy"),
    ("I want something energetic", "mood_energy"), ("music for a workout", "mood_energy"),
    ("play focus music", "mood_focus"), ("music to study", "mood_focus"), ("something for concentration", "mood_focus"),
    ("I need to focus", "mood_focus"), ("I am studying", "mood_focus"), ("music for studying", "mood_focus"),
    ("music for work", "mood_focus"), ("I need to concentrate", "mood_focus"),
]

command_model = make_pipeline(
    TfidfVectorizer(ngram_range=(1, 2), lowercase=True),
    LogisticRegression(max_iter=1000, random_state=7),
)
command_model.fit(
    [phrase for phrase, _ in TRAINING],
    [intent for _, intent in TRAINING],
)


def classify_command(text, available_titles=()):
    normalized = re.sub(r"\bvolve\b", "volume", text.casefold())

    volume_down = r"\b(low|lower|down|decrease|reduce|quieter|quiet|softer|less)\b"
    volume_up = r"\b(up|raise|increase|louder|loud|higher|more)\b"
    if "volume" in normalized and re.search(volume_down, normalized):
        return "volume_down", 1.0
    if "volume" in normalized and re.search(volume_up, normalized):
        return "volume_up", 1.0
    if re.search(r"\b(mute|silence)\b", normalized):
        return "volume_mute", 1.0
    if re.search(r"\b(unmute)\b", normalized):
        return "volume_unmute", 1.0
    if re.search(r"\b(stop|halt|end)\b", normalized) and (
        re.search(r"\b(song|music|track|playback|playing)\b", normalized)
        or normalized.strip() in {"stop", "stop it", "halt", "end"}
    ):
        return "stop", 1.0
    if re.search(r"\b(turn|switch)\s+off\s+(the\s+)?(music|song|player)\b", normalized):
        return "stop", 1.0
    if re.search(r"\b(pause|hold)\b", normalized) and (
        re.search(r"\b(song|music|track|playback|playing)\b", normalized)
        or normalized.strip() in {"pause", "pause it", "hold"}
    ):
        return "pause", 1.0
    if re.search(r"\b(resume|unpause|continue)\b", normalized):
        return "play", 1.0
    if re.search(r"\b(turn|switch)\s+on\s+(the\s+)?(music|song|player)\b", normalized):
        return "play", 1.0
    if re.search(r"\b(turn|bring|put)\s+it\s+down\b", normalized):
        return "volume_down", 1.0
    if re.search(r"\b(turn|bring|put)\s+it\s+up\b", normalized):
        return "volume_up", 1.0
    if re.search(volume_down, normalized) and re.search(r"\b(sound|audio)\b", normalized):
        return "volume_down", 1.0
    if re.search(volume_up, normalized) and re.search(r"\b(sound|audio)\b", normalized):
        return "volume_up", 1.0
    if re.search(r"\b(quieter|softer)\b", normalized):
        return "volume_down", 1.0
    if re.search(r"\blouder\b", normalized):
        return "volume_up", 1.0
    if re.search(r"\b(shuffle|randomize|mix it up)\b", normalized):
        return "shuffle", 1.0
    if re.search(r"\b(play|put)\b.*\b(random|randomly)\b|\b(play in random order)\b", normalized):
        return "shuffle", 1.0
    if re.search(r"\b(repeat|loop)\b", normalized):
        return "repeat", 1.0
    if re.search(r"\b(next|skip)\b", normalized):
        return "next", 1.0
    if re.search(r"\b(play something else|play another song)\b", normalized):
        return "next", 1.0
    if re.search(r"\b(previous|last song|go back)\b", normalized):
        return "previous", 1.0
    if re.search(r"\b(begin playback|start playing|start music)\b", normalized):
        return "play", 1.0
    if re.search(r"\b(play|resume|unpause|start)\b", normalized):
        if re.search(r"\b(calm|relax|peaceful|chill)\b", normalized):
            return "mood_calm", 1.0
        if re.search(r"\b(happy|cheerful|joyful)\b", normalized):
            return "mood_happy", 1.0
        if re.search(r"\b(energy|energetic|upbeat|workout)\b", normalized):
            return "mood_energy", 1.0
        if re.search(r"\b(focus|study|studying|work|concentrate)\b", normalized):
            return "mood_focus", 1.0
    if re.search(r"\b(calm|relaxed|relaxing|peaceful|chill|stressed)\b", normalized):
        return "mood_calm", 1.0
    if re.search(r"\b(happy|cheerful|joyful)\b", normalized):
        return "mood_happy", 1.0
    if re.search(r"\b(energetic|upbeat|workout|need energy)\b", normalized):
        return "mood_energy", 1.0
    if re.search(r"\b(focus|studying|study|concentrate|concentration)\b", normalized):
        return "mood_focus", 1.0

    matched_title = next(
        (title for title in available_titles if title.casefold() in normalized),
        None,
    )
    if matched_title and re.search(r"\b(play|listen to|put on|start)\b", normalized):
        return "play_track", 1.0
    if re.search(r"\b(play|start playing|start music)\b", normalized):
        return "play", 1.0

    intent = command_model.predict([text])[0]
    confidence = float(max(command_model.predict_proba([text])[0]))
    if confidence < 0.16:
        return "unknown", confidence
    return intent, confidence
