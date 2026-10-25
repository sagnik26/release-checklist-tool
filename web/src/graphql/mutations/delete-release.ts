import { gql } from "urql";

export const DELETE_RELEASE = gql`
  mutation DeleteRelease($id: ID!, $clientId: String!) {
    deleteRelease(id: $id, clientId: $clientId)
  }
`;
