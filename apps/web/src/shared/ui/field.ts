/*
 * 프로필 화면의 "라벨 + 회색 칸" 한 줄을 이루는 조각들입니다.
 *
 * 이름·자기소개를 고치는 자리와 글꼴을 고르는 자리가 같은 모양을 나눠 쓰므로
 * 두 기능보다 아래인 여기에 둡니다 — 같은 층끼리는 서로를 가져다 쓰지 않습니다.
 */
import styled from "@emotion/styled";
import { theme } from "@tlitodos/ui";

export const FieldBlock = styled.div`
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 0 20px;
`;

export const FieldLabel = styled.small`
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
`;

export const FieldRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;
/** 닫힌 줄과 편집 중인 줄이 같은 너비여야 눌렀을 때 칸이 흔들리지 않습니다. */

/** 닫힌 줄과 편집 중인 줄이 같은 너비여야 눌렀을 때 칸이 흔들리지 않습니다. */
export const FIELD_WIDTH = "min(340px, 100%)";

export const FieldBox = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: ${FIELD_WIDTH};
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  text-align: left;
  color: ${theme.colors.ink};
  font-size: ${theme.text.s};
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    color: inherit;
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
`;
/**
 * 칸을 채우는 값입니다.
 *
 * `FieldBox > span`으로 늘리면 글자 수 카운터까지 같이 늘어나 칸을 반씩 나눠
 * 가집니다. 늘어나는 쪽만 따로 두고, 카운터는 글자 폭만 차지하게 둡니다.
 */

/**
 * 칸을 채우는 값입니다.
 *
 * `FieldBox > span`으로 늘리면 글자 수 카운터까지 같이 늘어나 칸을 반씩 나눠
 * 가집니다. 늘어나는 쪽만 따로 두고, 카운터는 글자 폭만 차지하게 둡니다.
 */
export const FieldValue = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  /* 아직 입력하지 않은 값은 자리표시자처럼 보이게 둡니다. */
  &[data-empty="true"] {
    color: ${theme.colors.muted};
  }
`;

export const FieldCounter = styled.span`
  flex: none;
  color: ${theme.colors.muted};
`;

export const FieldChevron = styled.img`
  flex: none;
  width: 20px;
  height: 20px;
  transform: rotate(90deg);
`;

export const FieldActions = styled.div`
  display: flex;
  gap: 6px;
  flex: none;
`;
