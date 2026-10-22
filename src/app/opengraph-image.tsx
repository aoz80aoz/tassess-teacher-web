import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { S } from "@/lib/strings";

// The link preview (WhatsApp, X, Facebook…): the Hessati app icon on the
// brand blue. The icon's Arabic name is vector paths, so it renders exactly;
// no text is drawn here (the image renderer does not shape Arabic).

export const alt = S.seo.ogImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "src/app/icon.svg"));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;
  const mark = await readFile(join(process.cwd(), "public/brand/hessati-mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #2747a8 100%)",
        }}
      >
        {/* Soft marks in the corners, faded into the background. */}
        <img src={markSrc} alt="" width={420} height={368} style={{ position: "absolute", left: -90, top: -70, opacity: 0.07 }} />
        <img src={markSrc} alt="" width={420} height={368} style={{ position: "absolute", right: -100, bottom: -90, opacity: 0.07 }} />
        <div
          style={{
            display: "flex",
            padding: 14,
            borderRadius: 64,
            background: "rgba(255,255,255,0.14)",
            boxShadow: "0 30px 80px rgba(8,15,45,0.45)",
          }}
        >
          <img src={iconSrc} alt="" width={400} height={429} style={{ borderRadius: 52 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
