# Medical Tender Agent

This runner scans GeM and the requested state procurement portals, rejects tenders closing before tomorrow, classifies strict medical matches, sends ambiguous health-buyer tenders to `Needs Review`, and rebuilds `Daily Tender Report.xlsx` with one tab per publication date.

## Local check

```powershell
& 'D:\ZSearching\.site-tools\node.exe' .\cloud-agent\run.cjs --full
& 'D:\ZSearching\.site-tools\node.exe' .\cloud-agent\health.cjs
```

## Google authorization

1. Create a user-managed Google Cloud service account and enable Google Sheets API plus Google Drive API.
2. Attach that service account to the VM with Drive and Sheets OAuth access scopes.
3. Share the target Google Sheet, the Excel file, and the Drive folder with the service account email as Editor.
4. The agent uses Compute Engine metadata credentials, so a downloadable JSON private key is not required. JSON credentials remain supported as a fallback.

## VM install

Copy the deployment bundle to a Debian/Ubuntu Google Compute Engine VM, extract it, then run:

```bash
cd deploy
sudo bash install.sh
sudo journalctl -u tender-agent.service -n 200 --no-pager
```

The incremental timer runs every 15 minutes. The full reconciliation timer runs daily at 02:15 India time. `Agent Status` records source failures so a silent portal outage cannot look like a successful zero-result scan.
