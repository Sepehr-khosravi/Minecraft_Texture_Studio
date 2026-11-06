import '../../styles/empty-state.css';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon-wrap">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}