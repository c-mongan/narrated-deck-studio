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

export function inspectDocx(pathname: string): string {
  const archive = new AdmZip(pathname);
  const entry = archive.getEntry("word/document.xml");
  return entry ? decodeXml(entry.getData().toString("utf8")).slice(0, 1200) : "";
}
