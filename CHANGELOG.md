# Changelog

## [1.0.0](https://github.com/wenindoubt/admin.wenindoubt.com/compare/admin.wenindoubt.com-v0.1.0...admin.wenindoubt.com-v1.0.0) (2026-04-04)


### ⚠ BREAKING CHANGES

* leads table replaced by companies + contacts + deals. All /leads routes now at /deals and /companies. Server actions renamed from lead* to deal*. AI context function signature changed to buildDealContext(deal, company, contact, activities).
* redesign UI with dark premium aesthetic + theme toggle

### Features

* add secure public ingest API for company/contact creation ([bcad9c8](https://github.com/wenindoubt/admin.wenindoubt.com/commit/bcad9c895bdcc14d949895e3b564724934bb9acd))
* AI insights redesign + tag management + activity pagination ([1903104](https://github.com/wenindoubt/admin.wenindoubt.com/commit/190310464b93831d6b2cc99d29f0126501cec994))
* centralized notes system with rich text, AI context, semantic retrieval ([183add7](https://github.com/wenindoubt/admin.wenindoubt.com/commit/183add7894c9da580609f3495ad0f0e5819b9652))
* contacts dashboard, neon rebrand, dashboard consistency ([75df2ee](https://github.com/wenindoubt/admin.wenindoubt.com/commit/75df2ee174943f6c6ab8c5b53df16d9ffa339d60))
* **db:** add prod migration pipeline, harden RLS, consolidate migrations ([f726a6a](https://github.com/wenindoubt/admin.wenindoubt.com/commit/f726a6a4d91ab3c7fa3798aa1efe46ad9ed4e096))
* **db:** require contact email and deal primary contact ([b1a9153](https://github.com/wenindoubt/admin.wenindoubt.com/commit/b1a9153cda7fe260196cd7a43121266a373d2f03))
* **deals:** auto-draft Gmail outreach on New → Contacted transition ([2a7189e](https://github.com/wenindoubt/admin.wenindoubt.com/commit/2a7189e98edd74328ca734e08e85c26a3d03ddf4))
* **ingest:** add note upsert support to ingest API ([fa43410](https://github.com/wenindoubt/admin.wenindoubt.com/commit/fa434101c8db3b6249103edd8f0cef6d330f6a8b))
* initial commit ([5e1a0ae](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5e1a0aefc665b91b67da7791de502a26c1c1d565))
* migrate from leads to Company → Contact → Deal model ([3a40b5a](https://github.com/wenindoubt/admin.wenindoubt.com/commit/3a40b5a0805ee9b78bc88a3a966fe85162b62a5e))
* multi-contact deals, rich text editor, phone formatting ([233f853](https://github.com/wenindoubt/admin.wenindoubt.com/commit/233f853c99f76c6da5dcd6deb0fb550173ec77dc))
* notes UX overhaul — accordion list, file attachments, inline token counting ([21904e0](https://github.com/wenindoubt/admin.wenindoubt.com/commit/21904e0aa266c2aff438cd7034925af477fa6848))
* **outreach:** inline AI rewrite for email drafts + env-based model config ([65af293](https://github.com/wenindoubt/admin.wenindoubt.com/commit/65af2930e2ee63077a57186b2104278bd214a0dd))
* persist AI analysis across client-side navigation ([a32a8cd](https://github.com/wenindoubt/admin.wenindoubt.com/commit/a32a8cd1be37a33c4fa00d7ab1684c167cd2d499))
* redesign UI with dark premium aesthetic + theme toggle ([82e8995](https://github.com/wenindoubt/admin.wenindoubt.com/commit/82e899570cd3037905f86a14c09e61bac1200c03))
* scaffold lead management CRM with AI insights ([5e398da](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5e398dad7a97cbd79f7f54dede2dca0e8ef9740a))
* **scout:** rename ingest to scout ([4d93d1a](https://github.com/wenindoubt/admin.wenindoubt.com/commit/4d93d1a1931b684dbe369c8927853630de51c0eb))
* **search:** add full-text search with tsvector + GIN index ([6c83028](https://github.com/wenindoubt/admin.wenindoubt.com/commit/6c830284246745714c10e6c2dd77307778a32569))
* server-side pagination for all entities ([54f31ec](https://github.com/wenindoubt/admin.wenindoubt.com/commit/54f31ec5167f775b9ce2e515cea8dfcedf75677b))
* **ui:** improve readability, kanban UX, and table navigation ([c643366](https://github.com/wenindoubt/admin.wenindoubt.com/commit/c64336675d629d50203800b9ff673e3027f257e4))
* zod max-length constraints + comma-formatted currency input ([8d52575](https://github.com/wenindoubt/admin.wenindoubt.com/commit/8d525753eb1698fa175cee6f2cec4f01ebd413c7))


### Bug Fixes

* CI failures — lazy Supabase init, hooks ordering, lint cleanup ([a3e4802](https://github.com/wenindoubt/admin.wenindoubt.com/commit/a3e480217d0ecd78d93778619c2dea03a1952040))
* **ci:** prevent prerender failures and suppress node20 warning ([97476ed](https://github.com/wenindoubt/admin.wenindoubt.com/commit/97476ed3b97a46e14b808a80d20c638b5d69e976))
* display labels instead of raw enum values in activities and toasts ([42c6537](https://github.com/wenindoubt/admin.wenindoubt.com/commit/42c653707ae44eaa6194e4c962ecd6cdebd99533))
* E2E test data cleanup + stop mutating seed data ([8f8c073](https://github.com/wenindoubt/admin.wenindoubt.com/commit/8f8c073e7594b1312b7a0956d73c03127d968aae))
* font consistency, select display values, sidebar sizing, docs accuracy ([5f35682](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5f356825758c5b357136d02bea75b295c8080ccd))
* **ingest:** resolve contact deduplication on email add/change ([2bfab1e](https://github.com/wenindoubt/admin.wenindoubt.com/commit/2bfab1e5b1c1c624e5f7fb1ce3b6be3990ff6107))
* resolve CI pipeline failures (build + semgrep) ([e5bc678](https://github.com/wenindoubt/admin.wenindoubt.com/commit/e5bc678e7123cb4e8cc6478dc446bec11648ac4a))
* stabilize realtime client, fix lint, opt-in pagination ([b7c0903](https://github.com/wenindoubt/admin.wenindoubt.com/commit/b7c090336f8cc2b8d9961ee8fa7160eb1b602b5d))
* Supabase singleton HMR guard + docs accuracy sweep ([16c6b53](https://github.com/wenindoubt/admin.wenindoubt.com/commit/16c6b53a8d089374baf3da1c6a6607d514bc691c))


### Performance Improvements

* cap unbounded detail-page queries + harden DB layer ([a5f8dbb](https://github.com/wenindoubt/admin.wenindoubt.com/commit/a5f8dbb82f0cdeea54c5375dde6c0b62207d1278))
* **db:** add indexes, RLS, pagination, and authenticated realtime ([422ae0b](https://github.com/wenindoubt/admin.wenindoubt.com/commit/422ae0b1d27c0be59a37302c1823ace3a297c71f))
* Suspense streaming, dynamic imports, server-side optimizations ([078ec5c](https://github.com/wenindoubt/admin.wenindoubt.com/commit/078ec5c8d5611e9861eabc1bf2091003b54bee27))
