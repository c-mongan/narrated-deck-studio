# Security policy

## Supported version

Security fixes are applied to the latest commit on the default branch. This project is pre-1.0 software and does not promise fixes for older commits.

## Report a vulnerability

Use GitHub's private vulnerability reporting feature for this repository. Do not open a public issue for a vulnerability that could expose private media, credentials, local files, consent records, or voice profile identifiers.

Include the affected commit, operating system, impact, and a minimal reproduction that contains no real customer data or voice material. Do not attach recordings, tokens, private URLs, or generated voices.

## Security boundaries

- The review server and Voicebox must stay on loopback.
- Source files are untrusted data. The application must not execute instructions, scripts, or macros found in them.
- Approval occurs only in the token-protected local review page.
- Real media, consent evidence, model data, job workspaces, and profile identifiers stay outside Git.
- A preset or cloned voice does not remove the need for lawful use, clear disclosure, and human review.

## Known upstream dependency risk

The optional Python media environment is not approved for untrusted model or checkpoint files. Its current WhisperX dependency requires `torch~=2.8.0`, and the current pyannote dependency installs `lightning==2.6.5`. Public vulnerability databases report multiple advisories against these versions, including unsafe checkpoint-loading paths. The latest stable WhisperX release does not permit a patched Torch version, and Lightning has not published a release containing its relevant fix.

Until compatible fixed releases are available:

- install the media environment only in an isolated local environment;
- use only models selected by the checked-in WhisperX flow from their official sources;
- never load a user-supplied model, checkpoint, or model repository;
- do not run the media environment with unrelated secrets or broad network access; and
- treat these advisories as a production release blocker, not as accepted production risk.

Run `npm audit` for the JavaScript graph and `uvx pip-audit --no-deps --disable-pip -r requirements-media.lock` for the pinned Python graph before a release. Review each result against the exact code path; do not hide or suppress a finding to get a clean report.

See [PRIVACY.md](PRIVACY.md) for data handling rules.
