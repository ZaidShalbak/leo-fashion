import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// apple-icon only accepts .jpg/.jpeg/.png (see app-icons.md), not .svg like
// icon.svg — code-generated via ImageResponse instead, redrawing the same
// mark as absolutely-positioned divs (Satori, ImageResponse's renderer,
// supports a constrained CSS subset — no arbitrary <svg>).
export default function AppleIcon() {
  const white = "#fff";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 22, top: 65, width: 12, height: 54, background: white }} />
        <div style={{ position: "absolute", left: 22, top: 108, width: 37, height: 11, background: white }} />
        <div style={{ position: "absolute", left: 59, top: 65, width: 36, height: 11, background: white }} />
        <div style={{ position: "absolute", left: 59, top: 87, width: 36, height: 11, background: white }} />
        <div style={{ position: "absolute", left: 59, top: 108, width: 36, height: 11, background: white }} />
        <div
          style={{
            position: "absolute",
            left: 86,
            top: 54,
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: `11px solid ${white}`,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
