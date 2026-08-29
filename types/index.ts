export interface ProfileResponse {
  profile: {
    name: string;
    headline: string;
    location: string;
    about: string;
    profileImage: string | null;
    backgroundImage: string | null;
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications: CertificationItem[];
  languages: string[];
  featured: FeaturedItem[];
  services: string[];
  errors?: ErrorItem[];
}

export interface ExperienceItem {
  title: string;
  companyName: string;
  location: string;
  description: string;
  timePeriod: {
    startDate: string;
    endDate: string;
  };
}

export interface EducationItem {
  schoolName: string;
  degreeName: string;
  fieldOfStudy: string;
  timePeriod: {
    startDate: string;
    endDate: string;
  };
}

export interface CertificationItem {
  name: string;
  authority: string;
  timePeriod: {
    startDate: string;
    endDate: string;
  } | null;
}

export interface FeaturedItem {
  title: string;
  url: string | null;
  description: string;
}

export interface ErrorItem {
  field: string;
  reason: string;
}
