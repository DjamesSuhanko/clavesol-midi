"""Explicit category registry; never discovers directories or other collections."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent


def enabled_categories():
    values = json.loads((ROOT / 'categories.json').read_text(encoding='utf-8'))
    seen = set()
    for item in values:
        if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', item['id']) or item['id'] in seen:
            raise ValueError('Identificador de categoria inválido ou repetido.')
        if not isinstance(item['name'], str) or not item['name'].strip() or type(item['enabled']) is not bool:
            raise ValueError('Categoria precisa de name e enabled booleano.')
        seen.add(item['id'])
    return [item for item in values if item['enabled']]


def local_source(category_id, override=None):
    if override:
        return override
    config = ROOT / 'categories.local.json'
    sources = json.loads(config.read_text(encoding='utf-8')) if config.exists() else {}
    if not sources.get(category_id):
        raise ValueError(f'Configure a origem de {category_id} em categories.local.json.')
    return sources[category_id]


def midi_prefix(category_id):
    # Preserve existing Classic URLs; new collections have disjoint namespaces.
    return Path('midis') if category_id == 'classic' else Path('collections') / category_id / 'midis'
