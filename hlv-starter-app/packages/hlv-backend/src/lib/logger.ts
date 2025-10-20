import { consola } from 'consola';

export const serviceLogger = consola.withTag('hlv-backend');
export const apiLogger = consola.withTag('api');
export const jobLogger = consola.withTag('jobs');
export const htlcLogger = consola.withTag('htlc');
export const lightningLogger = consola.withTag('lightning');

