import styled from "@emotion/styled";
import type { Diary } from "@/shared/api";
import { DiaryDivider, DiaryPhoto, diaryDate, useDiary } from "@/entities/diary";
import { useAssetObjectUrl } from "@/shared/api";
import { errorMessage, formatLongKoreanDate } from "@/shared/lib";
import { DiaryBadge, ErrorText, Modal, Skeleton, SrOnly, hoverable, palette, theme } from "@/shared/ui";

/**
 * 일기 보기 시트.
 *
 * 달력에서 열든 알림에서 열든, 남의 것이든 내 것이든 같은 시트입니다. 달력 쪽은
 * 이미 받아 둔 일기를 그대로 넘기고, 알림 쪽은 목록에 `diaryId`만 있으므로 열 때
 * 받아 옵니다 — 둘 중 하나만 넘깁니다. 볼 수 없는 일기면 서버가 막고 그 메시지를
 * 그대로 보여 줍니다.
 *
 * 내 일기일 때만 `onEdit`이 넘어와 오른쪽 위에 `수정하기`가 섭니다. 예전에는 내
 * 일기를 누르면 곧바로 입력 폼이 떴는데, 그러면 다시 읽어 보려는 것과 고치려는
 * 것이 같은 동작이 되어 남이 보는 모습을 내가 볼 길이 없었습니다.
 */
export const DiaryViewModal = ({
  diary,
  diaryId,
  author,
  onEdit,
  onClose,
}: {
  /** 손에 이미 있는 일기. */
  diary?: Diary | null;
  /** 아직 내용이 없을 때 받아 올 id. */
  diaryId?: number | null;
  author: string;
  /** 내 일기일 때만 넘어옵니다. 넘기지 않으면 고칠 길이 없는 읽기 전용입니다. */
  onEdit?: () => void;
  onClose: () => void;
}) => {
  const fetched = useDiary(diary ? null : (diaryId ?? null));
  const shown = diary ?? fetched.data ?? null;
  // 일기 사진도 `/uploads`라 토큰이 필요합니다.
  const image = useAssetObjectUrl(shown?.imageUrl ?? null);
  return (
    <Modal open sheet onClose={onClose} aria-label="일기">
      <DiaryPreview>
        {/*
         * 제목은 시트 한가운데를 지키고, 수정은 오른쪽 위에 따로 섭니다.
         *
         * 같은 줄에 나란히 놓으면 제목이 버튼 폭만큼 왼쪽으로 밀려, 버튼이 있는
         * 내 일기와 없는 남의 일기가 서로 다른 자리에서 시작합니다.
         */}
        <DiaryPreviewHeader>
          <DiaryPreviewTitle>{author}님의 일기</DiaryPreviewTitle>
          {onEdit ? (
            <DiaryEditAction type="button" onClick={onEdit}>
              수정하기
            </DiaryEditAction>
          ) : null}
        </DiaryPreviewHeader>
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

const DiaryPreviewHeader = styled.div`
  position: relative;
  width: 100%;
`;

const DiaryPreviewTitle = styled.p`
  margin: 0;
  width: 100%;
  text-align: center;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
`;

const DiaryEditAction = styled.button`
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: ${theme.radius.pill};
  background: ${palette.gray200};
  padding: 8px 18px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  ${hoverable} {
    &:hover {
      background: ${palette.gray300};
    }
  }
  @media (max-width: 600px) {
    padding: 6px 14px;
  }
`;
