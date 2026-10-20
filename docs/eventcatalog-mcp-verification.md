# Native EventCatalog MCP verification

## Implementation

The Domain catalog remains generated from Git with core **5.4.1** and native AsyncAPI generator **7.1.0**. It now runs as a Node.js server instead of static Nginx, serving the existing UI and native Streamable HTTP MCP at:

`https://eventcatalog-demo.apps.cluster-ggvsm.dyn.redhatworkshops.io/docs/mcp`

- **software-templates:** Domain config, Dockerfile, allowlisted runtime packaging script, dependency/lockfile split, README and focused tests. Released as **v1.4.1**. [PR #3](https://github.com/contract-first-kafka/software-templates/pull/3), [SSR correction #4](https://github.com/contract-first-kafka/software-templates/pull/4).
- **developer-charts:** Domain startup/readiness/liveness probe settings and server memory allocation; delivery documentation and rendered validation. Released as **v1.4.0**. [PR #4](https://github.com/contract-first-kafka/developer-charts/pull/4).
- **demo-domain:** Same runtime files as the golden path; intentional authored documentation explaining agent discovery. [Runtime #15](https://github.com/contract-first-kafka/demo-domain/pull/15), [description #17](https://github.com/contract-first-kafka/demo-domain/pull/17), [SSR correction #18](https://github.com/contract-first-kafka/demo-domain/pull/18).
- **platform-components:** Existing target and Domain Application release pins. [PR #12](https://github.com/contract-first-kafka/platform-components/pull/12), [final template pin #13](https://github.com/contract-first-kafka/platform-components/pull/13).

Git discovery, native generation, input fingerprints, unchanged-build skipping, concurrency Leases, Buildah, Quay digest publication, image-intent PRs, and the existing Domain Argo Application remain in use. No new Application, controller, service, serving database, or serving PVC was introduced. Runtime has no Git or Apicurio dependency.

## Pinned-version findings

The inspected installed package is exactly core 5.4.1; file hashes and findings are in [upstream-inspection.json](eventcatalog-mcp-verification-assets/upstream-inspection.json). Its CLI `eventcatalog start` launches the built server entrypoint with runtime paths and startup initialization. Server output imports core's bundled runtime dependencies, so `dist/` alone is insufficient. See also the [official native MCP documentation](https://www.eventcatalog.dev/docs/development/ask-your-architecture/mcp-server/getting-started).

The image retains generated resource directories, docs, `.discovery.json`, the build-time fields index, and licenses. The config reads discovery metadata and authored docs at startup. Production dependency installation omits the direct generator and YAML build dependency. Core's own published transitive tooling remains because its supported CLI/runtime imports that package. The runtime base is pinned by digest, and the lockfile controls npm installation. The existing pipeline clones a clean source revision before generation and packaging.

Two compatibility findings were handled without changing pinned versions:

1. The native service-schema tool reads `/generated/...` URL paths as filesystem paths. A read-only image symlink points there from the generated client assets. Without it, specifications fail while message schemas still work.
2. The unconfigured chat widget renders a time-of-day greeting using server-local time. This caused React hydration error 418 for America/Chicago clients but not UTC. The supported `chat.enabled: false` setting removes that unused widget; native MCP is enabled independently.

## Verification and reproduction

The actual MCP SDK client is saved in [verify-mcp.mjs](eventcatalog-mcp-verification-assets/verify-mcp.mjs). From this workspace, with the demo's locked npm dependencies installed:

```sh
node demo-domain/docs/eventcatalog-mcp-verification-assets/verify-mcp.mjs \
  https://eventcatalog-demo.apps.cluster-ggvsm.dyn.redhatworkshops.io/docs/mcp \
  /tmp/mcp-verification.json
node demo-domain/docs/eventcatalog-mcp-verification-assets/compare-authoritative.mjs /tmp/mcp-verification.json
```

The SDK performs protocol initialization and enumerates **23 tools**. It invokes `getResources`, `getResource`, `getMessagesProducedOrConsumedByResource`, `getSchemaForResource`, `getProducersOfMessage`, `getConsumersOfMessage`, and `showResource` for architecture and schema views: **26 tool calls**, plus resource enumeration and reading `eventcatalog://all`. The protocol version negotiated in the trace is `2025-11-25`. The optional GET SSE request returns 405 as expected for this stateless server; protocol POST calls succeed.

Both authoritative contracts and all four message schemas are retrieved through the external HTTPS Route with normal TLS verification. Contract content matches Git semantically and as text after trimming the generator-removed terminal newline. Schema comparison resolves local references and ignores only native parser `x-parser-schema-id` provenance metadata. Domain membership and sends/receives match source declarations. No deployed Component association or invented producer is added. Native System resources remain empty, as before; contract Service identity and summary retain the source System membership.

Authoritative source revisions:

- [order-events d7f07e4](https://github.com/contract-first-kafka/order-fulfillment-order-events-api/commit/d7f07e4de1ced076db9f3bbfb1a43e6ce0562a62): two Avro schemas and one JSON Schema.
- [inventory-reservations 33e7919](https://github.com/contract-first-kafka/order-fulfillment-inventory-reservations-api/commit/33e7919bcf5a4b08c6a75206d793930a07173430): one JSON Schema.

The packaged container was also verified locally as UID 10001 on a read-only filesystem with only `/tmp` writable. OpenShift assigns UID **1000940000**. A runtime inspection confirms `.git`, `.inputs`, `.env`, and the generator package are absent; the generated specification path and required discovery metadata are present.

Browser verification covers Domain and contract pages, schema/specification views, authored documentation, the 11-node architecture graph, and all four channels. Final results are recorded below.

## Lifecycle evidence

- `eventcatalog-qktlh`: clean clone, one System/two AsyncAPI contracts discovered, native generation, server build, Quay push, image-intent [PR #16](https://github.com/contract-first-kafka/demo-domain/pull/16), deployment and external MCP verification. Image digest `sha256:31b6b8d2204a8f265f1ddfd5fd86c69e1598abfecfd39cee84e14b54d77aea38`.
- `eventcatalog-qfwkz`: unchanged inputs; generation, image build and intent publication all skipped. [Run evidence](eventcatalog-mcp-verification-assets/unchanged-initial-run.json).
- `eventcatalog-wlpfr`: controlled authored-description change in PR #17; new fingerprint and digest `sha256:7164759ebb92d38cf404b9bde2918d79d2e4576e9eca72a08515196975975c2b`, image-intent [PR #19](https://github.com/contract-first-kafka/demo-domain/pull/19). The new “Agent discovery” paragraph is present in the Domain body retrieved by external MCP. [Regenerated response and handshake](eventcatalog-mcp-verification-assets/external-regenerated.json). This documentation improvement is intentional and retained; no contract test mutations require restoration.
- The Lease coalesced refreshes during running builds and triggered rediscovery after release. The final SSR correction follows that same flow.

Automated checks: **49 template tests**, **36 chart tests**, **9 template release tests**, **10 chart release tests**, **10 compatibility tests plus real Helm renders**, and **43 platform tests** passed.

## Licensing and security

Core 5.4.1 is BSL-1.1; the native generator is MIT. License and NOTICE files in the published image and public `/LICENSES/` endpoints match the installed packages byte-for-byte. [License/public-boundary evidence](eventcatalog-mcp-verification-assets/licenses-and-public-boundary.json).

This is a public synthetic demonstration with unauthenticated MCP exposing the generated architecture, documentation and contracts already available to humans. No custom tools, Studio write features, model provider, runtime Git credentials, or runtime registry credentials are added. Probes of private build paths return 404. Production adoption needs a data-access review, appropriate licensing, native MCP authentication/authorization, network policy and rate limiting; no production authorization policy was tested here.

## Final deployment

The final image is:

`registry-quay-quay.apps.cluster-ggvsm.dyn.redhatworkshops.io/openshift_demo-catalog/eventcatalog@sha256:54b4ae84cfbe124418aa4f1705858c8f67cf485f58a61e1d15e914be3d356bd9`

`eventcatalog-574dc` succeeded and published image intent through [PR #20](https://github.com/contract-first-kafka/demo-domain/pull/20). Argo deployed it with the existing Route and Service. `eventcatalog-6s6fp` then confirmed unchanged inputs and skipped all three expensive stages. [Final unchanged evidence](eventcatalog-mcp-verification-assets/unchanged-final-run.json).

All **33 Argo Applications are Synced/Healthy**, and no active pod is unready. Developer Hub resolves the Domain golden path from software-templates **v1.4.1**. The live server used approximately **336Mi** after exercising UI/MCP, below its 1Gi limit. [Deployment snapshot](eventcatalog-mcp-verification-assets/deployment-final.json).

The final external SDK run completed **26 successful native tool calls**; both contracts, all four schemas, declared relationships, and the regenerated description were verified. [Final MCP response/trace](eventcatalog-mcp-verification-assets/external-final.json), [source assertions](eventcatalog-mcp-verification-assets/source-comparison-final.json).

Browser verification uses Playwright/Chromium with America/Chicago timezone, checking 12 pages, service navigation and the 11-node graph. Reproduce with Playwright installed in `/tmp/cf-ec-browser`:

```sh
NODE_PATH=/tmp/cf-ec-browser/node_modules node demo-domain/docs/eventcatalog-mcp-verification-assets/verify-ui.cjs \
  https://eventcatalog-demo.apps.cluster-ggvsm.dyn.redhatworkshops.io \
  /tmp/catalog-ui.json
```

[Final UI evidence](eventcatalog-mcp-verification-assets/ui-final.json) records zero JavaScript errors after disabling the unused chat widget. The two browser assertion adjustments accepted the native discovery page's slashless service URL; they did not require product changes.

No required demonstration functionality remains unverified. Production authentication/authorization and load testing are outside this synthetic-demo verification. The documented 5.4.1 `/generated` packaging workaround remains necessary. The native generator's lack of System resources is unchanged and is not hidden by invented relationships.
