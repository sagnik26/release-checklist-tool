import { gql } from "urql";

export const RELEASE_QUERY = gql`
  query Release($id: ID!) {
    release(id: $id) {
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
