import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { cottonIssues } from "../data/cottonIssues.js";
import { seedCottonIssues } from "../data/seedCottonIssues.js";
import { CottonIssueModel } from "../models/CottonIssue.js";

const run = async () => {
  const connected = await connectDatabase();
  if (!connected) {
    throw new Error("MongoDB is required to persist the cotton issue seed.");
  }
  const count = await seedCottonIssues();
  const [databaseCount, uniqueIds] = await Promise.all([
    CottonIssueModel.countDocuments(),
    CottonIssueModel.distinct("id"),
  ]);
  if (databaseCount !== count || uniqueIds.length !== cottonIssues.length) {
    throw new Error(
      `Seed verification failed: expected ${count} unique records, found ${databaseCount} records and ${uniqueIds.length} unique IDs.`,
    );
  }
  console.log(`Seeded and verified ${databaseCount} unique cotton issue records.`);
};

run()
  .catch((error: unknown) => {
    console.error("Cotton issue seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
