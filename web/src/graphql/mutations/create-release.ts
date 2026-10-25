import { gql } from "urql";

export const CREATE_RELEASE = gql`
  mutation CreateRelease($name: String!, $dueDate: String!, $notes: String, $clientId: String!) {
    createRelease(name: $name, dueDate: $dueDate, notes: $notes, clientId: $clientId) {
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
