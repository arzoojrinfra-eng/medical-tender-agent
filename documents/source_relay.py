"""Local public-document downloader; no Gemini key is needed or stored here."""
import hashlib
import io
import json
import os
import zipfile

import worker


def main():
    g = worker.Google(os.environ.get('GOOGLE_OAUTH_ACCESS_TOKEN'))
    records, _ = worker.capture_selections(g)
    cache_id = os.environ['DOCUMENT_SOURCE_CACHE_FILE_ID']
    raw = g.api('GET', 'https://www.googleapis.com/drive/v3/files/' + cache_id, params={'alt': 'media'}).content
    entries = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        if sum(i.file_size for i in archive.infolist()) > worker.MAX_ARCHIVE:
            raise RuntimeError('Source cache size limit reached')
        for item in archive.infolist():
            entries[item.filename] = archive.read(item)
    index = json.loads(entries.get('index.json', b'{}'))
    changed = False
    for record in records:
        if record[2] != 'Prepare Checklist' or not (record[3] == 'Queued' or record[3].startswith(('Needs setup', 'Waiting for source'))):
            continue
        old = index.get(record[0])
        if old and (worker.datetime.now(worker.timezone.utc) - worker.datetime.fromisoformat(old['retrieved_at'])).total_seconds() < 21600:
            continue
        docs, _, issues = worker.collect_documents(record[4], record[1])
        prefix = hashlib.sha256(record[0].encode()).hexdigest()[:20]
        saved = []
        for doc in docs:
            filename = prefix + '/' + doc['file']
            entries[filename] = doc['data']
            saved.append({'archive_path': filename, 'file': doc['file'], 'url': doc['url'],
                          'sha256': hashlib.sha256(doc['data']).hexdigest()})
        index[record[0]] = {'tender_number': record[1], 'official_url': record[4], 'retrieved_at': worker.now(),
                          'documents': saved, 'issues': issues}
        changed = True
        print('Official source pack retrieved:', len(docs), 'PDFs')
    if changed:
        entries['index.json'] = json.dumps(index).encode()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name, content in entries.items():
                archive.writestr(name, content)
        if len(buffer.getvalue()) > worker.MAX_ARCHIVE:
            raise RuntimeError('Source cache size limit reached')
        g.api('PATCH', 'https://www.googleapis.com/upload/drive/v3/files/' + cache_id,
              params={'uploadType': 'media'}, headers={'Content-Type': 'application/zip'}, data=buffer.getvalue())
    print('Source relay completed; cache_updated=' + str(changed))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Source relay stopped:', type(error).__name__)
        raise SystemExit(1)
