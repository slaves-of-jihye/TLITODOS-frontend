import styled from "@emotion/styled";
import { palette, Skeleton, SrOnly, theme } from "@tlitodos/ui";
import { useAssetObjectUrl } from "@/shared/api";
import { AlarmAvatar, AlarmList } from "./styles";

export const AlarmListSkeleton = () => (
  <AlarmList role="status">
    <SrOnly>알림을 불러오는 중</SrOnly>
    {["78%", "62%", "70%", "54%"].map(width => (
      <AlarmRowSkeleton key={width}>
        <Skeleton width="36px" height="36px" radius="50%" />
        <Skeleton width={width} height="20px" />
      </AlarmRowSkeleton>
    ))}
  </AlarmList>
);

const AlarmRowSkeleton = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.sm};
  padding: 12px 16px;
`;

/** 아직 오지 않은 일기 한 편. 알림에서 열면 내용을 그때 받아 옵니다. */

export const ActorAvatar = ({ url }: { url: string | null }) => {
  const src = useAssetObjectUrl(url);
  return <AlarmAvatar>{src ? <img src={src} alt="" /> : <span aria-hidden>🐰</span>}</AlarmAvatar>;
};
