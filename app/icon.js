import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3a2418",
          borderRadius: 14
        }}
      >
        <svg width="52" height="52" viewBox="0 0 48 48">
          <path
            d="M24 9.5c-8.4 0-13 6.2-13 13.6V38h6.4V23.8c0-4.9 2.4-8 6.6-8s6.6 3.1 6.6 8V38H37V23.1c0-7.4-4.6-13.6-13-13.6z"
            fill="#c69a4a"
          />
          <path d="M24 12.2l2.1 3.4-2.1 3.4-2.1-3.4z" fill="#fbf7ef" />
        </svg>
      </div>
    ),
    size
  );
}
