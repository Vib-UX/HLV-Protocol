import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    './src/index',
    './src/bin/apiServer',
    './src/bin/jobWorker',
    './src/bin/serverWorker',
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
});

