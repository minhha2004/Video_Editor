from moviepy.editor import (
    AudioFileClip,
    CompositeAudioClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
    VideoFileClip,
    concatenate_videoclips,
)
import gc
import json
import os
import subprocess


def check_videotoolbox():
    """Kiem tra he thong co ho tro tang toc phan cung Mac VideoToolbox khong."""
    try:
        output = subprocess.check_output(
            ["ffmpeg", "-encoders"],
            stderr=subprocess.STDOUT,
        ).decode()
        return "h264_videotoolbox" in output
    except Exception:
        return False


def _to_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _even_size(size):
    width, height = size
    return (int(width) // 2 * 2, int(height) // 2 * 2)


def _target_size(config):
    return (1280, 720) if config.get("isLandscape") else (720, 1280)


def _preview_size(config):
    if config.get("isLandscape"):
        return (800.0, 450.0)
    return (550.0 * 9.0 / 16.0, 550.0)


def _preview_scale(config, clip):
    preview_w, preview_h = _preview_size(config)
    return min(clip.w / preview_w, clip.h / preview_h)


def _cover_to_size(clip, size):
    """Match frontend object-cover behavior for the preview frame."""
    target_w, target_h = size
    scale = max(target_w / clip.w, target_h / clip.h)
    resized = clip.resize(scale)
    x1 = max(0, (resized.w - target_w) / 2)
    y1 = max(0, (resized.h - target_h) / 2)
    return resized.crop(x1=x1, y1=y1, width=target_w, height=target_h)


def _build_base_clip(video_path, config):
    source = VideoFileClip(video_path)
    segments = config.get("activeSegments") or []

    if segments:
        pieces = []
        for segment in segments:
            start = max(0.0, _to_float(segment.get("start"), 0.0))
            end = min(source.duration, _to_float(segment.get("end"), source.duration))
            if end > start:
                pieces.append(source.subclip(start, end))

        if pieces:
            clip = concatenate_videoclips(pieces, method="compose")
            return source, clip, segments, True

    trim_start = max(0.0, _to_float(config.get("trimStart"), 0.0))
    trim_end = _to_float(config.get("trimEnd"), source.duration)
    if trim_end <= trim_start:
        trim_end = source.duration
    trim_end = min(trim_end, source.duration)
    return source, source.subclip(trim_start, trim_end), [], False


def _timeline_windows(start, end, config, base_duration):
    """Convert original-time overlay intervals into render timeline intervals."""
    start = _to_float(start, 0.0)
    end = _to_float(end, base_duration)
    if end <= start:
        return []

    segments = config.get("activeSegments") or []
    if segments:
        windows = []
        output_cursor = 0.0
        for segment in segments:
            seg_start = _to_float(segment.get("start"), 0.0)
            seg_end = _to_float(segment.get("end"), seg_start)
            seg_duration = max(0.0, seg_end - seg_start)

            overlap_start = max(start, seg_start)
            overlap_end = min(end, seg_end)
            if overlap_end > overlap_start:
                out_start = output_cursor + (overlap_start - seg_start)
                out_end = output_cursor + (overlap_end - seg_start)
                windows.append((out_start, out_end))

            output_cursor += seg_duration

        return windows

    trim_start = _to_float(config.get("trimStart"), 0.0)
    render_start = max(0.0, start - trim_start)
    render_end = min(base_duration, end - trim_start)
    return [(render_start, render_end)] if render_end > render_start else []


def _center_position(x_pct, y_pct, base_clip, overlay_clip):
    x = base_clip.w * (_to_float(x_pct, 50.0) / 100.0) - (overlay_clip.w / 2)
    y = base_clip.h * (_to_float(y_pct, 50.0) / 100.0) - (overlay_clip.h / 2)
    return (x, y)


def _resolve_sticker_path(raw_path):
    if not raw_path:
        return None

    file_name = os.path.basename(str(raw_path).split("?")[0])
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_dir = os.path.dirname(backend_dir)

    candidates = [
        os.path.join(backend_dir, "static", "stickers", file_name),
        os.path.join(backend_dir, "asset", "stickers", file_name),
        os.path.join(repo_dir, "frontend", "public", "stickers", file_name),
        os.path.join(os.getcwd(), "static", "stickers", file_name),
        os.path.join(os.getcwd(), "asset", "stickers", file_name),
    ]

    for path in candidates:
        if os.path.exists(path) and not os.path.isdir(path):
            return path

    return None


def _add_text_layer(clips_to_composite, clip, config):
    text_items = config.get("texts") or config.get("textList")
    if not text_items:
        single_text = config.get("text") or config.get("textConfig")
        text_items = [single_text] if single_text else []

    if not text_items:
        return

    for txt_cfg in text_items:
        if not txt_cfg or not txt_cfg.get("content"):
            continue

        for start, end in _timeline_windows(
            txt_cfg.get("start", 0),
            txt_cfg.get("end", clip.duration),
            config,
            clip.duration,
        ):
            try:
                render_scale = _preview_scale(config, clip)
                font_size = int(round(_to_float(txt_cfg.get("fontSize"), 40) * render_scale))
                txt_clip = TextClip(
                    str(txt_cfg.get("content", "")).upper(),
                    fontsize=max(1, font_size),
                    color=txt_cfg.get("color", "white"),
                    font="Arial-Bold",
                    method="label",
                )
                txt_clip = (
                    txt_clip.set_start(start)
                    .set_duration(end - start)
                    .set_position(
                        _center_position(txt_cfg.get("x", 50), txt_cfg.get("y", 50), clip, txt_clip)
                    )
                )
                clips_to_composite.append(txt_clip)
            except Exception as err:
                print(f"Luu y: Khong the chen chu: {err}")


def _add_subtitle_layers(clips_to_composite, clip, config):
    subtitles = config.get("subtitles") or config.get("subtitleList") or []
    render_scale = _preview_scale(config, clip)
    subtitle_font_size = int(round(16 * render_scale))
    subtitle_bottom = int(round(24 * render_scale))
    for sub in subtitles:
        text = sub.get("text") or sub.get("word")
        if not text:
            continue

        for start, end in _timeline_windows(sub.get("start", 0), sub.get("end", 0), config, clip.duration):
            try:
                sub_clip = TextClip(
                    str(text),
                    fontsize=max(1, subtitle_font_size),
                    color="white",
                    font="Arial-Bold",
                    method="caption",
                    size=(int(clip.w * 0.82), None),
                    align="center",
                    bg_color="rgba(0,0,0,0.85)",
                )
                sub_clip = (
                    sub_clip.set_start(start)
                    .set_duration(end - start)
                    .set_position(("center", clip.h - sub_clip.h - subtitle_bottom))
                )
                clips_to_composite.append(sub_clip)
            except Exception as err:
                print(f"Luu y: Khong the chen phu de: {err}")


def _add_sticker_layers(clips_to_composite, clip, config):
    stickers = config.get("stickers") or config.get("stickerList") or []
    render_scale = _preview_scale(config, clip)
    preview_sticker_max = 180.0
    for st_cfg in stickers:
        raw_path = st_cfg.get("path") or st_cfg.get("url") or st_cfg.get("src")
        st_path = _resolve_sticker_path(raw_path)
        if not st_path:
            print(f"[!] Khong tim thay sticker: {raw_path}")
            continue

        start_value = st_cfg.get("startTime", st_cfg.get("start", 0))
        end_value = st_cfg.get("endTime", st_cfg.get("end", clip.duration))
        for start, end in _timeline_windows(start_value, end_value, config, clip.duration):
            try:
                st_clip = ImageClip(st_path)
                sticker_scale = _to_float(st_cfg.get("scale"), 1.0)
                max_render_size = preview_sticker_max * render_scale * sticker_scale
                fit_scale = min(max_render_size / st_clip.w, max_render_size / st_clip.h)
                st_clip = st_clip.resize(fit_scale)

                pos = st_cfg.get("position") or {}
                st_clip = (
                    st_clip.set_start(start)
                    .set_duration(end - start)
                    .set_position(_center_position(pos.get("x", 50), pos.get("y", 50), clip, st_clip))
                )
                clips_to_composite.append(st_clip)
            except Exception as err:
                print(f"[!] Loi khi chen sticker: {err}")


def _apply_audio(clip, audio_path, config):
    audio_cfg = config.get("audio") or config.get("audioConfig") or {}
    keep_original_audio = not config.get("isVideoMuted")

    if audio_path and os.path.exists(audio_path):
        try:
            new_audio = AudioFileClip(audio_path)
            start_t = max(0.0, _to_float(audio_cfg.get("start"), 0.0))
            end_t = _to_float(audio_cfg.get("end"), min(clip.duration, new_audio.duration))
            audio_duration = max(0.0, end_t - start_t)
            audio_duration = min(audio_duration, new_audio.duration, max(0.0, clip.duration - start_t))

            if audio_duration > 0:
                volume = _to_float(audio_cfg.get("volume"), 1.0)
                new_audio = new_audio.subclip(0, audio_duration).set_duration(audio_duration)
                if volume != 1.0:
                    new_audio = new_audio.volumex(volume)
                new_audio = new_audio.set_start(start_t)

                if keep_original_audio and clip.audio:
                    return clip.set_audio(CompositeAudioClip([clip.audio, new_audio]))
                return clip.set_audio(new_audio)
        except Exception as err:
            print(f"Luu y: Khong the chen am thanh phu, bo qua: {err}")

    if not keep_original_audio:
        return clip.set_audio(None)

    return clip


def process_video_export(video_path: str, audio_path: str, config_json: str, output_path: str):
    config = json.loads(config_json)
    source = None
    clip = None
    final_video = None
    clips_to_composite = []

    try:
        source, clip, _segments, _uses_segments = _build_base_clip(video_path, config)
        clip = _cover_to_size(clip, _even_size(_target_size(config)))
        clip = _apply_audio(clip, audio_path, config)

        clips_to_composite = [clip]
        _add_text_layer(clips_to_composite, clip, config)
        _add_subtitle_layers(clips_to_composite, clip, config)
        _add_sticker_layers(clips_to_composite, clip, config)

        has_videotoolbox = check_videotoolbox()
        chosen_codec = "h264_videotoolbox" if has_videotoolbox else "libx264"
        final_video = CompositeVideoClip(clips_to_composite, size=clip.size)

        print(f"--- Dang bat dau Export voi codec: {chosen_codec} ---")
        final_video.write_videofile(
            filename=output_path,
            codec=chosen_codec,
            audio_codec="aac",
            threads=8,
            preset="ultrafast" if has_videotoolbox else "medium",
            logger=None,
            verbose=False,
            ffmpeg_params=["-pix_fmt", "yuv420p"],
        )
    except Exception as err:
        print(f"Loi trong qua trinh ghi file: {err}")
        raise
    finally:
        for media_clip in clips_to_composite:
            try:
                media_clip.close()
            except Exception:
                pass
        if final_video:
            try:
                final_video.close()
            except Exception:
                pass
        if source:
            try:
                source.close()
            except Exception:
                pass
        gc.collect()
        print("--- Render hoan tat va giai phong bo nho! ---")
