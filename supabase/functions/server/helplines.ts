// Crisis helplines. VERIFY every number on the official site before submitting.
export interface Helpline {
  country: string;
  name: string;
  phone?: string;
  url: string;
}

const HELPLINES: Record<string, Helpline> = {
  IN: { country: "IN", name: "Tele-MANAS", phone: "14416", url: "https://telemanas.mohfw.gov.in" },
  US: { country: "US", name: "988 Suicide & Crisis Lifeline", phone: "988", url: "https://988lifeline.org" },
  GB: { country: "GB", name: "Samaritans", phone: "116 123", url: "https://www.samaritans.org" },
};

const DEFAULT_HELPLINE: Helpline = {
  country: "default",
  name: "Find a Helpline",
  url: "https://findahelpline.com",
};

export function helplineFor(country: unknown): Helpline {
  const code = typeof country === "string" ? country.trim().toUpperCase() : "";
  return HELPLINES[code] ?? DEFAULT_HELPLINE;
}
