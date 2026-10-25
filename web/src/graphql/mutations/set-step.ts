import { gql } from "urql";

export const SET_STEP = gql`
  mutation SetStep($releaseId: ID!, $stepKey: StepKey!, $completed: Boolean!, $clientId: String!) {
    setStepCompleted(
      releaseId: $releaseId
      stepKey: $stepKey
      completed: $completed
      clientId: $clientId
    ) {
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
