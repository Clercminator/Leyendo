# Payments Live Launch Checklist

Use this checklist before switching Leyendo payments from testing/sandbox to live mode.

This runbook covers:

- Pricing page payment routing
- MercadoPago hosted subscriptions
- LemonSqueezy hosted subscriptions
- Supabase webhook processing
- Account-side payment recovery after redirect

## 1. Deployment model

Leyendo now follows this split:

- Vercel Preview: testing credentials and LemonSqueezy `test_mode`
- Vercel Production: live credentials
- Supabase Edge Functions: must know both live and testing credentials so webhook handling and manual return confirmation can work in either environment

Current runtime behavior:

- `VERCEL_ENV=preview` selects testing aliases first in Next.js payment routes
- LemonSqueezy checkout creation also sets `test_mode: true` on preview deployments
- Production prefers live env vars first and only falls back to testing aliases when live is missing
- MercadoPago and LemonSqueezy account recovery both expect the user to be signed into the same Leyendo account that started checkout

## 2. Vercel env vars

Set these in Vercel for the app deployment.

### 2.1 Shared app vars

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recommended:

- Keep preview and production values pointed at the intended Supabase project for that environment

### 2.2 MercadoPago vars

Live values:

- `NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID` or `MERCADOPAGO_PLAN_FOCUS_ID`
- `NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID` or `MERCADOPAGO_PLAN_MAX_ID`
- Optional explicit checkout URLs: `NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL`, `MERCADOPAGO_FOCUS_URL`, `NEXT_PUBLIC_MERCADOPAGO_MAX_URL`, `MERCADOPAGO_MAX_URL`

Testing / preview aliases:

- `MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA`
- `NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA`
- `MERCADOPAGO_FOCUS_ID_TESTING`
- `MERCADOPAGO_PLAN_FOCUS_ID_TESTING`
- `MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT`
- `MERCADOPAGO_PLAN_MAX_ID_PRUEBA`
- `NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID_PRUEBA`
- `MERCADOPAGO_MAX_ID_TESTING`
- `MERCADOPAGO_PLAN_MAX_ID_TESTING`
- `MERCADOPAGO_MAX_ID_TESTING_ACCOUNT`
- Optional explicit testing URLs: `MERCADOPAGO_FOCUS_URL_TESTING`, `MERCADOPAGO_MAX_URL_TESTING`

Validation rule:

- Plan ids must be the full 32-character `preapproval_plan_id`, not the short dashboard numeric id

### 2.3 LemonSqueezy vars

Live values:

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_FOCUS`
- Optional focus aliases still supported: `LEMONSQUEEZY_VARIANT_STANDARD`, `LEMONSQUEEZY_VARIANT_BUILDER`
- `LEMONSQUEEZY_VARIANT_MAX`

Testing / preview aliases:

- `LEMONSQUEEZY_API_KEY_TESTING`
- `LEMONSQUEEZY_API_KEY_PRUEBA`
- `LEMONSQUEEZY_TESTING_API_KEY`
- `LEMONSQUEEZY_API_KEY_TESTING_ACCOUNT`
- `LEMONSQUEEZY_STORE_ID_TESTING`
- `LEMONSQUEEZY_STORE_ID_PRUEBA`
- `LEMONSQUEEZY_TESTING_STORE_ID`
- `LEMONSQUEEZY_STORE_ID_TESTING_ACCOUNT`
- `LEMONSQUEEZY_VARIANT_FOCUS_TESTING`
- `LEMONSQUEEZY_VARIANT_FOCUS_PRUEBA`
- `LEMONSQUEEZY_FOCUS_VARIANT_TESTING`
- `LEMONSQUEEZY_FOCUS_VARIANT_TESTING_ACCOUNT`
- `LEMONSQUEEZY_VARIANT_STANDARD_TESTING`
- `LEMONSQUEEZY_VARIANT_BUILDER_TESTING`
- `LEMONSQUEEZY_VARIANT_MAX_TESTING`
- `LEMONSQUEEZY_VARIANT_MAX_PRUEBA`
- `LEMONSQUEEZY_MAX_VARIANT_TESTING`
- `LEMONSQUEEZY_MAX_VARIANT_TESTING_ACCOUNT`

Validation rule:

- The selected `STORE_ID` and `VARIANT_*` values must belong to the same LemonSqueezy account

## 3. Supabase Edge Function secrets

Set these in Supabase for the project that receives billing webhooks.

### 3.1 MercadoPago webhook function secrets

Required live secrets:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_PLAN_FOCUS_ID`
- `MERCADOPAGO_PLAN_MAX_ID`

Optional testing aliases supported:

- `MERCADOPAGO_ACCESS_TOKEN_PRUEBA`
- `MERCADOPAGO_ACCESS_TOKEN_TESTING`
- `MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT`
- `MERCADOPAGO_WEBHOOK_SECRET_PRUEBA`
- `MERCADOPAGO_WEBHOOK_SECRET_TESTING_ACCOUNT`
- `MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA`
- `MERCADOPAGO_FOCUS_ID_TESTING`
- `MERCADOPAGO_PLAN_FOCUS_ID_TESTING`
- `MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT`
- `MERCADOPAGO_PLAN_MAX_ID_PRUEBA`
- `MERCADOPAGO_MAX_ID_TESTING`
- `MERCADOPAGO_PLAN_MAX_ID_TESTING`
- `MERCADOPAGO_MAX_ID_TESTING_ACCOUNT`

### 3.2 LemonSqueezy webhook function secrets

Required live secrets:

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_VARIANT_FOCUS` and/or supported focus aliases
- `LEMONSQUEEZY_VARIANT_MAX`

Optional testing aliases supported:

- `LEMONSQUEEZY_API_KEY_TESTING`
- `LEMONSQUEEZY_API_KEY_PRUEBA`
- `LEMONSQUEEZY_TESTING_API_KEY`
- `LEMONSQUEEZY_API_KEY_TESTING_ACCOUNT`
- `LEMONSQUEEZY_STORE_ID_TESTING`
- `LEMONSQUEEZY_STORE_ID_PRUEBA`
- `LEMONSQUEEZY_TESTING_STORE_ID`
- `LEMONSQUEEZY_STORE_ID_TESTING_ACCOUNT`
- `LEMONSQUEEZY_WEBHOOK_SECRET_TESTING`
- `LEMONSQUEEZY_WEBHOOK_SECRET_PRUEBA`
- `LEMONSQUEEZY_WEBHOOK_SECRET_TESTING_ACCOUNT`
- All testing variant aliases listed in the Vercel section above

### 3.3 Supabase database state

Before launch, confirm the billing primitives exist in the target project:

- `billing_subscriptions`
- `payments`
- `sync_profile_subscription_from_billing(uuid)`
- `reconcile_my_billing_subscriptions()`

## 4. Provider dashboard configuration

### 4.1 MercadoPago

Confirm:

- Focus and Max subscription plans exist in the correct MercadoPago account
- Each plan id in Vercel and Supabase matches the intended Focus or Max product
- The webhook URL points at `https://<supabase-project>.supabase.co/functions/v1/mercado-pago-webhook`
- The webhook secret configured in MercadoPago matches the secret stored in Supabase
- The allowed return domain includes the deployed Leyendo app origin

Expected Leyendo return URL shape:

- `https://<app-origin>/account?plan=focus&payment=success&provider=mercadopago`
- `https://<app-origin>/account?plan=max&payment=success&provider=mercadopago`

### 4.2 LemonSqueezy

Confirm:

- Focus and Max variants exist in the correct store
- The store id and variant ids belong to the same LemonSqueezy account
- The webhook URL points at `https://<supabase-project>.supabase.co/functions/v1/lemonsqueezy-webhook`
- The webhook secret configured in LemonSqueezy matches the secret stored in Supabase
- The deployed Leyendo app origin is permitted for hosted checkout redirects

Expected Leyendo return URL shape:

- `https://<app-origin>/account?plan=focus&payment=success&provider=lemonsqueezy`
- `https://<app-origin>/account?plan=max&payment=success&provider=lemonsqueezy`

## 5. Preview-mode smoke test

Run this before any live switch.

1. Deploy a Vercel Preview build with testing provider credentials configured.
2. Verify `/pricing` renders correctly in both light and dark themes.
3. Start a Focus checkout while signed in.
4. Confirm MercadoPago preview returns to `/account?...provider=mercadopago`.
5. Confirm LemonSqueezy preview returns to `/account?...provider=lemonsqueezy`.
6. On `/account`, verify the pending state appears if the webhook has not completed yet.
7. Wait for automatic recovery to link the plan, or click `Resync payment`.
8. Confirm the account shows `Subscription linked` and the paid tier becomes active.
9. Confirm a row appears in `billing_subscriptions` with the expected provider, tier, and status.
10. Confirm a row appears in `payments` after the first successful recurring invoice or authorized payment event.

## 6. Production switch checklist

Perform these steps in order.

1. Keep preview aliases populated so preview deployments remain safe.
2. Fill in the live provider env vars and Supabase secrets.
3. Re-check provider dashboard webhook URLs and secrets.
4. Re-check that live MercadoPago plan ids are full 32-character preapproval ids.
5. Re-check that live LemonSqueezy store and variants belong to the same live account.
6. Deploy production.
7. Run `pnpm build` locally or in CI against the production config before final sign-off.
8. Complete one real low-risk Focus purchase and one Max purchase only if your operational policy allows it.
9. Confirm both purchases land in `billing_subscriptions`, sync into `profiles.plan_tier`, and can be recovered from `/account` without support intervention.

## 7. Failure handling checklist

If a payment appears approved at the provider but the user still sees Basic Reader:

1. Confirm the user is signed into the same Leyendo account that started checkout.
2. Open `/account` on that account and click `Resync payment`.
3. Check Supabase logs for the relevant Edge Function.
4. Check whether `billing_subscriptions` has a row for that provider and email.
5. Check whether `profiles.plan_tier` and `profiles.subscription_status` were updated.
6. For MercadoPago, verify `external_reference` matched the Leyendo `user_id`.
7. For LemonSqueezy, verify `checkout_data.custom.user_id` was sent and the webhook carried `meta.custom_data.user_id`.
8. If webhook delivery failed, replay the webhook from the provider dashboard.
9. If provider data exists but profile state is stale, run the reconciliation path and confirm `sync_profile_subscription_from_billing` succeeds.

## 8. Final validation commands

Recommended before merging or deploying:

```bash
pnpm vitest run tests/unit/lemonsqueezy-checkout-route.test.ts tests/component/account-panel.test.tsx tests/component/pricing-page-content.test.tsx
pnpm build
```

If UI verification is part of the release gate, also run the relevant Playwright or manual browser flow against `/pricing` and `/account` in both preview and production environments.
