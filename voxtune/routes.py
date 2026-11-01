from flask import Blueprint, current_app, jsonify, render_template, request

from .commands import classify_command
from .library import discover_user_tracks


routes = Blueprint("voxtune", __name__)


@routes.get("/")
def home():
    tracks = discover_user_tracks(current_app.static_folder)
    return render_template("index.html", user_tracks=tracks)


@routes.post("/api/command")
def command():
    payload = request.json or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify(error="Please say or type a command."), 400

    tracks = discover_user_tracks(current_app.static_folder)
    available_titles = tuple(track["title"] for track in tracks)
    transcripts = [text]
    alternatives = payload.get("alternatives", [])
    if isinstance(alternatives, list):
        transcripts.extend(
            str(alternative).strip()
            for alternative in alternatives[:5]
            if str(alternative).strip()
        )

    classified = [
        (candidate, *classify_command(candidate, available_titles))
        for candidate in transcripts
    ]
    transcript, intent, confidence = next(
        (item for item in classified if item[1] != "unknown"),
        classified[0],
    )
    return jsonify(
        intent=intent,
        confidence=round(confidence, 2),
        transcript=transcript,
    )
