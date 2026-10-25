import { gql } from "urql";

export const UPDATE_NOTES = gql`
  mutation UpdateNotes($id: ID!, $notes: String, $clientId: String!) {
    updateReleaseNotes(id: $id, notes: $notes, clientId: $clientId) {
      id
      name
      dueDate
      notes
      status
      steps {
        key
        label
        completed
      }
    }
  }
`;
