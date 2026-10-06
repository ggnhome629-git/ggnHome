import { useCallback, useState } from "react";

const KEY = "flatmateBookmarks";

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch (e) {
    return new Set();
  }
}

/** Saved flatmate listings, kept in this browser. */
export default function useFlatmateBookmarks() {
  const [saved, setSaved] = useState(read);
  const toggle = useCallback((id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch (e) {
        // storage unavailable — saves last for this visit only
      }
      return next;
    });
  }, []);
  return [saved, toggle];
}
