import { Node } from "./user";

export type ScanningFilter =
  | "followers"
  | "nonFollowers"
  | "newNonFollowers"
  | "verified"
  | "private";

interface UnfollowLogEntry {
  readonly user: Node;
  readonly unfollowedSuccessfully: boolean;
}

export type State =
  | {
      readonly status: "initial";
      readonly searchTerm?: never;
      readonly percentage?: never;
      readonly results?: never;
      readonly selectedResults?: never;
      readonly filters?: never;
      readonly unfollowLog?: never;
    }
  | {
      readonly status: "scanning";
      readonly searchTerm: string;
      readonly percentage: number;
      readonly results: readonly Node[];
      readonly selectedResults: readonly Node[];
      readonly filters: ScanningFilter[];
      readonly unfollowLog?: never;
    }
  | {
      readonly status: "unfollowing";
      readonly searchTerm: string;
      readonly percentage: number;
      readonly results: readonly Node[];
      readonly selectedResults: readonly Node[];
      readonly filters?: never;
      readonly unfollowLog: readonly UnfollowLogEntry[];
    };
