import { useEffect, useRef, useState } from 'react';
import { GraphSpec, SpecHistoryTree, useModelState } from './bifrost-model';

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
  const [opHistory, setOpHistory] = useModelState('spec_history');
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

  function findHistoriesOnSameLevel(node: SpecHistoryTree): SpecHistoryTree[] {
    const nodesOnSameLevel = opHistory
      .map((history) =>
        history.find((change) => change.parentId === node.parentId)
      )
      .filter((node) => node) as SpecHistoryTree[]; // we sure it's not null
    return nodesOnSameLevel;
  }

  function findNodes(id: number) {
    const nodes = opHistory
      .map((history) => history.find((change) => change.id === id))
      .filter((node) => node) as SpecHistoryTree[]; // we sure it's not null
    return nodes;
  }

  /**
   * Saves graph spec to the current history branch
   * @param spec Graph Spec to save
   */
  function save(spec: GraphSpec = graphSpec) {
    const hasChanged = originalSpec !== spec;
    console.log(hasChanged);
    console.log(originalSpec);
    console.log(spec);
    const hasNoEncoding = !Object.keys(spec.encoding).length;
    if (!hasChanged || hasNoEncoding) {
      return;
    }
    let node: SpecHistoryTree | null = null;
    const siblings = findHistoriesOnSameLevel(historyNode);
    if (!siblings.length) {
      {
        const parentNode = findNodes(historyNode.id)[0];
        node = parentNode.addChild(spec);
      }
    } else {
      const youngerSiblings = siblings.find(
        (sibling) => sibling.id > historyNode.id
      );
      if (!youngerSiblings) {
        if (!historyNode.parentId) {
          node = new SpecHistoryTree(spec, null);
          setOpHistory([...opHistory, node]);
        } else {
          const parentNode = findNodes(historyNode.parentId)[0];
          parentNode.addChild(spec);
        }
      } else {
        if (!historyNode.parentId) {
          historyNode.addChild(spec);
        } else {
          const parentNode = findNodes(historyNode.parentId)[0];
          parentNode.children.splice(
            parentNode.children.indexOf(historyNode),
            1
          );
          node = historyNode.addChild(spec);
          setOpHistory([...opHistory, historyNode]);
        }
      }
    }
    node && setHistoryNode(node);
    setOriginalSpec(spec);
  }

  saveRef.current = save;

  return save;
}
