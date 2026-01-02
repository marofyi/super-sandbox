# Security Finding: Unauthenticated Account Creation via API

**Service:** surge.sh
**Endpoint:** `POST https://surge.surge.sh/token`
**Discovered:** 2026-01-02
**Severity:** Low-Medium (abuse potential)

## Summary

The surge.sh API allows automatic account creation with arbitrary email addresses. No email verification is required. A valid authentication token is returned immediately, granting full access to the free tier (unlimited static site deployments).

## Technical Details

### Endpoint

```
POST https://surge.surge.sh/token
Authorization: Basic <base64(email:password)>
Content-Type: application/json
```

### Reproduction

```bash
# Create account with any email (no verification)
curl -s -X POST https://surge.surge.sh/token \
  -H "Content-Type: application/json" \
  -u "any-string-here@fake-domain.test:password123"

# Response (immediate, no email verification):
{
  "email": "any-string-here@fake-domain.test",
  "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Verified Behavior

1. Email format is validated (must contain `@`)
2. Email domain is NOT validated (any domain accepted)
3. No verification email is sent
4. Token is immediately usable for deployments
5. Account persists indefinitely

## Potential Abuse Vectors

1. **Throwaway hosting** - Malicious content hosted with no traceable identity
2. **Resource exhaustion** - Mass account creation could strain infrastructure
3. **Phishing/spam hosting** - Quick deployment of phishing pages with disposable accounts
4. **Rate limit bypass** - Create new accounts to bypass per-account limits

## Suggested Mitigations

1. **Email verification** - Require click-through before token is usable
2. **Rate limiting** - Limit account creation by IP address
3. **CAPTCHA** - Add challenge for account creation
4. **Domain validation** - Check MX records or use email verification service

## Context

This was discovered while evaluating surge.sh for use in sandboxed development environments (Claude Code Web) where interactive CLI login is not possible. The finding was incidental to researching API-based authentication.

## Disclosure

This document is intended for responsible disclosure to the surge.sh maintainers. No exploitation was performed beyond proof-of-concept testing with obviously fake email addresses.

---

**Contact:** [Your contact info here]
**Repository:** https://github.com/sintaxi/surge
