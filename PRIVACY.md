# Privacy and data handling

## Never commit

- source recordings or extracted reference clips
- generated cloned speech or final videos
- speaker names, profile identifiers, or permission evidence
- customer information, private application screens, credentials, or tokens
- model weights, caches, or service databases

Store these in an access-controlled local or approved encrypted workspace. Use
opaque speaker aliases in working manifests. Delete rejected takes according to
the agreed retention period.

## Minimum consent record

Before generation, record who granted permission, what voice and script use was
approved, the date, the permitted audience/channels, expiry or withdrawal terms,
and who verified the permission. Keep that record outside this repository.

## Disclosure

Include a visible or accompanying statement such as: “Narration is AI-generated
with the speaker's permission.” Do not present synthetic narration as a live or
spontaneous recording.

## Local-first processing

Prefer local generation and alignment. If a cloud system is proposed, obtain
specific approval before uploading any recording and review its retention,
training, subprocessors, region, deletion, and access controls.
