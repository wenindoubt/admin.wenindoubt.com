# Changelog

## [1.0.0](https://github.com/wenindoubt/admin.wenindoubt.com/compare/admin.wenindoubt.com-v0.1.0...admin.wenindoubt.com-v1.0.0) (2026-03-29)


### ⚠ BREAKING CHANGES

* leads table replaced by companies + contacts + deals. All /leads routes now at /deals and /companies. Server actions renamed from lead* to deal*. AI context function signature changed to buildDealContext(deal, company, contact, activities).
* redesign UI with dark premium aesthetic + theme toggle

### Features

* AI insights redesign + tag management + activity pagination ([1903104](https://github.com/wenindoubt/admin.wenindoubt.com/commit/190310464b93831d6b2cc99d29f0126501cec994))
* contacts dashboard, neon rebrand, dashboard consistency ([75df2ee](https://github.com/wenindoubt/admin.wenindoubt.com/commit/75df2ee174943f6c6ab8c5b53df16d9ffa339d60))
* **db:** require contact email and deal primary contact ([b1a9153](https://github.com/wenindoubt/admin.wenindoubt.com/commit/b1a9153cda7fe260196cd7a43121266a373d2f03))
* **deals:** auto-draft Gmail outreach on New → Contacted transition ([2a7189e](https://github.com/wenindoubt/admin.wenindoubt.com/commit/2a7189e98edd74328ca734e08e85c26a3d03ddf4))
* initial commit ([5e1a0ae](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5e1a0aefc665b91b67da7791de502a26c1c1d565))
* migrate from leads to Company → Contact → Deal model ([3a40b5a](https://github.com/wenindoubt/admin.wenindoubt.com/commit/3a40b5a0805ee9b78bc88a3a966fe85162b62a5e))
* **outreach:** inline AI rewrite for email drafts + env-based model config ([65af293](https://github.com/wenindoubt/admin.wenindoubt.com/commit/65af2930e2ee63077a57186b2104278bd214a0dd))
* redesign UI with dark premium aesthetic + theme toggle ([82e8995](https://github.com/wenindoubt/admin.wenindoubt.com/commit/82e899570cd3037905f86a14c09e61bac1200c03))
* scaffold lead management CRM with AI insights ([5e398da](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5e398dad7a97cbd79f7f54dede2dca0e8ef9740a))
* **search:** add full-text search with tsvector + GIN index ([6c83028](https://github.com/wenindoubt/admin.wenindoubt.com/commit/6c830284246745714c10e6c2dd77307778a32569))
* **ui:** improve readability, kanban UX, and table navigation ([c643366](https://github.com/wenindoubt/admin.wenindoubt.com/commit/c64336675d629d50203800b9ff673e3027f257e4))
* zod max-length constraints + comma-formatted currency input ([8d52575](https://github.com/wenindoubt/admin.wenindoubt.com/commit/8d525753eb1698fa175cee6f2cec4f01ebd413c7))


### Bug Fixes

* **ci:** prevent prerender failures and suppress node20 warning ([97476ed](https://github.com/wenindoubt/admin.wenindoubt.com/commit/97476ed3b97a46e14b808a80d20c638b5d69e976))
* display labels instead of raw enum values in activities and toasts ([42c6537](https://github.com/wenindoubt/admin.wenindoubt.com/commit/42c653707ae44eaa6194e4c962ecd6cdebd99533))
* font consistency, select display values, sidebar sizing, docs accuracy ([5f35682](https://github.com/wenindoubt/admin.wenindoubt.com/commit/5f356825758c5b357136d02bea75b295c8080ccd))
* stabilize realtime client, fix lint, opt-in pagination ([b7c0903](https://github.com/wenindoubt/admin.wenindoubt.com/commit/b7c090336f8cc2b8d9961ee8fa7160eb1b602b5d))


### Performance Improvements

* **db:** add indexes, RLS, pagination, and authenticated realtime ([422ae0b](https://github.com/wenindoubt/admin.wenindoubt.com/commit/422ae0b1d27c0be59a37302c1823ace3a297c71f))
