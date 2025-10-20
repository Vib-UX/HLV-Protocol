import { env } from "./env";
import { serviceLogger, jobLogger } from "./logger";
import { connectToMongoDB } from "./mongo/mongoose";
import { agenda, startAgenda } from "./agenda/agendaClient";
import {
  defineHTLCMonitorJob,
  scheduleHTLCMonitorJob,
} from "./agenda/jobs/htlcMonitorJob";
import { defineExecuteSwapJob } from "./agenda/jobs/executeSwapJob";
import * as rebalanceJobDef from "./agenda/jobs/rebalanceJob";

const { MONGODB_URI } = env;

const startJobWorker = async () => {
  serviceLogger.info("Starting HLV job worker...");

  await connectToMongoDB(MONGODB_URI);
  serviceLogger.info("MongoDB connected");

  // Define jobs inline (DCA pattern)
  jobLogger.info("Defining all jobs...");

  defineHTLCMonitorJob();
  defineExecuteSwapJob();

  // Define rebalance job INLINE to avoid "definition.fn is not a function" error
  agenda.define(
    rebalanceJobDef.JOB_NAME,
    { priority: "high", concurrency: 3 },
    async (job: rebalanceJobDef.JobType) => {
      await rebalanceJobDef.executeRebalance(job);
    }
  );
  jobLogger.info(`Job defined: ${rebalanceJobDef.JOB_NAME}`);

  jobLogger.success("All jobs defined");

  // Start Agenda (this makes it start processing)
  await startAgenda();

  // Schedule recurring jobs
  jobLogger.info("Scheduling all jobs...");
  await scheduleHTLCMonitorJob();
  jobLogger.success("All jobs scheduled");

  serviceLogger.success("Job worker started successfully");
};

export { startJobWorker };
