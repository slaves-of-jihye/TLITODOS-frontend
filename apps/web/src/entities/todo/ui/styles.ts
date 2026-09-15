/*
 * 이 조각들은 여러 파일이 나눠 쓰므로 여기 따로 둡니다.
 *
 * 컴포넌트와 같은 파일에 두면 Fast Refresh가 그 파일을 통째로 다시 불러옵니다 —
 * styled로 만든 것은 컴포넌트로 세어지지 않기 때문입니다. 모양만 있는 파일과
 * 컴포넌트만 있는 파일로 갈라 둡니다.
 */
import styled from "@emotion/styled";

export const TodoList = styled.div`
  display: grid;
  margin-top: 20px;
  @media (max-width: 600px) {
    margin-top: 14px;
  }
`;
