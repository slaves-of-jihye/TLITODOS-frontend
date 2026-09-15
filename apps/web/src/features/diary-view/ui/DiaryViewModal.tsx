import styled from "@emotion/styled";
import type { Diary } from "@/shared/api";
import { DiaryDivider, DiaryPhoto, diaryDate, useDiary } from "@/entities/diary";
import { useAssetObjectUrl } from "@/shared/api";
import { errorMessage, formatLongKoreanDate } from "@/shared/lib";
import { DiaryBadge, ErrorText, Modal, Skeleton, SrOnly, theme } from "@/shared/ui";

/**
 * 일기 보기 시트.
 *
 * 달력에서 열든 알림에서 열든 같은 시트입니다. 달력 쪽은 이미 받아 둔 일기를
 * 그대로 넘기고, 알림 쪽은 목록에 `diaryId`만 있으므로 열 때 받아 옵니다 — 둘 중
 * 하나만 넘깁니다. 볼 수 없는 일기면 서버가 막고 그 메시지를 그대로 보여 줍니다.
 */
export const DiaryViewModal = ({
  diary,
  diaryId,
  author,
  onClose,
}: {
  /** 손에 이미 있는 일기. */
  diary?: Diary | null;
  /** 아직 내용이 없을 때 받아 올 id. */
  diaryId?: number | null;
  author: string;
  onClose: () => void;
}) => {
  const fetched = useDiary(diary ? null : (diaryId ?? null));
  const shown = diary ?? fetched.data ?? null;
  // 일기 사진도 `/uploads`라 토큰이 필요합니다.
  const image = useAssetObjectUrl(shown?.imageUrl ?? null);
  return (
    <Modal open sheet onClose={onClose} aria-label="일기">
      <DiaryPreview>
        <DiaryPreviewTitle>{author}님의 일기</DiaryPreviewTitle>
        {fetched.error ? (
          <ErrorText>{errorMessage(fetched.error)}</ErrorText>
        ) : !shown ? (
          <DiarySkeleton />
        ) : (
          <>
            <DiaryBadge emotion={shown.emotion} nickname={author} date={formatLongKoreanDate(diaryDate(shown) ?? "")} />
            {shown.imageUrl ? (
              <>
                {image ? <DiaryPhoto src={image} alt="" /> : null}
                {/* 사진 칸과 본문 칸을 가릅니다. */}
                <DiaryDivider aria-hidden />
              </>
            ) : null}
            <p>{shown.content}</p>
          </>
        )}
      </DiaryPreview>
    </Modal>
  );
};

const DiarySkeleton = () => (
  <DiaryLines role="status">
    <SrOnly>일기를 불러오는 중</SrOnly>
    <Skeleton width="140px" height="36px" radius={theme.radius.pill} />
    {["100%", "92%", "76%"].map(width => (
      <Skeleton key={width} width={width} height="20px" />
    ))}
  </DiaryLines>
);

const DiaryLines = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
`;

const DiaryPreview = styled.div`
  display: grid;
  gap: 20px;
  justify-items: start;
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const DiaryPreviewTitle = styled.p`
  margin: 0;
  width: 100%;
  text-align: center;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
`;
