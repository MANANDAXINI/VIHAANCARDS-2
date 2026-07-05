export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

export function StatCards({ items }) {
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div className="stat-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function StepGuide({ steps, current = 0 }) {
  return (
    <div className="step-guide">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`step-item ${index === current ? "active" : ""} ${index < current ? "done" : ""}`}
        >
          <span className="step-num">{index + 1}</span>
          <span className="step-label">{step}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ message, action }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {action}
    </div>
  );
}
