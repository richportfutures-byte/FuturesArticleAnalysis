export type PostReactionInput = {
  moveDirectionVsThesis: 'aligned' | 'opposed' | 'mixed';
  crossMarketConfirmation: 'confirmed' | 'failed' | 'mixed';
};

export const runPostReaction = (input: PostReactionInput) => {
  const result =
    input.moveDirectionVsThesis === 'aligned' && input.crossMarketConfirmation === 'confirmed'
      ? 'sustained'
      : input.moveDirectionVsThesis === 'opposed'
        ? 'reversed'
        : 'mixed';
  return {
    move_classification: result,
    article_role: result === 'sustained' ? 'catalyst' : result === 'reversed' ? 'rationalization' : 'irrelevant',
    learning_tag: result === 'sustained' ? 'continuation' : result === 'reversed' ? 'fade' : 'ignore'
  };
};
