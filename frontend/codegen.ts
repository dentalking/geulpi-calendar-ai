import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: '../schema.graphqls',
  documents: 'graphql/**/*.graphql',
  generates: {
    'generated/graphql.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        apolloReactHooksImportFrom: '@apollo/client'
      }
    },
    'generated/introspection.json': {
      plugins: ['introspection']
    }
  }
};

export default config;