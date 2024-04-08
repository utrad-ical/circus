export async function up(db) {
  await db.collection('groups').updateMany(
    {},
    {
      $set: {
        readPlugin: [],
        executePlugin: [],
        manageJobs: [],
        inputPersonalFeedback: [],
        inputConsensualFeedback: [],
        manageFeedback: [],
        viewPersonalInfo: []
      }
    }
  );
}
