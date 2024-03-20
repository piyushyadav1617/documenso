/**
 * For TRPC useMutation that should not invalidate any queries.
 */
export const SKIP_MUTATION_QUERY_INVALIDATION = {
  meta: {
    skipQuery: true,
  },
};

/**
 * For TRPC useQueries that should not be run after a mutation.
 */
export const SKIP_QUERY_INVALIDATION_META = {
  meta: {
    skipInvalidation: true,
  },
};

/**
 * For TRPC useQueries that should not be batched.
 */
export const SKIP_QUERY_BATCH_META = {
  trpc: {
    context: {
      skipBatch: true,
    },
  },
};
