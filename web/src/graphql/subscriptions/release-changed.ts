import { gql } from "urql";

export const RELEASE_CHANGED = gql`
  subscription ReleaseChanged {
    releaseChanged {
      releaseId
      kind
      stepKey
      completed
      sourceClientId
    }
  }
`;
