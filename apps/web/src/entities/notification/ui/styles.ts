/*
 * 이 조각들은 여러 파일이 나눠 쓰므로 여기 따로 둡니다.
 *
 * 컴포넌트와 같은 파일에 두면 Fast Refresh가 그 파일을 통째로 다시 불러옵니다 —
 * styled로 만든 것은 컴포넌트로 세어지지 않기 때문입니다. 모양만 있는 파일과
 * 컴포넌트만 있는 파일로 갈라 둡니다.
 */
import styled from "@emotion/styled";
import { palette, theme } from "@tlitodos/ui";

export const AlarmList = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
`;

export const AlarmRow = styled.button<{ unread: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.sm};
  background: ${({ unread }) => (unread ? palette.white : palette.gray100)};
  padding: 12px 16px;
  text-align: left;
  color: ${theme.colors.ink};
  > div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  strong {
    font-size: ${theme.text.s};
    font-weight: 400;
    overflow-wrap: anywhere;
  }
  small {
    color: ${theme.colors.muted};
    font-size: ${theme.text.xs};
    overflow-wrap: anywhere;
  }
`;

export const AlarmAvatar = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: ${palette.gray100};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
/** 안 읽은 것이 남아 있음을 알리는 빨간 점. 목록 줄과 갈래 칩이 같은 점을 씁니다. */

/** 안 읽은 것이 남아 있음을 알리는 빨간 점. 목록 줄과 갈래 칩이 같은 점을 씁니다. */

/** 안 읽은 것이 남아 있음을 알리는 빨간 점. 목록 줄과 갈래 칩이 같은 점을 씁니다. */
export const UnreadDot = styled.i`
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.colors.red};
`;
/** 목록 줄에서는 줄 오른쪽 끝으로 밀어 둡니다. */

/** 목록 줄에서는 줄 오른쪽 끝으로 밀어 둡니다. */

/** 목록 줄에서는 줄 오른쪽 끝으로 밀어 둡니다. */
export const AlarmDot = styled(UnreadDot)`
  margin-left: auto;
`;

export const AlarmEmpty = styled.p`
  margin: 0;
  color: ${theme.colors.muted};
`;

/** 자기소개 글자 수. 디자인의 카운터가 0/30입니다. */
