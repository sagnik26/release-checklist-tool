import { gql } from "urql";

export const RELEASES_QUERY = gql`
  query Releases {
    releases {
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
