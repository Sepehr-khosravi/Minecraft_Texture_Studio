import { Boxes, FolderOpen } from 'lucide-react';
import type { OpenPack, PackNode } from '@shared/types/pack';
import { PackTree } from './PackTree';
import '../../styles/sidebar.css';

interface LeftSidebarProps {
  pack: OpenPack | null;
  onFileSelect?: (node: PackNode) => void;
  selectedPath?: string | null;
  onRequestDelete?: (path: string) => void;
}

export function LeftSidebar({ pack, onFileSelect, selectedPath, onRequestDelete }: LeftSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Explorer</span>
        {pack && (
          <span className="sidebar-badge" title={pack.root}>
            {pack.name}
          </span>
        )}
      </div>

      <div className="sidebar-body">
        {!pack ? (
          <div className="sidebar-empty">
            <Boxes size={22} />
            <p>No pack open</p>
            <span>Create or open a resource pack to see its files.</span>
          </div>
        ) : (
          <PackTree
            node={pack.tree}
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
            onRequestDelete={onRequestDelete}
          />
        )}
      </div>

      {pack && (
        <div className="sidebar-footer">
          <FolderOpen size={12} />
          <span className="truncate" title={pack.root}>{pack.root}</span>
        </div>
      )}
    </aside>
  );
}