export interface CandidateLinks {
  github?: string;
  portfolio?: string;
  behance?: string;
  linkedin?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: "developer" | "designer";
  title: string;
  avatar: string;
  shortBio: string;
  longBio: string;
  skills: string[];
  links: CandidateLinks;
  email: string;
}
