import AdmZip from "adm-zip";

function decodeXml(value: string): string {
  return value
    .replace(/<a:br\s*\/>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PowerPointInspection {
  slideCount: number;
  notesPresent: boolean;
  textPreview: string;
  hasMacros: boolean;
  hasMedia: boolean;
}

export interface PowerPointSlideContent {
  slide: number;
  text: string;
  notes: string;
  layout: string;
  chartCount: number;
}

export function inspectPowerPoint(pathname: string): PowerPointInspection {
  const archive = new AdmZip(pathname);
  const entries = archive.getEntries().map((entry) => entry.entryName);
  const slideNames = entries.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const noteNames = entries.filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name));
  const text: string[] = [];
  for (const name of [...slideNames, ...noteNames].slice(0, 80)) {
    const entry = archive.getEntry(name);
    if (entry) text.push(decodeXml(entry.getData().toString("utf8")));
  }
  return {
    slideCount: slideNames.length,
    notesPresent: noteNames.length > 0 && text.slice(slideNames.length).some(Boolean),
    textPreview: text.join(" ").slice(0, 1200),
    hasMacros: entries.some((name) => /vbaProject\.bin$/i.test(name)),
    hasMedia: entries.some((name) => name.startsWith("ppt/media/")),
  };
}

export function extractSlideTexts(pathname: string): Array<{ slide: number; text: string }> {
  const archive = new AdmZip(pathname);
  return archive.getEntries()
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName))
    .sort((a, b) => Number(a.entryName.match(/\d+/)?.[0]) - Number(b.entryName.match(/\d+/)?.[0]))
    .map((entry, index) => ({ slide: index + 1, text: decodeXml(entry.getData().toString("utf8")) }));
}

function numberedEntries(archive: AdmZip, pattern: RegExp): Array<{ number: number; name: string }> {
  return archive.getEntries()
    .map((entry) => ({ entry, match: entry.entryName.match(pattern) }))
    .filter((value): value is { entry: AdmZip.IZipEntry; match: RegExpMatchArray } => Boolean(value.match))
    .map(({ entry, match }) => ({ number: Number(match[1]), name: entry.entryName }))
    .sort((a, b) => a.number - b.number);
}

/** Extracts review-oriented slide content without executing macros or embedded objects. */
export function extractPowerPointSlideContent(pathname: string): PowerPointSlideContent[] {
  const archive = new AdmZip(pathname);
  const slides = numberedEntries(archive, /^ppt\/slides\/slide(\d+)\.xml$/);
  const notes = new Map(numberedEntries(archive, /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/).map(({ number, name }) => [number, decodeXml(archive.getEntry(name)?.getData().toString("utf8") ?? "")]));
  return slides.map(({ number, name }) => {
    const text = decodeXml(archive.getEntry(name)?.getData().toString("utf8") ?? "");
    const relationships = archive.getEntry(`ppt/slides/_rels/slide${number}.xml.rels`)?.getData().toString("utf8") ?? "";
    const layout = relationships.match(/Target="\.\.\/slideLayouts\/([^"/]+)"/)?.[1] ?? "unknown-layout";
    const chartCount = (relationships.match(/Target="\.\.\/charts\//g) ?? []).length;
    return { slide: number, text, notes: notes.get(number) ?? "", layout, chartCount };
  });
}

export function inspectDocx(pathname: string): string {
  const archive = new AdmZip(pathname);
  const entry = archive.getEntry("word/document.xml");
  return entry ? decodeXml(entry.getData().toString("utf8")).slice(0, 1200) : "";
}
