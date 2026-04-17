import { assertEquals } from "jsr:@std/assert@1";

import {
  buildMercadoPagoSignatureManifest,
  resolveMercadoPagoWebhookResourceId,
} from "./shared.ts";

Deno.test("buildMercadoPagoSignatureManifest uses only query data.id", () => {
  const manifest = buildMercadoPagoSignatureManifest({
    requestId: "req-123",
    requestUrl:
      "https://example.com/functions/v1/mercado-pago-webhook?topic=subscription_preapproval",
    timestamp: "1704908010",
  });

  assertEquals(manifest, "request-id:req-123;ts:1704908010;");
});

Deno.test(
  "buildMercadoPagoSignatureManifest lowercases alphanumeric query data.id",
  () => {
    const manifest = buildMercadoPagoSignatureManifest({
      requestId: "req-123",
      requestUrl:
        "https://example.com/functions/v1/mercado-pago-webhook?data.id=ABC123XYZ",
      timestamp: "1704908010",
    });

    assertEquals(manifest, "id:abc123xyz;request-id:req-123;ts:1704908010;");
  },
);

Deno.test(
  "resolveMercadoPagoWebhookResourceId prefers URL ids over body ids",
  () => {
    const resourceId = resolveMercadoPagoWebhookResourceId({
      bodyDataId: "body-999",
      requestUrl:
        "https://example.com/functions/v1/mercado-pago-webhook?data.id=query-123",
    });

    assertEquals(resourceId, "query-123");
  },
);
