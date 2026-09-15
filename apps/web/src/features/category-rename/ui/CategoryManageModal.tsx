import { useState } from "react";
import type { Category } from "@/shared/api";
import { useUpdateCategory } from "@/entities/category";
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

export const CategoryManageModal = ({
  category,
  open,
  onClose,
}: {
  category: Category | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState(category?.name ?? "");
  const update = useUpdateCategory();
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="카테고리 이름 변경">
      <SheetForm>
        <SheetHeading>카테고리 이름 변경</SheetHeading>
        <SheetField>
          <SheetLabel htmlFor="category-name">이름</SheetLabel>
          <SheetBox>
            <input id="category-name" value={name} maxLength={16} onChange={e => setName(e.target.value)} />
          </SheetBox>
        </SheetField>
        {update.error ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={onClose}>
            취소
          </SheetCancel>
          <SheetSubmit
            type="button"
            disabled={!category || !name.trim() || update.isPending}
            onClick={async () => {
              if (!category) return;
              try {
                await update.mutateAsync({
                  id: category.categoryId,
                  body: { name: name.trim(), color: category.color },
                });
                onClose();
              } catch {
                /* mutation.error를 표시합니다. */
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

/** 선행 할 일이 남아 완료를 막을 때 뜨는 시트. Figma에는 없고 규칙상 필요합니다. */
