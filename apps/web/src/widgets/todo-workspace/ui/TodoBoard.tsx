import styled from "@emotion/styled";
import type { TodoDrag } from "@/features/todo-drag";
import type { Category, Todo } from "@/shared/api";
import { categoryAccent } from "@/entities/category";
import { TodoColumnSkeleton, TodoList, TodoRowSkeleton, formatDeadline, isOverdue } from "@/entities/todo";
import { TodoDraftRow } from "@/features/todo-create";
import { CATEGORY_DROP_ATTRIBUTE, DraggableRow } from "@/features/todo-drag";
import { useHourCycle } from "@/shared/model";
import { CategoryBoard } from "./boardStyles";
import { CategoryPill, SrOnly, TodoRow as SharedTodoRow, theme } from "@/shared/ui";

export const CategorySection = ({
  category,
  index,
  todos,
  selectedDate,
  own,
  adding,
  onAdd,
  onCancelAdd,
  onCreate,
  onManage,
  onToggle,
  onEdit,
  onBet,
  drag,
  pending = 0,
}: {
  category: Category;
  index: number;
  todos: Todo[];
  /** 지금 보고 있는 날. 마감을 얼마나 자세히 적을지가 여기에 달려 있습니다. */
  selectedDate: string;
  own: boolean;
  /** 이 카테고리에 인라인 입력 줄이 열려 있는지. */
  adding?: boolean;
  onAdd: (category: Category) => void;
  onCancelAdd: () => void;
  onCreate: (category: Category, title: string) => Promise<void>;
  onManage: (category: Category) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  /** 남의 할 일에 내기를 걸 때. 내 화면에서는 넘어오지 않습니다. */
  onBet?: (todo: Todo) => void;
  /** 할 일을 끌어 옮기는 손짓. 내 화면에서만 넘어옵니다. */
  drag?: TodoDrag;
  /** 방금 만들어 아직 목록에 없는 할 일의 수. 그만큼 빈 줄을 잡아 둡니다. */
  pending?: number;
}) => {
  const accent = categoryAccent(category.color, index);
  const hourCycle = useHourCycle();
  const isTarget = Boolean(drag?.activeId) && drag?.overId === category.categoryId;
  return (
    <CategoryColumn
      {...{ [CATEGORY_DROP_ATTRIBUTE]: category.categoryId }}
      style={{ borderColor: isTarget ? accent : undefined }}
    >
      <CategoryPill
        name={category.name}
        accent={accent}
        own={own}
        onAdd={own ? () => onAdd(category) : undefined}
        onManage={own ? () => onManage(category) : undefined}
      />
      <TodoList>
        {todos.map(todo => (
          <DraggableRow key={todo.todoId} dragging={drag?.activeId === todo.todoId} {...drag?.rowProps(todo)}>
            <SharedTodoRow
              todo={todo}
              accent={accent}
              own={own}
              deadline={formatDeadline(todo, hourCycle, selectedDate)}
              // 기한이 지난 할 일에는 내기를 걸 수 없습니다 — 결과가 이미 나온 일입니다.
              betClosed={isOverdue(todo)}
              onToggle={() => onToggle(todo)}
              onEdit={() => onEdit(todo)}
              onBet={onBet ? () => onBet(todo) : undefined}
            />
          </DraggableRow>
        ))}
        {adding ? (
          <TodoDraftRow accent={accent} onCancel={onCancelAdd} onCommit={title => onCreate(category, title)} />
        ) : null}
        {/*
         * 방금 만든 할 일의 자리입니다.
         *
         * 만들기가 끝나도 목록은 한 번 더 받아 와야 도착합니다. 그 사이 입력 줄은
         * 이미 닫혀 있어, 자리를 잡아 두지 않으면 방금 쓴 것이 사라진 것처럼 보입니다.
         */}
        {Array.from({ length: pending }, (_, index) => (
          <TodoRowSkeleton key={`pending-${index}`} label="할 일을 담는 중" />
        ))}
      </TodoList>
    </CategoryColumn>
  );
};

const CategoryColumn = styled.section`
  min-width: 0;
  /* 끌어온 할 일을 받을 칸임을 테두리로 알립니다. 자리는 늘 잡아 두어 흔들리지 않습니다. */
  border: 2px dashed transparent;
  border-radius: ${theme.radius.sm};
  margin: -8px;
  padding: 8px;
`;
/** 칸마다 다른 줄 수. 자리표시가 네 칸 똑같은 모양으로 늘어서지 않게 합니다. */
const SKELETON_COLUMN_ROWS = [3, 2, 4, 2];

/**
 * 아직 오지 않은 할 일 보드.
 *
 * 날짜를 옮기면 그 날의 목록을 새로 받아 오는데, 그동안 "불러오는 중"이라고 한 줄만
 * 적으면 보드가 통째로 접혔다 펴집니다. 같은 자리에 같은 모양을 놓아 두면 도착했을
 * 때 자리가 그대로라 눈이 따라갈 곳을 잃지 않습니다.
 */

/**
 * 아직 오지 않은 할 일 보드.
 *
 * 날짜를 옮기면 그 날의 목록을 새로 받아 오는데, 그동안 "불러오는 중"이라고 한 줄만
 * 적으면 보드가 통째로 접혔다 펴집니다. 같은 자리에 같은 모양을 놓아 두면 도착했을
 * 때 자리가 그대로라 눈이 따라갈 곳을 잃지 않습니다.
 */
export const TodoBoardSkeleton = ({ columns }: { columns: number }) => (
  <CategoryBoard role="status">
    <SrOnly>할 일을 불러오는 중</SrOnly>
    {Array.from({ length: columns }, (_, index) => (
      <TodoColumnSkeleton key={index} rows={SKELETON_COLUMN_ROWS[index % SKELETON_COLUMN_ROWS.length]} />
    ))}
  </CategoryBoard>
);
