import { useState } from 'react';
import './Tree.css';

export interface TreeNode {
  id: number | string;
  [key: string]: any;
  children?: TreeNode[];
}

interface TreeProps {
  data: TreeNode[];
  renderNode: (node: TreeNode, level: number) => React.ReactNode;
  expandedKeys?: Set<number | string>;
  onToggle?: (id: number | string) => void;
}

export default function Tree({ data, renderNode, expandedKeys, onToggle }: TreeProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<number | string>>(new Set());

  const expanded = expandedKeys || internalExpanded;
  const handleToggle = onToggle || ((id: number | string) => {
    const newExpanded = new Set(internalExpanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setInternalExpanded(newExpanded);
  });

  const renderTree = (nodes: TreeNode[], level: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expanded.has(node.id);

      return (
        <div key={node.id} className="tree-node">
          <div 
            className="tree-node-content" 
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <span 
                className={`tree-toggle ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleToggle(node.id)}
              >
                ▶
              </span>
            ) : (
              <span className="tree-toggle-placeholder"></span>
            )}
            {renderNode(node, level)}
          </div>
          {hasChildren && isExpanded && (
            <div className="tree-children">
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return <div className="tree-container">{renderTree(data)}</div>;
}
