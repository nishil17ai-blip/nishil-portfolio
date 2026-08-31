import raw from "../../content/profile.json";

export interface Job {
  company: string;
  title: string;
  location: string;
  start: string;
  end: string | null;
  endLabel: string;
  summary: string;
  paragraphs: string[];
  stack: string[];
}

export interface Project {
  id: string;
  name: string;
  subtitle: string;
  context: string;
  proprietary: boolean;
  blurb: string;
  points: string[];
  stack: string[];
  note: string;
}

export interface Profile {
  identity: {
    name: string;
    role: string;
    location: string;
    email: string;
    links: { linkedin: string; github: string; resume: string };
  };
  hero: { line1: string; line2: string; standfirst: string; status: string };
  experience: Job[];
  work: Project[];
  skills: { group: string; items: string[] }[];
  publications: { title: string; venue: string; kind: string; url: string }[];
  education: {
    school: string;
    degree: string;
    location: string;
    years: string;
    detail: string;
  };
  assistant: { suggestions: string[]; refusalMessage: string };
}

export const profile = raw as unknown as Profile;

/** Links still carrying an UPDATE: marker shouldn't render as live links. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith("UPDATE:");
}