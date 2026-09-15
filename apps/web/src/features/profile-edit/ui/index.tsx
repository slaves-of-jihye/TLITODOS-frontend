import { useRef, useState } from "react";
import {
  Button,
  FieldActions,
  FieldBlock,
  FieldBox,
  FieldChevron,
  FieldCounter,
  FieldLabel,
  FieldRow,
  FieldValue,
  HiddenFileInput,
  icons,
} from "@/shared/ui";

export const BIO_LIMIT = 30;

export const NAME_LIMIT = 20;

/**
 * 라벨 + 회색 입력칸 한 줄.
 *
 * 보기 상태에서는 칸 전체가 편집 진입 버튼이고, 편집 상태에서는 칸 안에서
 * 입력하고 오른쪽 취소/확인으로 끝냅니다. Enter로는 저장하지 않습니다.
 */

/**
 * 라벨 + 회색 입력칸 한 줄.
 *
 * 보기 상태에서는 칸 전체가 편집 진입 버튼이고, 편집 상태에서는 칸 안에서
 * 입력하고 오른쪽 취소/확인으로 끝냅니다. Enter로는 저장하지 않습니다.
 */
export const EditableProfileRow = ({
  label,
  value,
  placeholder,
  limit,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  limit: number;
  onSave: (next: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    setBusy(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch {
      /* 오류 문구는 프로필 화면에서 표시합니다. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <FieldBlock>
      <FieldLabel>{label}</FieldLabel>
      {editing ? (
        <FieldRow>
          <FieldBox as="div">
            <input
              autoFocus
              value={draft}
              maxLength={limit}
              placeholder={placeholder}
              onKeyDown={event => {
                if (event.key === "Enter") event.preventDefault();
              }}
              onChange={event => setDraft(event.target.value)}
            />
            <FieldCounter>
              {draft.length}/{limit}
            </FieldCounter>
          </FieldBox>
          <FieldActions>
            <Button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              취소
            </Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              확인
            </Button>
          </FieldActions>
        </FieldRow>
      ) : (
        <FieldBox
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <FieldValue data-empty={!value}>{value || placeholder}</FieldValue>
          <FieldChevron src={icons.arrowUp} alt="" aria-hidden />
        </FieldBox>
      )}
    </FieldBlock>
  );
};

/** 서버가 5MB를 넘기면 거절하므로, 올리기 전에 같은 기준으로 막습니다. */

/** 서버가 5MB를 넘기면 거절하므로, 올리기 전에 같은 기준으로 막습니다. */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * 프로필 사진 교체.
 *
 * 파일 선택창은 숨긴 `input`으로 열고, 고른 파일을 바로 올립니다. 사진은 되돌릴
 * 초안이 없어 이름·자기소개와 달리 완료 버튼 없이 곧장 저장합니다.
 */

/**
 * 프로필 사진 교체.
 *
 * 파일 선택창은 숨긴 `input`으로 열고, 고른 파일을 바로 올립니다. 사진은 되돌릴
 * 초안이 없어 이름·자기소개와 달리 완료 버튼 없이 곧장 저장합니다.
 */
export const ProfileImageAction = ({ onPick }: { onPick: (file: File) => Promise<void> }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "올리는 중..." : "프로필 사진 수정하기"}
      </Button>
      <HiddenFileInput
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={async event => {
          const file = event.target.files?.[0];
          // 같은 파일을 다시 골라도 change가 오도록 값을 비웁니다.
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            await onPick(file);
          } catch {
            /* 오류 문구는 프로필 화면에서 표시합니다. */
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};

/**
 * 폰트 목록.
 *
 * 네이티브 `select`를 쓰지 않는 이유는 macOS와 iOS가 드롭다운을 OS로 그려
 * `option`의 `font-family`를 무시하기 때문입니다. 폰트를 고르는 자리에서 폰트를
 * 보여주려면 목록을 직접 그려야 합니다.
 *
 * 목록을 여는 순간 여섯 벌을 모두 내려받습니다(배포 환경 brotli 기준 약 3.5MB).
 * 선택이 아니라 열람에 드는 비용이라, 편집에 들어갈 때가 아니라 목록을 펼칠 때
 * 발생하도록 두었습니다.
 */
