/**
 * 사용자에게 보여 줄 오류 한 줄.
 *
 * 서버가 준 메시지는 `ApiError`가 이미 `message`에 담아 옵니다. 그 밖의 것(네트워크
 * 끊김, 코드 오류)은 사람이 읽을 문장이 아니므로 자리를 대신할 말을 씁니다.
 * 화면마다 제각각 적던 같은 함수를 하나로 모았습니다.
 */
export const errorMessage = (error: unknown, fallback = "요청에 실패했습니다.") =>
  error instanceof Error ? error.message : fallback;
