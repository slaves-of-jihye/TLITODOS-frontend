import styled from "@emotion/styled";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { resolveFont, useMe, useUpdateFont, useUpdateProfile } from "@/entities/user";
import { CategoryColorSection } from "@/features/category-color";
import { FontProfileRow } from "@/features/font-select";
import {
  BIO_LIMIT,
  EditableProfileRow,
  MAX_PROFILE_IMAGE_BYTES,
  NAME_LIMIT,
  PhotoRow,
  ProfileImageAction,
} from "@/features/profile-edit";
import { useApi, useAssetObjectUrl } from "@/shared/api";
import { errorMessage, readStoredFont } from "@/shared/lib";
import { useSessionStore } from "@/shared/model";
import { AppShell, ErrorText, FieldBlock, FieldLabel, theme } from "@/shared/ui";
import { PageNav } from "@/widgets/page-nav";

export const ProfilePage = () => {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const updateFont = useUpdateFont();
  const api = useApi();
  const refreshToken = useSessionStore(s => s.refreshToken);
  const clear = useSessionStore(s => s.clearSession);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  // 서버가 아직 폰트를 내려주지 않는 동안에는 이 기기에 남은 선택을 기준으로 삼습니다.
  const font = resolveFont(me?.font ?? readStoredFont()).key;
  const guard = async (run: () => Promise<unknown>) => {
    setError("");
    try {
      await run();
    } catch (reason) {
      setError(errorMessage(reason));
      throw reason;
    }
  };
  const save = (body: { name?: string; bio?: string }) => guard(() => update.mutateAsync(body));
  const profileImage = useAssetObjectUrl(me?.profileImageUrl);
  const uploadProfileImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return Promise.resolve();
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있습니다.");
      return Promise.resolve();
    }
    const body = new FormData();
    body.append("image", file);
    return guard(() => update.mutateAsync(body));
  };
  return (
    <AppShell>
      <ProfileTitle>나의 프로필</ProfileTitle>
      <ProfileColumns>
        <ProfilePanel>
          <FieldBlock>
            <FieldLabel>프로필 사진</FieldLabel>
            <PhotoRow>
              {profileImage ? <img src={profileImage} alt="프로필" /> : <span aria-hidden>🌱</span>}
              <ProfileImageAction onPick={uploadProfileImage} />
            </PhotoRow>
          </FieldBlock>
          <EditableProfileRow
            label="이름"
            value={me?.name ?? ""}
            placeholder="이름을 작성하세요"
            limit={NAME_LIMIT}
            onSave={name => save({ name })}
          />
          <EditableProfileRow
            label="자기소개"
            value={me?.bio ?? ""}
            placeholder="자기소개를 작성하세요"
            limit={BIO_LIMIT}
            onSave={bio => save({ bio })}
          />
          <FontProfileRow value={font} onSave={next => guard(() => updateFont.mutateAsync({ font: next }))} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <LogoutButton
            onClick={async () => {
              try {
                if (refreshToken) await api.auth.logout({ refreshToken });
              } catch {
                /* 로컬 세션은 항상 종료합니다. */
              } finally {
                clear();
                // 다음 사용자가 이전 계정의 캐시를 잠깐이라도 보지 않게 비웁니다.
                cache.clear();
                navigate("/");
              }
            }}
          >
            로그아웃
          </LogoutButton>
        </ProfilePanel>
        <CategoryColorSection onError={setError} />
      </ProfileColumns>
      <PageNav active="profile" />
    </AppShell>
  );
};

const ProfileTitle = styled.h1`
  margin: 0 0 40px;
  font-size: ${theme.text.h1};
`;

const ProfileColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 410px);
  gap: 12px;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const ProfilePanel = styled.div`
  display: grid;
  justify-items: start;
  gap: 20px;
  max-width: 560px;
`;

const LogoutButton = styled.button`
  margin-top: 28px;
  border: 0;
  background: transparent;
  color: ${theme.colors.red};
  font-weight: 800;
  padding: 10px 0;
`;
