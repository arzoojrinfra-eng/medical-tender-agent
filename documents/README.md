# Selected tender documents

In Daily Tender Report, select `Prepare Checklist` in column **N (ACTION)**.
The worker scans selections on a five-minute GitHub Actions schedule. GitHub may
delay scheduled runs; this is not a one-minute service guarantee. It runs in the
cloud. GeM currently refuses connections from the GitHub runner. A local source
relay downloads official PDFs and stages them in a private owner-created Drive
cache. For this fallback, the user's computer must be on and the Google account
must remain authorized. Cloud-only GeM retrieval is not working and is not claimed.
The Windows task `TenderDocumentSourceRelay` runs once per minute while the user
is signed in, with a hidden process and overlap lock. It uses keyless Google
impersonation, stages at most 6-hour-old source packs, and never stores the Gemini
key locally. Its local health file is `tender-actions/source-relay-status.json`.
Once a queued tender's source pack is available, the local launcher dispatches
the cloud workflow directly instead of waiting for the GitHub cron schedule.
A two-minute dispatch cooldown prevents repeated launches while a job is queued.
It also dispatches when sources are already cached but the request is still queued.

Column O shows status, P the official original URL, and Q the Drive archive link.
The archive has one folder per selected tender. Original PDFs become available
before the AI-generated Word pack. A persistent `Tender Actions` queue retains
requests/output links if the daily report is sorted, refreshed, or a tender expires.
The queue is stored in a separate `Tender Document Queue` spreadsheet so deleting
or rebuilding the report's tabs does not delete requests. The report synchronizer
captures requests before clearing managed report values.
The scanner and document worker share a concurrency group to avoid writing at the
same time. Manual user edits during a refresh can still race; verify the request
appears in the persistent queue.

The worker uses the repository's `GEMINI_API_KEY` secret and keyless Google
Workload Identity Federation. It reads `DOCUMENT_ARCHIVE_FILE_ID` from repository
variables. No key, PDF, tender database, generated document or model response is
committed to the repository. Output is saved in the user's existing private Drive.
The owner-created ZIP can be updated by the service account without requiring it
to own new Drive files or consume a service-account storage quota.

Outputs per tender:

- Original PDFs and downloaded line-item CSV where available.
- OEM-Checklist.docx and Bidder-Checklist.docx, with PDF page/clause evidence.
- Editable-Annexures.docx, containing prescribed forms found in retrieved PDFs.
- Review-Notes.docx and Evidence.json, with sources, hashes, and missing checks.

Only explicit source requirements are used. Unknown company details remain blank;
unsupported generic forms and assumed regulatory certificates are not invented.
The model receives complete PDFs (including page images for scanned pages).
Programmatic checks compare evidence quotes/annexure wording to extracted text.
Scanned text, complex tables and uncertain wording require manual comparison.

Limits are visible: inaccessible state-portal HTML/CAPTCHA, failed attachments,
oversized files, unsupported formats, model/free-quota failures and missing
corrigendum checks are flagged. PDF-link discovery cannot establish that no newer
corrigendum exists. Until verified, a generated pack has `Needs review` status and
must be checked before bid submission. Editable Word files are review drafts.

At most two queued tenders are processed per run. Ready/Needs review jobs are not
repeated on every poll. To retry after fixing a problem, set the selected request's
STATUS in `Tender Actions` to `Queued`. A failed job does not silently turn green.
If a runner is interrupted while Processing, check its run log before requeuing.
Archive maximum: 200 MB. Once reached, rotate the owner-created archive and update
the repository variable. The worker stops with an explicit error instead of
discarding previous packs.

Local tests: `python -m unittest discover -s documents -p test_worker.py` and
`node documents/test-selection.cjs`.
