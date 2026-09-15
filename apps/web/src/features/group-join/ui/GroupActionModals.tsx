import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isInviteCode, useCreateGroup, useJoinGroup } from "@/entities/group";
import { GROUP_BIO_LIMIT, GROUP_NAME_LIMIT } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
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

/**
 * 그룹 만들기 / 초대코드로 참여하기.
 *
 * Figma에 없는 화면이라, 같은 파일의 `modal / category`가 세운 꼴을 따릅니다 —
 * 제목, 라벨 붙은 회색 입력칸, 취소/완료 두 버튼.
 */
export const GroupActionModals = ({ mode, onClose }: { mode: "create" | "join" | null; onClose: () => void }) => {
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const close = () => {
    setName("");
    setDescription("");
    setCode("");
    onClose();
  };
  const error = createGroup.error ?? joinGroup.error;
  const busy = createGroup.isPending || joinGroup.isPending;
  return (
    <Modal
      open={mode !== null}
      sheet
      onClose={close}
      aria-label={mode === "create" ? "새 그룹 만들기" : "초대코드로 참여하기"}
    >
      <SheetForm>
        <SheetHeading>{mode === "create" ? "새 그룹 만들기" : "초대코드로 참여하기"}</SheetHeading>
        {mode === "create" ? (
          <>
            <SheetField>
              <SheetLabel htmlFor="group-name">그룹 이름</SheetLabel>
              <SheetBox>
                <input
                  id="group-name"
                  value={name}
                  maxLength={GROUP_NAME_LIMIT}
                  placeholder="그룹 이름을 입력하세요"
                  onChange={e => setName(e.target.value)}
                />
                <small>
                  {name.length}/{GROUP_NAME_LIMIT}
                </small>
              </SheetBox>
            </SheetField>
            <SheetField>
              <SheetLabel htmlFor="group-description">그룹 소개</SheetLabel>
              <SheetBox>
                <textarea
                  id="group-description"
                  value={description}
                  maxLength={GROUP_BIO_LIMIT}
                  placeholder="우리 그룹을 소개해 주세요"
                  onChange={e => setDescription(e.target.value)}
                />
                <small>
                  {description.length}/{GROUP_BIO_LIMIT}
                </small>
              </SheetBox>
            </SheetField>
          </>
        ) : (
          <SheetField>
            <SheetLabel htmlFor="group-code">초대코드</SheetLabel>
            <SheetBox>
              <input
                id="group-code"
                value={code}
                maxLength={8}
                placeholder="영문 소문자와 숫자 8자리"
                onChange={e => setCode(e.target.value.toLowerCase())}
              />
            </SheetBox>
          </SheetField>
        )}
        {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={close}>
            취소
          </SheetCancel>
          <SheetSubmit
            type="button"
            disabled={busy || (mode === "create" ? !name.trim() : !isInviteCode(code))}
            onClick={async () => {
              try {
                const group =
                  mode === "create"
                    ? await createGroup.mutateAsync({ name: name.trim(), description: description.trim() })
                    : await joinGroup.mutateAsync({ inviteCode: code });
                close();
                navigate(`/groups/${group.groupId}`);
              } catch {
                /* mutation.error를 시트에 표시합니다. */
              }
            }}
          >
            완료
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};
