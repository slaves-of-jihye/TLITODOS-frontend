import styled from "@emotion/styled";
import { theme } from "@tlitodos/ui";

export const EmptyState = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  color: ${theme.colors.muted};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${theme.text.h1};
`;

export const HiddenFileInput = styled.input`
  display: none;
`;

export const DetailEmpty = styled.small`
  color: ${theme.colors.muted};
`;
