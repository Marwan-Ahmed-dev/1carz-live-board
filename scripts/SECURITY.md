# Security notes

## Service account key in git history
`scripts/serviceAccountKey.revoked.json` was removed from the tree. The filename
indicates the key was revoked. Deleting the file does **not** remove blobs from
old commits.

If that key was ever active:
1. Confirm it is deleted/disabled in Google Cloud IAM.
2. Optionally purge history with `git filter-repo` (requires coordinated force-push).

Never commit `scripts/serviceAccountKey*.json` again (see `.gitignore`).