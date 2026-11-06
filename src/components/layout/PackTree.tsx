import '../../styles/sidebar.css';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  File as FileIcon,
} from 'lucide-react';
import type { PackNode } from '@shared/types/pack';

interface PackTreeProps {
  node: PackNode;
  depth?: number;
  onFileSelect?: (node: PackNode) => void;
  selectedPath?: string | null;
}

function FileIconFor({ ext }: { ext: string }) {
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return <ImageIcon size={14} />;
  if (ext === 'json' || ext === 'mcmeta') return <FileJson size={14} />;
  if (ext === 'txt' || ext === 'md' || ext === 'properties') return <FileText size={14} />;
  return <FileIcon size={14} />;
}

function TreeNode({ node, depth = 0, onFileSelect, selectedPath }: PackTreeProps) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'dir';
  const selected = selectedPath === node.path;

  const paddingLeft = 8 + depth * 14;

  if (isDir) {
    return (
      <div>
        <button
          className="tree-row tree-row-dir"
          style={{ paddingLeft }}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="tree-chevron">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <span className="tree-icon">
            {open ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span className="tree-label">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      className={`tree-row tree-row-file${selected ? ' selected' : ''}`}
      style={{ paddingLeft: paddingLeft + 16 }}
      onClick={() => onFileSelect?.(node)}
    >
      <span className="tree-icon"><FileIconFor ext={node.ext} /></span>
      <span className="tree-label">{node.name}</span>
    </button>
  );
}

export function PackTree(props: PackTreeProps) {
  return <TreeNode {...props} />;
}
