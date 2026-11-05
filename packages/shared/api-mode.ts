export function isLiveApiMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "live";
}
