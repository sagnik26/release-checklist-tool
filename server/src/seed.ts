import { appModule } from "./app.module.js";
import { STEP_DEFINITIONS } from "./releases/steps.constants.js";

const clientId = "seed";

const samples = [
  {
    name: "Version 1.0.1",
    dueDate: "2022-09-20",
    notes: "Demo release from the mockup.",
    completed: 3,
  },
  {
    name: "Version 1.1.0",
    dueDate: "2022-10-01",
    notes: null,
    completed: 0,
  },
  {
    name: "Version 0.9.0",
    dueDate: "2022-08-15",
    notes: "Shipped.",
    completed: STEP_DEFINITIONS.length,
  },
];

async function main() {
  const { releasesService } = appModule.releasesModule;
  for (const sample of samples) {
    const release = await releasesService.create({
      name: sample.name,
      dueDate: sample.dueDate,
      notes: sample.notes,
      clientId,
    });
    for (const step of STEP_DEFINITIONS.slice(0, sample.completed)) {
      await releasesService.setStepCompleted({
        releaseId: release.id,
        stepKey: step.key,
        completed: true,
        clientId,
      });
    }
  }
  await appModule.databaseService.close();
}

main().catch(async (error) => {
  console.error(error);
  await appModule.databaseService.close();
  process.exit(1);
});
