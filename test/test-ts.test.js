// Debug: check which babel version is loaded
const babel = require('@babel/core');
console.log('Babel version in test:', babel.version);

describe('test-ts', () => {
  it('renders component', async () => {
    const { TestComp } = await import('@/components/test-ts');
    expect(TestComp).toBeDefined();
  });
});
