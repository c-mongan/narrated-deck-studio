# Contributing

## Set up the project

Follow the source installation steps in [README.md](README.md). Keep all real input files and generated media outside the repository.

## Before a pull request

Run:

```bash
npm ci
npm run verify
```

If you change the media requirements, regenerate `requirements-media.lock` with the documented Python 3.11 command in [TOOLCHAIN_VERSIONS.md](TOOLCHAIN_VERSIONS.md). If you change an external engine, update its exact commit in `docs/DEPENDENCY_PINS.json` and verify the checkout.

## Change rules

- Add a focused regression test for a bug fix when practical.
- Keep approval, consent, loopback, path-confinement, and private-storage checks fail-closed.
- Do not weaken checks to make a test pass.
- Do not add real recordings, cloned voices, customer files, consent records, tokens, profile IDs, model weights, or generated job artifacts.
- Do not claim native PowerPoint, voice quality, signing, or cross-platform proof without evidence from that exact environment.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
