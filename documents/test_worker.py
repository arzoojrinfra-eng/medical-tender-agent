import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import worker
from docx import Document


class WorkerTests(unittest.TestCase):
    def test_request_identity_survives_session_urls_and_duplicate_queue_is_rejected(self):
        a = worker.key_for('GEM/1', 'https://bidplus.gem.gov.in/showbidDocument/1')
        b = worker.key_for('GEM/1', 'https://bidplus.gem.gov.in/different-session')
        self.assertEqual(a, b)
        row = ['1', 'GEM/1', 'Prepare Checklist', '', 'https://bidplus.gem.gov.in/showbidDocument/1', '', '', '']
        self.assertEqual(worker.queue_index([row]), {a: 0})
        with self.assertRaises(ValueError):
            worker.queue_index([row, row[:]])

    def test_private_urls_and_credential_urls_are_rejected(self):
        for url in ['http://localhost/a', 'https://127.0.0.1/a', 'https://gov.in.attacker.test/a',
                    'https://secret@bidplus.gem.gov.in/a', 'https://bidplus.gem.gov.in:8443/a']:
            with self.assertRaises(ValueError):
                worker.official_url(url)

    def fixture(self):
        docs = [{'file': 'source-01.pdf', 'pages': ['OEM authorization is required. Signed declaration.'],
                 'data': b'%PDF-fixture', 'url': 'https://bidplus.gem.gov.in/showbidDocument/1'}]
        item = dict(document='OEM authorization', owner='OEM', requirement='Mandatory', condition='All bidders',
                    file='source-01.pdf', page=1, clause='1', quote='OEM authorization is required.',
                    letterhead='Not stated', signature_stamp='Not stated', validity='Not stated', notes='')
        result = {'tender_number': 'GEM/1', 'reviewed_pages': [{'file': 'source-01.pdf', 'page': 1, 'readable': True}],
                  'checklist': [item], 'annexures': [], 'issues': []}
        return docs, result

    def test_invented_quote_or_unread_page_never_passes_validation(self):
        docs, result = self.fixture()
        self.assertEqual(worker.validate_analysis(result, docs), [])
        result['checklist'][0]['quote'] = 'ISO certification is compulsory'
        result['reviewed_pages'][0]['readable'] = False
        self.assertEqual(len(worker.validate_analysis(result, docs)), 2)
        self.assertFalse(result['checklist'][0]['evidence_verified'])

    def test_annexure_wording_changes_are_flagged(self):
        docs, result = self.fixture()
        result['annexures'] = [{'title': 'Declaration', 'file': 'source-01.pdf', 'page': 1,
                               'blocks': [{'type': 'paragraph', 'text': 'Signed declaration.', 'rows': []}]}]
        self.assertEqual(worker.validate_analysis(result, docs), [])
        result['annexures'][0]['blocks'][0]['text'] = 'We certify full compliance forever.'
        self.assertTrue(worker.validate_analysis(result, docs))

    def test_generated_word_files_open_and_keep_unknown_facts(self):
        docs, result = self.fixture()
        worker.validate_analysis(result, docs)
        with tempfile.TemporaryDirectory() as temp, patch.object(worker, 'OUT', Path(temp)):
            folder = worker.make_pack('GEM/1', docs, [], result, ['Corrigenda check pending'], 'test')
            self.assertEqual(len(list(folder.glob('*.docx'))), 4)
            doc = Document(folder / 'OEM-Checklist.docx')
            self.assertIn('Letterhead: Not stated', '\n'.join(p.text for p in doc.paragraphs))
            self.assertTrue((folder / 'Evidence.json').exists())


if __name__ == '__main__':
    unittest.main()
