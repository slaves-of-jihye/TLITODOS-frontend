import styled from "@emotion/styled";
import { useState } from "react";
import { StatusCluster, theme } from "@/shared/ui";

const TODO_TITLE_LIMIT = 40;

/**
 * 목록 안에서 바로 쓰는 입력 줄.
 *
 * 제목만 받아 만들고, 나머지 설정은 만든 뒤 상세에서 손봅니다. Enter로 만들고
 * Esc로 접습니다. 내용 없이 포커스를 잃으면 그냥 닫힙니다.
 */

/**
 * 목록 안에서 바로 쓰는 입력 줄.
 *
 * 제목만 받아 만들고, 나머지 설정은 만든 뒤 상세에서 손봅니다. Enter로 만들고
 * Esc로 접습니다. 내용 없이 포커스를 잃으면 그냥 닫힙니다.
 */
export const TodoDraftRow = ({
  accent,
  initial = "",
  onCancel,
  onCommit,
}: {
  accent: string;
  initial?: string;
  onCancel: () => void;
  onCommit: (title: string) => Promise<void>;
}) => {
  const [title, setTitle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const commit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onCommit(title.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <DraftRow style={{ borderBottomColor: accent }}>
      <StatusCluster fills={[null, null, null, null]} />
      <input
        autoFocus
        value={title}
        maxLength={TODO_TITLE_LIMIT}
        disabled={busy}
        placeholder="할 일 입력"
        onChange={event => setTitle(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (!title.trim()) onCancel();
        }}
      />
      <small>
        {title.length}/{TODO_TITLE_LIMIT}
      </small>
    </DraftRow>
  );
};

const DraftRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  /* 디자인에서는 입력 중인 줄만 카테고리 색 밑줄을 답니다. */
  border-bottom: 2px solid;
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.h3};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  small {
    flex: none;
    font-size: ${theme.text.h3};
    color: ${theme.colors.muted};
  }
`;
