import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import type { GroupDetail } from "@/shared/api";
import {
  ErrorText,
  Modal,
  SheetActions,
  SheetBox,
  SheetCancel,
  SheetField,
  SheetForm,
  SheetHeading,
  SheetLabel,
  SheetSubmit,
} from "@/shared/ui";

export const GroupInviteModal = ({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: GroupDetail | null;
  onClose: () => void;
}) => {
  const code = group?.inviteCode ?? "";
  // 시트가 열릴 때마다 새로 마운트되므로(호출 쪽 `key`) 안내 문구가 남지 않습니다.
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    if (!code) return;
    setFailed(false);
    try {
      await copyText(code);
      setCopied(true);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="초대코드 공유하기">
      <SheetForm>
        <SheetHeading>초대코드 공유하기</SheetHeading>
        <SheetField>
          <SheetLabel htmlFor="group-invite-code">초대코드</SheetLabel>
          <SheetBox>
            {/* 읽기 전용 입력칸이라 손으로 고를 수도 있습니다. */}
            <InviteCodeInput id="group-invite-code" value={code} readOnly onFocus={e => e.target.select()} />
          </SheetBox>
        </SheetField>
        {failed ? <ErrorText>복사할 수 없었습니다. 코드를 직접 골라 복사해 주세요.</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={onClose}>
            닫기
          </SheetCancel>
          <SheetSubmit type="button" disabled={!code} onClick={copy}>
            {copied ? "복사했습니다" : "복사하기"}
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};

const InviteCodeInput = styled.input`
  letter-spacing: 0.12em;
`;
/**
 * 클립보드 API는 안전한 컨텍스트에서만 있고, 있어도 창이 포커스를 잃었거나 권한이
 * 없으면 거절합니다. 그래서 없을 때뿐 아니라 거절할 때도 옛 방식으로 물러납니다.
 */

/**
 * 클립보드 API는 안전한 컨텍스트에서만 있고, 있어도 창이 포커스를 잃었거나 권한이
 * 없으면 거절합니다. 그래서 없을 때뿐 아니라 거절할 때도 옛 방식으로 물러납니다.
 */
const copyText = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* 아래 execCommand로 다시 시도합니다. */
  }
  const holder = document.createElement("textarea");
  holder.value = text;
  holder.setAttribute("readonly", "");
  holder.style.position = "fixed";
  holder.style.opacity = "0";
  document.body.append(holder);
  holder.select();
  const done = document.execCommand("copy");
  holder.remove();
  if (!done) throw new Error("copy failed");
};
