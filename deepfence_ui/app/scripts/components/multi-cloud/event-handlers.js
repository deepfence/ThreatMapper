export function onNodeMouseEnter(graph) {
  return function onNodeMouseEnter(e) {
    const { item: node } = e;
    node?.getEdges?.()?.forEach?.(edge => {
      if (
        !edge?.getModel?.()?.combo_pseudo_center &&
        !edge?.getModel?.()?.combo_pseudo_inner
      ) {
        graph.setItemState(edge, 'active', true);
      }
    });
  };
}

export function onNodeMouseLeave(graph) {
  return function onNodeMouseLeave(e) {
    const { item: node } = e;
    node?.getEdges?.()?.forEach?.(edge => {
      if (
        !edge?.getModel?.()?.combo_pseudo_center &&
        !edge?.getModel?.()?.combo_pseudo_inner
      ) {
        graph.setItemState(edge, 'active', false);
      }
    });
  };
}
