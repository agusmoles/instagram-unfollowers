import { Node } from "./model/user";

export function assertUnreachable(_value: never): never {
  throw new Error("Statement should be unreachable");
}

export function sleep(ms: number): Promise<never> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return null;

  return parts.pop()?.split(";").shift() ?? null;
}

export function urlGenerator(nextCode?: string): string {
  const dsUserId = getCookie("ds_user_id");
  if (!nextCode) {
    // First url
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${dsUserId}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
  }
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${dsUserId}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

export function isNewUnfollower(
  prevOldIUResults: Node[],
  result: Node
): boolean {
  return (
    prevOldIUResults.some(
      (oldResult) => oldResult.id === result.id && oldResult.follows_viewer
    ) && !result.follows_viewer
  );
}

export function isNewFollower(prevOldIUResults: Node[], result: Node): boolean {
  return (
    prevOldIUResults.some(
      (oldResult) => oldResult.id === result.id && !oldResult.follows_viewer
    ) && result.follows_viewer
  );
}
