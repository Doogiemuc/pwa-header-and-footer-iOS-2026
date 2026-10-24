/** The two pages of this POC: index.html = "page scrolls", inner.html = "rect scrolls inside". */
export type ViewFile = 'index.html' | 'inner.html'

/** URL of the other page with the current settings (?h=, ?bar=, ...) carried over. */
export function viewHref(file: ViewFile): string {
  const url = new URL(file, location.href)
  url.search = location.search
  return url.href
}
