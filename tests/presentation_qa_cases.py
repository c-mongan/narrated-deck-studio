import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('presentation_qa', ROOT / 'skills/narrated-deck-studio/scripts/presentation_qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class PresentationQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
            raise RuntimeError('FFmpeg and ffprobe are required for the media QA regression fixtures')
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        def run(*args):
            subprocess.run(['ffmpeg', '-v', 'error', *args], check=True)
        run('-f', 'lavfi', '-i', 'sine=frequency=397:sample_rate=24000:duration=4', str(cls.root / 'master.wav'))
        run('-f', 'lavfi', '-i', 'color=c=white:s=320x180:r=25:d=4', '-i', str(cls.root / 'master.wav'), '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '96k', '-shortest', str(cls.root / 'film.mp4'))
        run('-f', 'lavfi', '-i', 'color=c=white:s=320x180:r=25:d=4', '-f', 'lavfi', '-i', 'sine=frequency=811:sample_rate=24000:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '96k', '-shortest', str(cls.root / 'wrong.mp4'))
        cls.base = {'schemaVersion': 1, 'film': 'film.mp4', 'master': 'master.wav', 'masterSha256': qa.digest(cls.root / 'master.wav'), 'durationSeconds': 4, 'width': 320, 'height': 180, 'subtitleTracks': 0, 'chapterCount': 0, 'cues': [{'id': 'result', 'speechStart': .5, 'speechEnd': 2, 'visualStart': .2, 'visualEnd': 4, 'readingHoldSeconds': 1, 'sampleSeconds': 1, 'expectedState': 'White fixture frame'}]}

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.work = Path(tempfile.mkdtemp(dir=self.root))
        self.manifest = self.work / 'manifest.json'
        self.data = copy.deepcopy(self.base)
        for key in ('film', 'master'):
            self.data[key] = str(self.root / self.data[key])
        qa.write(self.manifest, self.data)
        self.out = self.work / 'qa'

    def complete_test_review(self):
        # This is an explicitly synthetic fixture observation, never product evidence.
        review = qa.read(self.out / 'review.json')
        review['scope'] = 'Synthetic fixture test only'
        for c in review['cues']:
            c['reviewed'], c['observation'] = True, 'Synthetic fixture assertion'
        qa.write(self.out / 'review.json', review)

    def test_good_media_and_explicit_review(self):
        report = qa.audit(self.manifest, self.out)
        self.assertTrue(report['passed'])
        with self.assertRaises(qa.QAError):
            qa.release(self.manifest, self.out)
        self.complete_test_review()
        self.assertEqual(qa.release(self.manifest, self.out)['reviewedCues'], 1)
        with self.assertRaises(FileExistsError):
            qa.audit(self.manifest, self.out)

    def test_invalid_timing_and_values(self):
        changes = [('speechStart', -1), ('speechEnd', 4), ('visualStart', 1), ('sampleSeconds', 3), ('readingHoldSeconds', 0), ('speechStart', float('nan')), ('speechStart', True)]
        for key, value in changes:
            m = copy.deepcopy(self.data)
            m['cues'][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(qa.QAError):
                qa.validate(m)
        m = copy.deepcopy(self.data)
        m['cues'].append({**m['cues'][0], 'id': 'next', 'speechStart': 2.5, 'speechEnd': 3, 'sampleSeconds': 2.6})
        with self.assertRaises(qa.QAError):
            qa.validate(m)

    def test_master_changed(self):
        self.data['masterSha256'] = 'a' * 64
        qa.write(self.manifest, self.data)
        with self.assertRaisesRegex(qa.QAError, 'master hash changed'):
            qa.audit(self.manifest, self.out)
        self.assertFalse(qa.read(self.out / 'report.json')['passed'])

    def test_same_duration_wrong_audio_fails(self):
        self.data['film'] = str(self.root / 'wrong.mp4')
        qa.write(self.manifest, self.data)
        with self.assertRaises(qa.QAError):
            qa.audit(self.manifest, self.out)
        self.assertFalse(qa.read(self.out / 'report.json')['checks']['speechMatchesMaster'])

    def test_stale_manifest_review_and_frame(self):
        qa.audit(self.manifest, self.out)
        self.complete_test_review()
        original = self.manifest.read_bytes()
        self.manifest.write_bytes(original + b'\n')
        with self.assertRaisesRegex(qa.QAError, 'stale manifest'):
            qa.release(self.manifest, self.out)
        self.manifest.write_bytes(original)
        review = qa.read(self.out / 'review.json')
        saved = copy.deepcopy(review)
        review['cues'] = []
        qa.write(self.out / 'review.json', review)
        with self.assertRaisesRegex(qa.QAError, 'coverage'):
            qa.release(self.manifest, self.out)
        qa.write(self.out / 'review.json', saved)
        (self.out / 'cue-001.png').write_bytes(b'changed')
        with self.assertRaisesRegex(qa.QAError, 'frame changed'):
            qa.release(self.manifest, self.out)

    def test_stale_film(self):
        local_film = self.work / 'copy.mp4'
        shutil.copyfile(self.root / 'film.mp4', local_film)
        self.data['film'] = str(local_film)
        qa.write(self.manifest, self.data)
        qa.audit(self.manifest, self.out)
        self.complete_test_review()
        with local_film.open('ab') as handle:
            handle.write(b'changed')
        with self.assertRaisesRegex(qa.QAError, 'stale film'):
            qa.release(self.manifest, self.out)


if __name__ == '__main__':
    unittest.main()
