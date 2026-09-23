import { exec } from 'child_process';

const process = exec('pnpm run preview');
process.stdout.on('data', (data) => {
  console.log(data);
});
process.stderr.on('data', (data) => {
  console.error(data);
});
