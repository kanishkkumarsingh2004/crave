module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-typescript', { onlyRemoveTypeImports: false }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
}
