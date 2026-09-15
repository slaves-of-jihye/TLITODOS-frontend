import styled from "@emotion/styled";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Diary, DiaryCreateRequest, DiaryPatchRequest, UiVisibility } from "@/shared/api";
import { DiaryPhoto, useDeleteDiary, useSaveDiary } from "@/entities/diary";
import { useAssetObjectUrl } from "@/shared/api";
import { errorMessage, formatLongKoreanDate } from "@/shared/lib";
import {
  Button,
  ConfirmChoice,
  ConfirmMenu,
  ConfirmNote,
  ErrorText,
  HiddenFileInput,
  Skeleton,
  SrOnly,
  icons,
  theme,
} from "@/shared/ui";

/** 일기 이미지도 프로필 사진과 같은 5MB 기준으로 막습니다. */
const MAX_DIARY_IMAGE_BYTES = 5 * 1024 * 1024;

const EMOTIONS = ["😊", "🥳", "😌", "😢", "😤"];

export const DiaryForm = ({
  selectedDate,
  existing,
  userName,
}: {
  selectedDate: string;
  existing?: Diary;
  userName?: string;
}) => {
  const navigate = useNavigate();
  const save = useSaveDiary();
  const remove = useDeleteDiary();
  const [confirming, setConfirming] = useState(false);
  const dismissConfirm = useCallback(() => setConfirming(false), []);
  const [emotion, setEmotion] = useState(existing?.emotion ?? "");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [content, setContent] = useState(existing?.content ?? "");
  // 서버에서 GROUP(일부 공개)은 보류라 작성자만 보게 됩니다. 화면은 공개/비밀 두 갈래만 씁니다.
  const [visibility, setVisibility] = useState<UiVisibility>(existing?.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE");
  const [image, setImage] = useState<File | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  /*
   * 고른 사진은 브라우저 안에서 바로 보여 줍니다. 올리기 전이라 주소가 없어
   * 파일에서 임시 주소를 만들고, 다른 사진을 고르거나 화면을 떠날 때 거둡니다.
   */
  const picked = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked);
    },
    [picked],
  );
  // 이미 올린 사진은 `/uploads`라 토큰을 달아 받아 옵니다.
  const saved = useAssetObjectUrl(existing?.imageUrl ?? null);
  const preview = picked ?? saved;
  const submit = async () => {
    setError("");
    try {
      let body: DiaryCreateRequest | DiaryPatchRequest | FormData;
      // 사진을 새로 고른 때만 multipart입니다 — 새로 쓸 때도, 고쳐 쓸 때도 같습니다.
      if (image) {
        body = new FormData();
        body.append("date", selectedDate);
        body.append("content", content);
        body.append("visibility", visibility);
        if (emotion) body.append("emotion", emotion);
        body.append("image", image);
      } else {
        body = { date: selectedDate, content, emotion: emotion || null, visibility };
      }
      await save.mutateAsync({ id: existing?.diaryId, body });
      navigate("/");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const discard = async () => {
    if (!existing) return;
    setError("");
    try {
      await remove.mutateAsync(existing.diaryId);
      navigate("/");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setConfirming(false);
    }
  };
  return (
    <>
      <DiaryTopBar>
        <DiaryTextAction onClick={() => navigate("/")}>취소</DiaryTextAction>
        <h1>일기</h1>
        <DiaryTextAction disabled={!content.trim() || save.isPending} onClick={submit}>
          {save.isPending ? "저장 중" : "완료"}
        </DiaryTextAction>
      </DiaryTopBar>
      <DiaryBody>
        <DiaryMain>
          <DiaryDate>{formatLongKoreanDate(selectedDate)}</DiaryDate>
          <textarea
            value={content}
            maxLength={1000}
            onChange={event => setContent(event.target.value)}
            placeholder={`${userName || "오늘"}님의 오늘은 어떤 하루였나요? 오늘 하루를 기록해보세요`}
          />
        </DiaryMain>
        <DiaryRail>
          <div>
            <DiaryRailLabel>
              그룹 안 공개 범위 설정하기 <b aria-hidden>*</b>
            </DiaryRailLabel>
            <DiaryPillRow>
              <Button variant={visibility === "PUBLIC" ? "primary" : "soft"} onClick={() => setVisibility("PUBLIC")}>
                전체 공개
              </Button>
              {/* 일부 공개는 MVP 범위 밖입니다. 자리만 두고 막아 둡니다. */}
              <Button disabled title="일부 공개는 MVP 이후 제공됩니다.">
                일부 공개
              </Button>
              <Button variant={visibility === "PRIVATE" ? "primary" : "soft"} onClick={() => setVisibility("PRIVATE")}>
                비밀
              </Button>
            </DiaryPillRow>
          </div>
          <DiaryRailRow>
            <div>
              <DiaryRailLabel as="span">오늘의 감정 선택하기</DiaryRailLabel>
              <DiaryIconAction
                aria-label="오늘의 감정 선택하기"
                aria-expanded={emotionOpen}
                onClick={() => setEmotionOpen(!emotionOpen)}
              >
                {emotion ? <span>{emotion}</span> : <img src={icons.emojiAdd} alt="" aria-hidden />}
              </DiaryIconAction>
              {emotionOpen ? (
                <EmotionRow role="group" aria-label="감정">
                  {["", ...EMOTIONS].map(item => (
                    <button
                      type="button"
                      key={item || "none"}
                      data-selected={emotion === item}
                      onClick={() => {
                        setEmotion(item);
                        setEmotionOpen(false);
                      }}
                    >
                      {item || "없음"}
                    </button>
                  ))}
                </EmotionRow>
              ) : null}
            </div>
            <div>
              <DiaryRailLabel as="span">{preview ? "이미지 바꾸기" : "이미지 첨부하기"}</DiaryRailLabel>
              {/* 사진이 붙어 있으면 그 사진이 곧 버튼입니다. 눌러 다른 사진으로 바꿉니다. */}
              {preview ? (
                <DiaryPhotoButton aria-label="이미지 바꾸기" onClick={() => imageInput.current?.click()}>
                  <DiaryPhoto src={preview} alt="" />
                </DiaryPhotoButton>
              ) : (
                <DiaryIconAction aria-label="이미지 첨부하기" onClick={() => imageInput.current?.click()}>
                  <img src={icons.imageBox} alt="" aria-hidden />
                </DiaryIconAction>
              )}
              <HiddenFileInput
                ref={imageInput}
                type="file"
                accept="image/*"
                onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setError("이미지 파일만 올릴 수 있습니다.");
                    return;
                  }
                  if (file.size > MAX_DIARY_IMAGE_BYTES) {
                    setError("이미지는 5MB까지 올릴 수 있습니다.");
                    return;
                  }
                  setError("");
                  setImage(file);
                }}
              />
              {image ? <DiaryAttachment>{image.name}</DiaryAttachment> : null}
            </div>
          </DiaryRailRow>
          {existing ? (
            <ConfirmMenu
              open={confirming}
              label="일기 삭제"
              above
              onDismiss={dismissConfirm}
              trigger={
                <Button variant="danger" disabled={remove.isPending} onClick={() => setConfirming(!confirming)}>
                  {remove.isPending ? "삭제 중..." : "일기 삭제하기"}
                </Button>
              }
            >
              <ConfirmNote>이 날의 일기가 사라집니다. 되돌릴 수 없습니다.</ConfirmNote>
              <ConfirmChoice tone="danger" disabled={remove.isPending} onClick={discard}>
                일기 삭제
              </ConfirmChoice>
              <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
            </ConfirmMenu>
          ) : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
        </DiaryRail>
      </DiaryBody>
    </>
  );
};

/**
 * 아직 오지 않은 일기 화면.
 *
 * 그 날의 일기를 받아 오기 전에 폼을 열면, 이미 쓴 일기가 있어도 빈 칸으로 한 번
 * 그렸다가 도착한 뒤 키가 바뀌며 통째로 다시 그립니다 — 쓰던 글이 잠깐 사라졌다
 * 나타난 것처럼 보입니다. 도착할 때까지는 같은 모양의 자리만 둡니다.
 */

/**
 * 아직 오지 않은 일기 화면.
 *
 * 그 날의 일기를 받아 오기 전에 폼을 열면, 이미 쓴 일기가 있어도 빈 칸으로 한 번
 * 그렸다가 도착한 뒤 키가 바뀌며 통째로 다시 그립니다 — 쓰던 글이 잠깐 사라졌다
 * 나타난 것처럼 보입니다. 도착할 때까지는 같은 모양의 자리만 둡니다.
 */
export const DiaryFormSkeleton = ({ selectedDate }: { selectedDate: string }) => (
  <>
    <DiaryTopBar>
      <DiaryTextAction disabled>취소</DiaryTextAction>
      <h1>일기</h1>
      <DiaryTextAction disabled>완료</DiaryTextAction>
    </DiaryTopBar>
    <DiaryBody role="status">
      <SrOnly>일기를 불러오는 중</SrOnly>
      <DiaryMain>
        <DiaryDate>{formatLongKoreanDate(selectedDate)}</DiaryDate>
        <Skeleton height="400px" radius={theme.radius.md} />
      </DiaryMain>
      <DiaryRail>
        <Skeleton height="44px" radius={theme.radius.pill} />
        <Skeleton height="96px" radius={theme.radius.md} />
      </DiaryRail>
    </DiaryBody>
  </>
);

const DiaryTopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
  h1 {
    margin: 0;
    font-size: ${theme.text.h1};
  }
`;

const DiaryTextAction = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const DiaryBody = styled.div`
  display: grid;
  /* 오른쪽 열은 디자인 폭(313px)을 확보하고, 좁아지면 본문이 먼저 줄어듭니다. */
  grid-template-columns: minmax(0, 800px) minmax(313px, 1fr);
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const DiaryDate = styled.p`
  margin: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
`;

const DiaryMain = styled.div`
  display: grid;
  gap: 10px;
  padding: 24px 20px;
  textarea {
    min-height: 400px;
    border: 0;
    background: transparent;
    padding: 0;
    resize: vertical;
    font-size: ${theme.text.h3};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  @media (max-width: 600px) {
    padding: 0;
    textarea {
      min-height: 240px;
    }
  }
`;

const DiaryRail = styled.aside`
  display: grid;
  gap: 40px;
  align-content: start;
  padding: 24px 20px;
  @media (max-width: 600px) {
    gap: 28px;
    padding: 0;
  }
`;

const DiaryRailLabel = styled.p`
  margin: 0 0 12px;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  white-space: nowrap;
  b {
    color: ${theme.colors.red};
  }
`;

const DiaryPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DiaryRailRow = styled.div`
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  > div {
    display: grid;
    justify-items: center;
    gap: 8px;
  }
`;

const DiaryIconAction = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  img {
    width: 40px;
    height: 40px;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
/** 사진 자체가 버튼입니다. 눌러 다른 사진을 고릅니다. */

/** 사진 자체가 버튼입니다. 눌러 다른 사진을 고릅니다. */
const DiaryPhotoButton = styled.button`
  display: block;
  border: 0;
  padding: 0;
  background: transparent;
  line-height: 0;
  border-radius: ${theme.radius.md};
  &:hover img {
    opacity: 0.85;
  }
`;

const DiaryAttachment = styled.small`
  max-width: 160px;
  color: ${theme.colors.muted};
  font-size: ${theme.text.xs};
  overflow-wrap: anywhere;
`;

const EmotionRow = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  button {
    border: 1px solid ${theme.colors.line};
    border-radius: 12px;
    background: white;
    padding: 10px 14px;
    font-size: 20px;
  }
  button[data-selected="true"] {
    background: #effad9;
    border-color: #d4ed9d;
  }
  @media (max-width: 600px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    button {
      min-height: 46px;
      padding: 8px;
    }
  }
`;
