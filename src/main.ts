export { runCli } from './cli/main.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  import('./cli/main.js')
    .then(({ runCli }) => runCli())
    .catch((error) => {
      console.error('Fatal error starting the CLI:', error);
      process.exit(1);
    });
}
