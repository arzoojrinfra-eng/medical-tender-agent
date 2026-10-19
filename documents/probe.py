"""Credential and public-source connectivity check; never prints keys or bodies."""
import os
import requests

key = os.environ.get('GEMINI_API_KEY')
if not key:
    raise SystemExit('GEMINI_API_KEY is missing')
r = requests.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                  headers={'x-goog-api-key': key},
                  json={'contents': [{'parts': [{'text': 'Reply with exactly OK.'}]}],
                        'generationConfig': {'maxOutputTokens': 1024}}, timeout=60)
print('Gemini connectivity HTTP', r.status_code)
if not r.ok:
    # The error code/status conveys the cause without exposing the response body.
    error = r.json().get('error', {})
    print('Gemini error status:', error.get('status', 'unknown'))
    raise SystemExit(1)
print('Gemini response candidates:', len(r.json().get('candidates', [])))
try:
    r = requests.get('https://bidplus.gem.gov.in/showbidDocument/10054679',
                     headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
    print('Official sample PDF HTTP', r.status_code, 'PDF signature:', r.content.startswith(b'%PDF-'))
except requests.RequestException as exc:
    print('Official sample download failed:', type(exc).__name__)
