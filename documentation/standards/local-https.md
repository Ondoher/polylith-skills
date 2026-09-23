# Local HTTPS

## Purpose

<!-- rule: LOCAL-HTTPS-001 -->
Local HTTPS lets the standalone Polylith app run at `https://localhost:8443/` so development can exercise secure-context and HTTPS behavior without installing a production certificate workflow.

<!-- rule: LOCAL-HTTPS-002 -->
Initialization uses fixed defaults rather than additional configuration prompts: hostname `localhost`, port `8443`, and 365-day certificate validity. Change them later only as an explicit project requirement.

## Certificate Contract

<!-- rule: LOCAL-HTTPS-003 -->
`scripts/create-local-certificate.mjs` generates a project-specific:

<!-- rule: LOCAL-HTTPS-004 -->
- RSA 2048 key;
<!-- rule: LOCAL-HTTPS-005 -->
- SHA-256 signature;
<!-- rule: LOCAL-HTTPS-006 -->
- non-CA leaf certificate;
<!-- rule: LOCAL-HTTPS-007 -->
- 365-day validity period;
<!-- rule: LOCAL-HTTPS-008 -->
- common name `localhost`;
<!-- rule: LOCAL-HTTPS-009 -->
- subject alternative names for `localhost`, `127.0.0.1`, and `::1`.

<!-- rule: LOCAL-HTTPS-010 -->
The script writes the PEM key and certificate into the `https` object in `polylith.json`, matching the configuration shape consumed by Polylith. It validates that the configuration and generated PEM values are usable before reporting success.

<!-- rule: LOCAL-HTTPS-011 -->
Rotate the certificate explicitly:

<!-- rule: LOCAL-HTTPS-012 -->
```text
npm run certificate:create
```

## Trust Boundary

<!-- rule: LOCAL-HTTPS-013 -->
A self-signed certificate is appropriate for controlled local development. It provides the HTTPS protocol path but is not automatically trusted by browsers or operating systems. A browser may display its normal warning until the developer deliberately trusts the certificate.

<!-- rule: LOCAL-HTTPS-014 -->
Project automation does not modify:

<!-- rule: LOCAL-HTTPS-015 -->
- the Windows certificate trust store;
<!-- rule: LOCAL-HTTPS-016 -->
- the hosts file;
<!-- rule: LOCAL-HTTPS-017 -->
- root `.gitignore`;
<!-- rule: LOCAL-HTTPS-018 -->
- Git state;
<!-- rule: LOCAL-HTTPS-019 -->
- npm TLS verification.

<!-- rule: LOCAL-HTTPS-020 -->
Do not disable `strict-ssl`, substitute an untrusted package registry, or confuse npm certificate-chain errors with the app's local certificate. Those are separate trust paths.

## Failure And Renewal

<!-- rule: LOCAL-HTTPS-021 -->
Certificate generation is part of setup when selected. An invalid configuration, missing dependency, invalid PEM result, or write failure is an application setup failure and should stop with a clear error. Do not silently fall back to HTTP.

<!-- rule: LOCAL-HTTPS-022 -->
The certificate is intentionally replaceable. Regeneration should update only the owned `polylith.json` HTTPS values and leave unrelated configuration unchanged. If certificate material is later moved out of configuration, update this topic and the script together so there remains one canonical storage contract.

## Verification

<!-- rule: LOCAL-HTTPS-023 -->
After generation:

<!-- rule: LOCAL-HTTPS-024 -->
1. confirm `polylith.json` has nonempty certificate and key PEM values;
<!-- rule: LOCAL-HTTPS-025 -->
2. run the normal app server;
<!-- rule: LOCAL-HTTPS-026 -->
3. request `https://localhost:8443/` and any configured deep link;
<!-- rule: LOCAL-HTTPS-027 -->
4. verify the certificate subject/SAN matches the host used;
<!-- rule: LOCAL-HTTPS-028 -->
5. verify the unchanged build can still be mounted at `/<app-slug>/` by a composing host.

<!-- rule: LOCAL-HTTPS-029 -->
Do not claim a production security review from this check. Local HTTPS proves the configured development path only.
