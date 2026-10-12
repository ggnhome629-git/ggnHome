import React from "react";
import { BedDouble, Building2, Plus } from "lucide-react";

/**
 * Shared action icon: a building with a plus for posting property, or a bed
 * with a plus for listing a room. Keeps the meaning consistent on desktop,
 * mobile web, and the Capacitor webview.
 */
function PostActionIcon({ kind = "property", size = 20, color = "currentColor", strokeWidth = 2, style, ...props }) {
  const BaseIcon = kind === "room" ? BedDouble : Building2;
  const badgeSize = Math.max(11, Math.round(size * 0.52));

  return (
    <span
      {...props}
      aria-hidden={props["aria-hidden"] ?? true}
      style={{
        position: "relative",
        display: "inline-flex",
        flex: "0 0 auto",
        width: size + 2,
        height: size + 2,
        color,
        verticalAlign: "middle",
        ...style,
      }}
    >
      <BaseIcon
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -3,
          bottom: -3,
          width: badgeSize,
          height: badgeSize,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: "#00A79D",
          color: "#fff",
          border: "1.5px solid #fff",
          boxSizing: "border-box",
        }}
      >
        <Plus size={Math.max(7, Math.round(badgeSize * 0.68))} strokeWidth={3} />
      </span>
    </span>
  );
}

export function PostPropertyIcon(props) {
  return <PostActionIcon {...props} kind="property" />;
}

export function PostRoomIcon(props) {
  return <PostActionIcon {...props} kind="room" />;
}

export default PostActionIcon;
