/** 할 일 한 줄이 화면에서 차지하는 자리. 진짜 줄은 `packages/ui`의 `TodoRow`입니다. */
import styled from "@emotion/styled";
import { Skeleton, SrOnly, theme } from "@tlitodos/ui";
import { TodoList } from "./styles";

/**
 * 아직 오지 않은 할 일 한 줄.
 *
 * 진짜 줄과 같은 자리를 잡습니다 — 완료 동그라미 하나와 제목 한 줄. 도착했을 때
 * 아래 내용이 밀려 내려가지 않도록 여백까지 같게 둡니다.
 */
export const TodoRowSkeleton = ({ width = "70%", label }: { width?: string; label?: string }) => (
  <SkeletonRow>
    <Skeleton width="30px" height="30px" radius="50%" />
    <Skeleton width={width} height="20px" />
    {label ? <SrOnly>{label}</SrOnly> : null}
  </SkeletonRow>
);

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  @media (max-width: 600px) {
    padding: 8px 6px;
  }
`;

/** 줄마다 길이를 달리해, 자리표시가 표처럼 각지지 않게 합니다. */

/** 줄마다 길이를 달리해, 자리표시가 표처럼 각지지 않게 합니다. */
const SKELETON_ROW_WIDTHS = ["72%", "54%", "63%", "45%"];

/**
 * 아직 오지 않은 카테고리 한 칸.
 *
 * 이름표 자리와 할 일 몇 줄을 미리 놓습니다. 줄 수는 카테고리마다 달리 잡아,
 * 네 칸이 똑같은 모양으로 늘어서지 않게 합니다.
 */

/**
 * 아직 오지 않은 카테고리 한 칸.
 *
 * 이름표 자리와 할 일 몇 줄을 미리 놓습니다. 줄 수는 카테고리마다 달리 잡아,
 * 네 칸이 똑같은 모양으로 늘어서지 않게 합니다.
 */
export const TodoColumnSkeleton = ({ rows }: { rows: number }) => (
  <section>
    <Skeleton width="128px" height="41px" radius={theme.radius.pill} />
    <TodoList>
      {Array.from({ length: rows }, (_, index) => (
        <TodoRowSkeleton key={index} width={SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length]} />
      ))}
    </TodoList>
  </section>
);

/** 할 일 제목 글자 수. 디자인의 카운터가 0/40입니다. */
