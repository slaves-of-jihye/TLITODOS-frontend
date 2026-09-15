import styled from "@emotion/styled";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GroupDetail } from "@/shared/api";
import { useDeleteGroup, useRemoveGroupMembers, useRenameGroup } from "@/entities/group";
import { useMe } from "@/entities/user";
import { GROUP_NAME_LIMIT } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import {
  ConfirmChoice,
  ConfirmMenu,
  ConfirmNote,
  DetailEmpty,
  ErrorText,
  Modal,
  SheetActions,
  SheetBox,
  SheetCancel,
  SheetField,
  SheetForm,
  SheetLabel,
  SheetSubmit,
  icons,
  palette,
  theme,
} from "@/shared/ui";

/**
 * 그룹 설정 시트.
 *
 * 디자인의 `groupinfo`입니다. 그룹장만 이름을 바꾸고, 멤버를 내보내고, 그룹을
 * 지울 수 있습니다. 강퇴는 여러 명을 골라 한 번에 보냅니다.
 */
export const GroupInfoModal = ({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: GroupDetail | null;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { data: me } = useMe();
  // 시트가 열릴 때마다 새로 마운트되므로(호출 쪽 `key`) 초깃값이 그때의 그룹 이름입니다.
  const [selected, setSelected] = useState<number[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  /** 열려 있는 확인 드롭다운. 한 번에 하나만 엽니다. */
  const [confirming, setConfirming] = useState<"delete" | "kick" | null>(null);
  const dismissConfirm = useCallback(() => setConfirming(null), []);
  const removeMembers = useRemoveGroupMembers(group?.groupId ?? null);
  const renameGroup = useRenameGroup(group?.groupId ?? null);
  const deleteGroup = useDeleteGroup();
  // 내가 누구인지 알기 전에는 목록을 비워 둡니다 — 나 자신이 강퇴 대상으로 보이면 안 됩니다.
  const others = me ? (group?.members.filter(member => member.userId !== me.userId) ?? []) : [];
  const isLeader = group?.members.find(member => member.userId === me?.userId)?.role === "LEADER";
  const error = removeMembers.error ?? renameGroup.error ?? deleteGroup.error;
  const kicked = others.filter(member => selected.includes(member.userId)).map(member => member.name);
  const removeGroup = async () => {
    if (!group) return;
    try {
      await deleteGroup.mutateAsync(group.groupId);
      onClose();
      navigate("/");
    } catch {
      /* mutation.error를 시트에 표시합니다. */
    } finally {
      setConfirming(null);
    }
  };
  const kickSelected = async () => {
    if (!selected.length) return;
    try {
      await removeMembers.mutateAsync(selected);
      setSelected([]);
    } catch {
      /* mutation.error를 표시합니다. */
    } finally {
      setConfirming(null);
    }
  };
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="그룹 설정">
      <SheetForm>
        <GroupInfoTitle>{group?.name ?? "그룹"}</GroupInfoTitle>
        <SheetActions>
          <GroupInfoAction
            type="button"
            disabled={!group || !isLeader}
            title={isLeader ? undefined : "그룹장만 그룹 이름을 바꿀 수 있습니다."}
            onClick={() => setRenaming(!renaming)}
          >
            <img src={icons.edit} alt="" aria-hidden />
            그룹명 수정
          </GroupInfoAction>
          <ConfirmMenu
            open={confirming === "delete"}
            label="그룹 삭제"
            onDismiss={dismissConfirm}
            trigger={
              <GroupInfoAction
                type="button"
                disabled={!group || !isLeader || deleteGroup.isPending}
                title={isLeader ? undefined : "그룹장만 그룹을 삭제할 수 있습니다."}
                onClick={() => setConfirming(current => (current === "delete" ? null : "delete"))}
              >
                <img src={icons.trash} alt="" aria-hidden />
                {deleteGroup.isPending ? "삭제 중..." : "그룹 삭제"}
              </GroupInfoAction>
            }
          >
            <ConfirmNote>{group?.name ?? "그룹"}을 지우면 되돌릴 수 없습니다.</ConfirmNote>
            <ConfirmChoice tone="danger" disabled={deleteGroup.isPending} onClick={removeGroup}>
              그룹 삭제
            </ConfirmChoice>
            <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
          </ConfirmMenu>
        </SheetActions>
        {renaming ? (
          <SheetField>
            <SheetLabel htmlFor="group-rename">새 그룹 이름</SheetLabel>
            <SheetBox>
              <input
                id="group-rename"
                value={name}
                maxLength={GROUP_NAME_LIMIT}
                placeholder="그룹 이름을 입력하세요"
                onChange={event => setName(event.target.value)}
              />
              <small>
                {name.length}/{GROUP_NAME_LIMIT}
              </small>
            </SheetBox>
            <SheetSubmit
              type="button"
              disabled={!name.trim() || name.trim() === group?.name || renameGroup.isPending}
              onClick={async () => {
                try {
                  await renameGroup.mutateAsync(name.trim());
                  setRenaming(false);
                } catch {
                  /* mutation.error를 표시합니다. */
                }
              }}
            >
              {renameGroup.isPending ? "저장 중..." : "그룹명 수정하기"}
            </SheetSubmit>
          </SheetField>
        ) : null}
        <MemberOptions role="group" aria-label="멤버 고르기">
          {others.length ? (
            others.map(member => (
              <MemberOption
                key={member.userId}
                type="button"
                aria-pressed={selected.includes(member.userId)}
                selected={selected.includes(member.userId)}
                onClick={() =>
                  setSelected(
                    selected.includes(member.userId)
                      ? selected.filter(id => id !== member.userId)
                      : [...selected, member.userId],
                  )
                }
              >
                <i aria-hidden />
                {member.name}
              </MemberOption>
            ))
          ) : (
            <DetailEmpty>아직 다른 멤버가 없습니다.</DetailEmpty>
          )}
        </MemberOptions>
        {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
        <ConfirmMenu
          open={confirming === "kick"}
          label="선택한 멤버 강퇴"
          above
          onDismiss={dismissConfirm}
          trigger={
            <SheetCancel
              type="button"
              disabled={selected.length === 0 || removeMembers.isPending || !isLeader}
              title={isLeader ? undefined : "그룹장만 멤버를 내보낼 수 있습니다."}
              onClick={() => setConfirming(current => (current === "kick" ? null : "kick"))}
            >
              {removeMembers.isPending ? "내보내는 중..." : "선택한 멤버 강퇴"}
            </SheetCancel>
          }
        >
          <ConfirmNote>{kicked.join(", ")}님을 그룹에서 내보냅니다.</ConfirmNote>
          <ConfirmChoice tone="danger" disabled={removeMembers.isPending} onClick={kickSelected}>
            내보내기
          </ConfirmChoice>
          <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
        </ConfirmMenu>
      </SheetForm>
    </Modal>
  );
};

const GroupInfoTitle = styled.p`
  margin: 0;
  width: 100%;
  text-align: center;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;

const GroupInfoAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  img {
    width: 18px;
    height: 18px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const MemberOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`;

const MemberOption = styled.button<{ selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.pill};
  background: ${palette.white};
  padding: 4px 12px 4px 4px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  i {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid ${palette.gray300};
    background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  }
`;

/**
 * 초대코드 공유 시트.
 *
 * Figma에 없는 화면이라 `초대코드로 참여하기` 시트를 뒤집은 꼴로 세웠습니다 —
 * 같은 제목 줄과 같은 회색 상자에, 입력칸 대신 그룹의 실제 코드를 보여줍니다.
 * 코드는 `GET /api/v1/groups/{groupId}` 응답에 이미 들어 있어 따로 부르지 않습니다.
 */
