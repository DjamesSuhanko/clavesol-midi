import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'gerar_catalogo.py'
sys.path.insert(0, str(SCRIPT.parent))
spec = importlib.util.spec_from_file_location('catalog', SCRIPT)
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.root = self.base / 'source'
        self.root.mkdir()

    def add(self, relative, data=b'MIDI fixture'):
        file = self.root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        return file

    def test_nested_unicode_extensions_statistics_and_privacy(self):
        self.add('Bach/Suites/Parte 1/Ária & dança #1.MIDI', b'abc')
        self.add('Mozart/sonata_01-Mov.2.MiD', b'12345')
        self.add('Sem autor.mid', b'12')
        self.add('ignore.txt')
        entries, summary = catalog.build_catalog(self.root)
        self.assertEqual(len(entries), 3)
        self.assertEqual(entries[0]['hierarchy'], ['Bach', 'Suites', 'Parte 1'])
        self.assertEqual(entries[0]['fileName'], 'Ária & dança #1.MIDI')
        self.assertEqual(entries[1]['title'], 'sonata 01 Mov.2')
        self.assertEqual(summary['composerCount'], 2)
        self.assertEqual(summary['unidentifiedComposerSongs'], 1)
        self.assertEqual(summary['filesByComposer'], {'Bach': 1, 'Mozart': 1})
        self.assertEqual(summary['totalSizeBytes'], 10)
        self.assertNotIn(str(self.base), json.dumps(entries))
        self.assertTrue(all(not Path(e['relativePath']).is_absolute() for e in entries))

    def test_links_ignored_including_external_and_cycles(self):
        target = self.add('Bach/real.mid')
        outside = self.base / 'external'; outside.mkdir()
        (outside / 'secret.mid').write_bytes(b'outside')
        (self.root / 'external').symlink_to(outside, target_is_directory=True)
        (self.root / 'escape.mid').symlink_to(outside / 'secret.mid')
        (self.root / 'internal.mid').symlink_to(target)
        (self.root / 'cycle').symlink_to(self.root, target_is_directory=True)
        (self.root / 'broken.mid').symlink_to(self.base / 'missing')
        entries, summary = catalog.build_catalog(self.root)
        self.assertEqual([e['relativePath'] for e in entries], ['Bach/real.mid'])
        self.assertEqual(summary['ignoredSymlinks'], 5)
        alias = self.base / 'alias'; alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError): catalog.build_catalog(alias)

    def test_stable_ids_order_regeneration_and_namespaces(self):
        self.add('Z/last.mid'); self.add('A/first.mid')
        before, summary = catalog.build_catalog(self.root)
        after, summary2 = catalog.build_catalog(self.root)
        self.assertEqual(before, after); self.assertEqual(summary, summary2)
        one = self.base / 'one.json'; two = self.base / 'two.json'
        catalog.write_json(one, before); catalog.write_json(two, after)
        self.assertEqual(one.read_bytes(), two.read_bytes())
        self.add('A/new.mid')
        grown, _ = catalog.build_catalog(self.root)
        self.assertTrue({e['id'] for e in before}.issubset({e['id'] for e in grown}))
        other, _ = catalog.build_catalog(self.root, 'another')
        self.assertTrue({e['id'] for e in grown}.isdisjoint({e['id'] for e in other}))
        self.assertEqual([e['relativePath'] for e in grown], ['A/first.mid','A/new.mid','Z/last.mid'])

    def test_cli_environment_and_preserves_source(self):
        original = self.add('Compositor/obra.mid', b'original')
        stat = original.stat()
        output = self.base / 'output'
        env = {**os.environ, 'MIDI_SOURCE_DIR': str(self.root)}
        result = subprocess.run([sys.executable, str(SCRIPT), '--output-dir', str(output)], env=env, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((output / 'catalog.json').is_file())
        self.assertTrue((output / 'summary.json').is_file())
        self.assertEqual(original.read_bytes(), b'original')
        self.assertEqual(original.stat().st_mtime_ns, stat.st_mtime_ns)
        result = subprocess.run([sys.executable, str(SCRIPT), '--output-dir', str(self.root)], env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        env.pop('MIDI_SOURCE_DIR')
        result = subprocess.run([sys.executable, str(SCRIPT), '--collection', 'not_registered'], env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'Categoria', result.stderr)

    def test_empty_and_invalid_source_or_collection(self):
        entries, summary = catalog.build_catalog(self.root)
        self.assertEqual(entries, []); self.assertEqual(summary['totalSizeBytes'], 0)
        with self.assertRaises(FileNotFoundError): catalog.build_catalog(self.base / 'absent')
        with self.assertRaises(ValueError): catalog.build_catalog(self.root, '../invalid')


if __name__ == '__main__':
    unittest.main()
