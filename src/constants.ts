import { ScanningFilter, State } from "./model/app";

export const INSTAGRAM_HOSTNAME = "www.instagram.com";

export const INITIAL_SCANNING_STATE: State = {
  status: "scanning",
  searchTerm: "",
  percentage: 0,
  results: [],
  selectedResults: [],
  filters: ["nonFollowers"],
};

export const FILTERS: ScanningFilter[] = [
  "followers",
  "nonFollowers",
  "newNonFollowers",
  "verified",
  "private",
];

export const FILTERS_NAMES: Record<ScanningFilter, string> = {
  followers: "Show Followers",
  newNonFollowers: "Show New Non Followers",
  nonFollowers: "Show Non Followers",
  verified: "Show Verified",
  private: "Show Private",
};
