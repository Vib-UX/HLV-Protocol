import { Agenda } from '@whisthub/agenda';
import { env } from '../env';
import { serviceLogger } from '../logger';

const { MONGODB_URI } = env;

export const agenda = new Agenda({
  db: { address: MONGODB_URI, collection: 'agendaJobs' },
  processEvery: '10 seconds',
  maxConcurrency: 10,
});

// Graceful shutdown
const graceful = async () => {
  serviceLogger.info('Gracefully stopping Agenda...');
  await agenda.stop();
  process.exit(0);
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

export async function startAgenda() {
  serviceLogger.info('Starting Agenda...');
  await agenda.start();
  serviceLogger.success('Agenda started successfully');
}

