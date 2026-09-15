/**
 * 서버와 주고받는 것들의 공개 창구입니다.
 *
 * 전송 자체는 `packages/api-client`가, 서버 상태 훅은 `packages/hooks`가 들고
 * 있습니다. FSD에서는 위 레이어가 그 패키지들을 곧장 부르지 않고 이 자리를
 * 지나가게 합니다 — 도메인마다 필요한 것만 각 엔티티의 api 조각이 다시 좁혀 내보내고,
 * 어느 레이어가 무엇을 쓰는지 여기 한 곳에서 보입니다.
 */
export { ApiError, createApiClient } from "@tlitodos/api-client";
export type { ApiClient, ApiClientOptions } from "@tlitodos/api-client";
export { ApiProvider, useApi, queryKeys, useServerBusy } from "@tlitodos/hooks";
export * from "./assetUrl";
