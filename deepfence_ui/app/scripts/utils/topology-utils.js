export function getPodNamespace(podNode) {
  let namespace;
  if (podNode) {
    const namespaceMeta = podNode.metadata.filter(
      mdata => mdata.id === 'kubernetes_namespace'
    );
    if (namespaceMeta.length > 0) {
      namespace = namespaceMeta[0].value;
    }
  }
  return namespace;
}
