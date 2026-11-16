"use client";

import { useEffect, useState } from "react";

/**
 * A date and time in the viewer's own time zone. The server does not know
 * it, so the first render shows the date in UTC and the browser replaces it.
 */
export function LocalTime({ ms }: { ms: number }) {
  const iso = new Date(ms).toISOString();
  const [text, setText] = useState(`${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the viewer's time zone is known only in the browser
    setText(new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
  }, [ms]);
  return <time dateTime={iso}>{text}</time>;
}
