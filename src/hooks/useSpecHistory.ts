import { useEffect, useRef, useState } from 'react';
import { GraphSpec, useModelState } from './bifrost-model';

interface SpecHistoryOptions {
  saveOnDismount?: boolean;
}

/**
 * Keeps track of history and saves Graph Specs.
 * @param options Adaptations to how saving state should be handled
 * @returns a function that can manually save a graph spec to history
 */
export default function useSpecHistory(
  options: SpecHistoryOptions = { saveOnDismount: false }
) {
  const graphSpec = useModelState('graph_spec')[0];
  const [historyNode, setHistoryNode] = useModelState('history_node');
  const [originalSpec, setOriginalSpec] = useState(graphSpec);
  const saveRef = useRef<(spec?: GraphSpec) => void>(save);

  useEffect(() => {
    setOriginalSpec(graphSpec);
    return () => {
      //Slightly delay the dismount save so that new component's event listeners
      // have time to initialize and receive the update (prevents race condition).
      setTimeout(() => {
        options.saveOnDismount && saveRef.current();
      }, 100);
    };
  }, []);

  /**
   * Saves graph spec to the current history branch
   * @param spec Graph Spec to save
   */
  function save(spec: GraphSpec = graphSpec) {
    const hasChanged = originalSpec !== spec;
    const hasNoEncoding = !Object.keys(spec.encoding).length;
    if (!hasChanged || hasNoEncoding) {
      return;
    }
    const node = historyNode.addChild(spec);
    setHistoryNode(node);
    setOriginalSpec(spec);
  }

  saveRef.current = save;

  return save;
}
