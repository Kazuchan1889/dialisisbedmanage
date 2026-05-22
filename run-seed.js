require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS'
  }
});
require('./prisma/seed.ts');
