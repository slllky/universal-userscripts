"""Append the action sheets from a local tampermonkey-art checkout to the original cast atlas.

Usage: python tools/pack-action-sheets.py /path/to/tampermonkey-art
The checked-in atlas or the output of extract-sprites.py can serve as the base.
Pillow is the only dependency.
"""
import argparse
import json
import math
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
BASE_COUNT = 160
CELL = 128
COLUMNS = 12


def read_metadata(path):
    return json.loads(path.read_text(encoding='utf-8'))


def crop_frame(sheet, columns, index):
    x = index % columns * CELL
    y = index // columns * CELL
    return sheet.crop((x, y, x + CELL, y + CELL))


def read_frames(sheet_path, data, count):
    if data['cell'] != CELL or len(data['bounds']) < count or data['count'] < count:
        raise ValueError(f'Invalid frame table in {sheet_path.parent}')
    columns = data['columns']
    with Image.open(sheet_path) as png:
        if png.size != (columns * CELL, math.ceil(data['count'] / columns) * CELL):
            raise ValueError(f'Grid dimensions disagree with metadata: {sheet_path}')
        sheet = png.convert('RGBA')
    frames = [crop_frame(sheet, columns, i) for i in range(count)]
    for i, frame in enumerate(frames):
        box = frame.getchannel('A').getbbox()
        if not box or list(box) != data['bounds'][i] or min(box[:2]) < 1 or max(box[2:]) >= CELL:
            raise ValueError(f'Ink bounds or gutter mismatch in {sheet_path} frame {i}')
    return frames


def pack(art_root, assets):
    base = read_metadata(assets / 'frames.json')
    frames = read_frames(assets / 'crew.png', base, BASE_COUNT)
    animations = {key: ids for key, ids in base['animations'].items() if max(ids) < BASE_COUNT}
    if len(animations) != 54:
        raise ValueError('Expected the 54 original animation sets')
    base_actors = sorted({key.split('.')[0] for key in animations} - {'archive'})
    details = {}
    timings = {}
    for actor in ['lemongrab', *base_actors, 'archive']:
        paths = [art_root / status / 'ooo-crew' / actor for status in ('approved', 'review')]
        sheet_dirs = [folder for folder in paths if (folder / 'frames.json').is_file()]
        if len(sheet_dirs) != 1:
            raise ValueError(f'Expected exactly one approved or review sheet for {actor}')
        folder = sheet_dirs[0]
        sheet_path = folder / ('lemongrab.png' if actor == 'lemongrab' else 'sheet.png')
        data = read_metadata(folder / 'frames.json')
        expected = {'idle', 'walk', 'run', 'cheer', 'inspect', 'outburst'} if actor == 'lemongrab' else {'greet', 'flair'}
        if set(data['animations']) != {f'{actor}.{action}' for action in expected}:
            raise ValueError(f'Unexpected action list in {folder}')
        local = read_frames(sheet_path, data, data['count'])
        offset = len(frames)
        frames.extend(local)
        for key, ids in data['animations'].items():
            name, action = key.split('.')
            if name != actor or key in animations or not ids or not all(type(i) is int and 0 <= i < len(local) for i in ids):
                raise ValueError(f'Invalid or overlapping animation {key} in {folder}')
            animations[key] = [i + offset for i in ids]
            entry = data.get('actionDetails', {}).get(key, {})
            title = entry.get('label') or data.get('labels', {}).get(action) or action.capitalize()
            facing = entry.get('facing', data.get('facing'))
            if facing not in (1, -1) or not isinstance(title, str):
                raise ValueError(f'Missing label or facing for {key}')
            details[key] = {'label': title, 'facing': facing}
            duration = data.get('durations', {}).get(key) or data.get('durations', {}).get(action)
            if duration:
                if len(duration) != len(ids) or not all(isinstance(ms, (int, float)) and ms > 0 for ms in duration):
                    raise ValueError(f'Invalid frame times for {key}')
                timings[key] = duration

    atlas = Image.new('RGBA', (COLUMNS * CELL, math.ceil(len(frames) / COLUMNS) * CELL))
    bounds = []
    for i, frame in enumerate(frames):
        atlas.paste(frame, ((i % COLUMNS) * CELL, (i // COLUMNS) * CELL))
        bounds.append(list(frame.getchannel('A').getbbox()))
    out = dict(cell=CELL, columns=COLUMNS, count=len(frames), bounds=bounds, animations=animations,
               actionDetails=details, durations=timings)
    atlas.save(assets / 'crew.png', optimize=True)
    (assets / 'frames.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Packed {len(frames)} frames and {len(animations)} animation sets.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('art_checkout', type=Path)
    args = parser.parse_args()
    pack(args.art_checkout, ASSETS)
