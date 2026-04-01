import { ImageResponse } from "next/og";

import { siteDescription, siteName, siteTagline, siteUrl } from "@/lib/site";

const palette = {
  canvas: "#f6efe6",
  ink: "#162033",
  muted: "#5d6983",
  sky: "#5f77d7",
  amber: "#d58a53",
  white: "#f8f6f2",
};

type ImageDimensions = {
  width: number;
  height: number;
};

export function LeyendoMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.28,
        background: palette.ink,
        boxShadow: "0 28px 80px rgba(22, 32, 51, 0.18)",
      }}
    >
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 24H32C39.732 24 46 30.268 46 38V67.5C41.437 63.833 35.802 62 28.5 62H20V24Z"
          stroke={palette.white}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M76 24H64C56.268 24 50 30.268 50 38V67.5C54.563 63.833 60.198 62 67.5 62H76V24Z"
          stroke={palette.white}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 34V68"
          stroke={palette.sky}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M56 48H78"
          stroke={palette.amber}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M67 37L80 48L67 59"
          stroke={palette.amber}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 18px",
        borderRadius: 9999,
        border: "1px solid rgba(22, 32, 51, 0.12)",
        background: "rgba(255, 255, 255, 0.72)",
        color: palette.muted,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </div>
  );
}

export function createAppleIconResponse(size: ImageDimensions) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #fcf7ef 0%, #f2e8da 100%)",
      }}
    >
      <LeyendoMark size={Math.round(size.width * 0.82)} />
    </div>,
    size,
  );
}

export function createSocialImageResponse(size: ImageDimensions) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: palette.canvas,
        color: palette.ink,
        padding: "56px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 12%, rgba(95, 119, 215, 0.16), transparent 28%), radial-gradient(circle at 84% 82%, rgba(213, 138, 83, 0.12), transparent 26%), linear-gradient(180deg, rgba(255, 252, 247, 0.96) 0%, rgba(243, 236, 223, 0.94) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 36,
          border: "1px solid rgba(22, 32, 51, 0.08)",
          background: "rgba(255, 255, 255, 0.28)",
          padding: "44px 46px",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "68%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex" }}>
              <MetaPill label={siteTagline} />
            </div>
            <div
              style={{
                marginTop: 34,
                fontSize: 86,
                lineHeight: 0.94,
                fontWeight: 700,
                letterSpacing: "-0.05em",
              }}
            >
              {siteName}
            </div>
            <div
              style={{
                marginTop: 18,
                maxWidth: "92%",
                fontSize: 38,
                lineHeight: 1.2,
                fontWeight: 600,
              }}
            >
              Read dense PDFs and documents with more control.
            </div>
            <div
              style={{
                marginTop: 18,
                maxWidth: "92%",
                fontSize: 26,
                lineHeight: 1.4,
                color: palette.muted,
              }}
            >
              {siteDescription}
            </div>
          </div>
          <div
            style={{
              width: "32%",
              height: "100%",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              paddingTop: 6,
            }}
          >
            <LeyendoMark size={232} />
          </div>
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            <MetaPill label="PDF" />
            <MetaPill label="DOCX" />
            <MetaPill label="RTF" />
            <MetaPill label="Markdown" />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              color: palette.muted,
            }}
          >
            {siteUrl.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
