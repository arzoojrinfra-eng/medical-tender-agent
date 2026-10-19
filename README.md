# Medical Tender Agent

Runs every 15 minutes on GitHub Actions and scans GeM plus the configured state tender portals. It writes the verified medical list, review queue, state/date coverage audit, status, and the Excel copy to the owner's existing Google Drive reports.

The workflow uses Google Workload Identity Federation. It has no service-account key, password, cookie, tender database, or Google token in this repository.

Configured states: West Bengal, Odisha, Bihar, Assam, Jharkhand, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, and Sikkim.
