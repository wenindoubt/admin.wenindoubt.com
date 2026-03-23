# Auth Flow

Clerk handles authentication with middleware-level route protection and server action validation.

```mermaid
flowchart TD
    Request((Request)) --> Middleware{Clerk Middleware}
    Middleware -->|public route| SignIn[/sign-in, /sign-up/]
    Middleware -->|protected route| AuthCheck{auth.protect}
    AuthCheck -->|no session| Redirect[Redirect to /sign-in]
    AuthCheck -->|valid session| Page[Dashboard Page]
    Page -->|server action| ActionAuth{auth check}
    ActionAuth -->|no userId| Error[401 Unauthorized]
    ActionAuth -->|valid userId| DB[(Database)]
    Page -->|POST /api/ai/analyze| APIAuth{auth check}
    APIAuth -->|no userId| Error
    APIAuth -->|valid userId| Claude([Claude API])
```

## Key Details

- **Middleware** lives in `src/proxy.ts` (not `middleware.ts`) — Clerk convention with `createRouteMatcher`
- **Public routes**: `/sign-in(.*)`, `/sign-up(.*)` — everything else is protected
- **Server actions** independently validate auth — defense in depth, not just middleware
- **API route** (`/api/ai/analyze`) also validates auth before streaming Claude responses
- **Matcher** skips Next.js internals (`/_next/`) and static files but always runs for `/api/` routes
