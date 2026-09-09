#!/usr/bin/env python3
"""Supplementary final-film QA; stdlib plus FFmpeg. Never grants approval."""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile


class QAError(ValueError):
    pass


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def require(condition, message):
    if not condition:
        raise QAError(message)


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate(m):
    require(isinstance(m, dict) and m.get('schemaVersion') == 1, 'schemaVersion must be 1')
    for key in ('film', 'master'):
        require(isinstance(m.get(key), str) and bool(m[key]), f'{key} path is required')
    sha = m.get('masterSha256', '')
    require(isinstance(sha, str) and len(sha) == 64 and all(c in '0123456789abcdef' for c in sha), 'masterSha256 must be lowercase SHA-256')
    require(number(m.get('durationSeconds')) and m['durationSeconds'] > 0, 'durationSeconds must be positive')
    for key in ('width', 'height', 'subtitleTracks', 'chapterCount'):
        require(type(m.get(key)) is int and m[key] >= (1 if key in ('width', 'height') else 0), f'invalid {key}')
    require(isinstance(m.get('cues'), list) and len(m['cues']) > 0, 'cues must not be empty')
    seen, previous_hold_end = set(), 0
    for c in m['cues']:
        require(isinstance(c, dict), 'cue must be an object')
        ident = c.get('id')
        require(isinstance(ident, str) and ident.strip() and ident not in seen, 'cue IDs must be unique nonempty strings')
        seen.add(ident)
        for key in ('speechStart', 'speechEnd', 'visualStart', 'visualEnd', 'readingHoldSeconds', 'sampleSeconds'):
            require(number(c.get(key)), f'{ident}: {key} must be finite')
        start, end = c['speechStart'], c['speechEnd']
        require(0 <= c['visualStart'] <= start < end <= c['visualEnd'] <= m['durationSeconds'], f'{ident}: evidence must cover speech within film')
        require(c['readingHoldSeconds'] > 0, f'{ident}: positive reading hold required')
        require(end + c['readingHoldSeconds'] <= c['visualEnd'] + .05, f'{ident}: reading hold exceeds evidence window')
        require(start >= previous_hold_end - .05, f'{ident}: speech overlaps previous speech/reading hold')
        require(start <= c['sampleSeconds'] < end, f'{ident}: sample must be inside speech')
        require(isinstance(c.get('expectedState'), str) and c['expectedState'].strip(), f'{ident}: expectedState required')
        previous_hold_end = end + c['readingHoldSeconds']
    return m


def command(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    require(result.returncode == 0, f'{Path(args[0]).name} failed: {result.stderr.decode(errors="replace")[-1500:]}')
    return result.stdout


def probe(path):
    return json.loads(command(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-show_chapters', '-of', 'json', str(path)]))


def paths(manifest):
    m = validate(read(manifest))
    root = Path(manifest).resolve().parent
    return m, (root / m['film']).resolve(), (root / m['master']).resolve()


def correlations(master, film, cues, directory):
    # Decode once to private scratch files, then read just each speech span.
    sr = 6000
    raw = []
    for label, source in [('master', master), ('film', film)]:
        target = Path(directory) / (label + '.f32')
        command(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:a:0', '-ac', '1', '-ar', str(sr), '-f', 'f32le', str(target)])
        raw.append(target)
    rows = []
    with raw[0].open('rb') as original, raw[1].open('rb') as final:
        for c in cues:
            start = round(c['speechStart'] * sr)
            size = round(c['speechEnd'] * sr) - start
            samples = []
            for handle in (original, final):
                handle.seek(start * 4)
                a = array.array('f')
                a.frombytes(handle.read(size * 4))
                if sys.byteorder != 'little':
                    a.byteswap()
                require(len(a) == size, f"{c['id']}: missing decoded audio")
                require(all(math.isfinite(x) for x in a), 'nonfinite audio samples')
                samples.append(a)
            x, y = samples
            mx, my = sum(x) / size, sum(y) / size
            vx = sum((a - mx) ** 2 for a in x)
            vy = sum((a - my) ** 2 for a in y)
            require(vx / size > 1e-10 and vy / size > 1e-10, f"{c['id']}: silent or missing speech")
            correlation = sum((a - mx) * (b - my) for a, b in zip(x, y)) / math.sqrt(vx * vy)
            rows.append({'id': c['id'], 'correlation': correlation, 'passed': correlation >= .99})
    return rows


def audit(manifest, output):
    m, film, master = paths(manifest)
    output = Path(output)
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    binding = {'manifestSha256': digest(manifest), 'filmSha256': digest(film), 'masterSha256': digest(master)}
    report = {'schemaVersion': 1, **binding, 'passed': False, 'visualReview': 'pending', 'limits': 'Supplementary checks only; no consent, editorial, full-playback, human-listening or native-PowerPoint approval.'}
    try:
        require(binding['masterSha256'] == m['masterSha256'], 'selected master hash changed')
        p, mp = probe(film), probe(master)
        streams = p.get('streams', [])
        videos = [s for s in streams if s['codec_type'] == 'video']
        audios = [s for s in streams if s['codec_type'] == 'audio']
        require(len(videos) == 1 and len(audios) == 1, 'one video and one audio stream required')
        v, a = videos[0], audios[0]
        checks = {
            'h264': v['codec_name'] == 'h264',
            'aac': a['codec_name'] == 'aac',
            'dimensions': (v['width'], v['height']) == (m['width'], m['height']),
            'duration': abs(float(p['format']['duration']) - m['durationSeconds']) <= .1,
            'masterDuration': abs(float(mp['format']['duration']) - m['durationSeconds']) <= .1,
            'subtitleTracks': sum(s['codec_type'] == 'subtitle' for s in streams) == m['subtitleTracks'],
            'chapters': len(p.get('chapters', [])) == m['chapterCount'],
            'audioStartsAtZero': abs(float(a.get('start_time', 'inf'))) <= .05,
        }
        with tempfile.TemporaryDirectory(prefix='audio-', dir=output) as scratch:
            report['speech'] = correlations(master, film, m['cues'], scratch)
        checks['speechMatchesMaster'] = all(c['passed'] for c in report['speech'])
        report['checks'] = checks
        frames = []
        for index, cue in enumerate(m['cues']):
            filename = f'cue-{index + 1:03}.png'  # IDs cannot become filesystem paths.
            target = output / filename
            command(['ffmpeg', '-v', 'error', '-ss', str(cue['sampleSeconds']), '-i', str(film), '-frames:v', '1', str(target)])
            frames.append({'id': cue['id'], 'file': filename, 'sha256': digest(target), 'seconds': cue['sampleSeconds'], 'expectedState': cue['expectedState']})
        report['frames'] = frames
        report['passed'] = all(checks.values())
        write(output / 'review.json', {**binding, 'scope': '', 'cues': [{**f, 'reviewed': False, 'observation': ''} for f in frames]})
        require(report['passed'], 'media checks failed; inspect report.json')
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        write(output / 'report.json', report)
    return report


def release(manifest, output):
    m, film, master = paths(manifest)
    output = Path(output)
    report, review = read(output / 'report.json'), read(output / 'review.json')
    require(report.get('passed') is True and report.get('checks') and all(v is True for v in report['checks'].values()), 'audit did not pass')
    for key, pathname in [('manifestSha256', manifest), ('filmSha256', film), ('masterSha256', master)]:
        require(report.get(key) == review.get(key) == digest(pathname), f'stale {key}')
    require(report['masterSha256'] == m['masterSha256'], 'selected master changed')
    expected = [c['id'] for c in m['cues']]
    require([c.get('id') for c in report.get('frames', [])] == expected, 'audit cue coverage differs')
    require([c.get('id') for c in review.get('cues', [])] == expected, 'review cue coverage differs')
    require(isinstance(review.get('scope'), str) and review['scope'].strip(), 'state actual visual review scope')
    for index, (f, r) in enumerate(zip(report['frames'], review['cues'])):
        require(f['file'] == f'cue-{index + 1:03}.png', 'invalid frame path')
        require(f == {k: r.get(k) for k in f}, 'review frame binding changed')
        require(digest(output / f['file']) == f['sha256'], 'reviewed frame changed')
        require(r.get('reviewed') is True and isinstance(r.get('observation'), str) and r['observation'].strip(), f"{f['id']}: visual observation missing")
    result = {'supplementaryChecksPassed': True, 'filmSha256': report['filmSha256'], 'manifestSha256': report['manifestSha256'], 'reviewSha256': digest(output / 'review.json'), 'reviewedCues': len(expected), 'scope': review['scope'], 'limits': report['limits']}
    write(output / 'release-review.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['audit', 'release'])
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        result = (audit if args.mode == 'audit' else release)(args.manifest, args.output)
        print(json.dumps({'ok': True, 'mode': args.mode, 'filmSha256': result['filmSha256']}))
    except (QAError, OSError, ValueError, KeyError, TypeError) as error:
        print(f'QA failed: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
