import { build } from 'vite';

const endpoints = [
  'admin',
  'create-order',
  'save-surprise',
  'verify-payment',
  'verify-token',
  'webhook'
];

async function run() {
  console.log('Building standalone serverless functions for Vercel...');
  for (const name of endpoints) {
    await build({
      configFile: false,
      publicDir: false,
      build: {
        ssr: `./src/server/api/${name}.ts`,
        outDir: './api',
        emptyOutDir: false,
        minify: true,
        rollupOptions: {
          output: {
            format: 'esm',
            entryFileNames: `${name}.js`
          }
        }
      }
    });
    console.log(`✓ api/${name}.js generated`);
  }
}

run().catch((err) => {
  console.error('Failed to build API functions:', err);
  process.exit(1);
});
