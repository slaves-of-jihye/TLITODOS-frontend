import { useSearchParams } from "react-router-dom";
import { isDiaryForDate, useDiaries } from "@/entities/diary";
import { useMe } from "@/entities/user";
import { formatLocalDate } from "@/shared/lib";
import { AppShell } from "@/shared/ui";
import { DiaryForm, DiaryFormSkeleton } from "@/widgets/diary-form";
import { PageNav } from "@/widgets/page-nav";

export const DiaryPage = () => {
  const [search] = useSearchParams();
  const selectedDate = search.get("date") || formatLocalDate(new Date());
  const { data: me } = useMe();
  const { data: diaries = [], isLoading } = useDiaries({ date: selectedDate });
  const existing = diaries.find(diary => isDiaryForDate(diary, selectedDate));
  return (
    <AppShell>
      {isLoading ? (
        <DiaryFormSkeleton selectedDate={selectedDate} />
      ) : (
        <DiaryForm
          key={`${selectedDate}-${existing?.diaryId ?? "new"}`}
          selectedDate={selectedDate}
          existing={existing}
          userName={me?.name}
        />
      )}
      <PageNav active="home" />
    </AppShell>
  );
};
