import type { Todo } from "@/shared/api";
import { Modal, SheetForm, SheetHeading, SheetRow, SheetRows, SheetSubmit } from "@/shared/ui";

export const DependencyBlockModal = ({
  todos,
  open,
  onClose,
}: {
  todos: Todo[];
  open: boolean;
  onClose: () => void;
}) => (
  <Modal open={open} sheet onClose={onClose} aria-label="먼저 완료해야 할 일이 있어요">
    <SheetForm>
      <SheetHeading>먼저 완료해야 할 일이 있어요</SheetHeading>
      <SheetRows>
        {todos.map(todo => (
          <SheetRow as="div" key={todo.todoId}>
            <span>{todo.title}</span>
          </SheetRow>
        ))}
      </SheetRows>
      <SheetSubmit type="button" onClick={onClose}>
        확인
      </SheetSubmit>
    </SheetForm>
  </Modal>
);

/** 세부사항 글자 수. 디자인의 카운터가 0/100입니다. */
