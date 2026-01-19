import React from 'react';
import './ModDependencyWarning.css';

/**
 * Modal component that displays mod compatibility and dependency warnings
 */
function ModDependencyWarning({ checkResult, onProceed, onCancel }) {
  const {
    compatible = false,
    warnings = [],
    dependencies = { direct: [], transitive: [] },
    conflicts = []
  } = checkResult || {};

  const allDependencies = [...(dependencies.direct || []), ...(dependencies.transitive || [])];
  const requiredDeps = allDependencies.filter(d => d.type === 'required');
  const optionalDeps = allDependencies.filter(d => d.type === 'optional');
  const unresolvedDeps = allDependencies.filter(d => !d.versionId);

  const hasIssues = warnings.length > 0 || conflicts.length > 0 || unresolvedDeps.length > 0;

  return (
    <div className="mod-dependency-warning-overlay">
      <div className="mod-dependency-warning">
        <h2>Install Mod - Compatibility Check</h2>

        {/* Compatibility Status */}
        <div className={`compatibility-status ${compatible ? 'compatible' : 'warning'}`}>
          {compatible ? (
            <>
              <span className="status-icon">✓</span>
              <span className="status-text">This mod is compatible with your server</span>
            </>
          ) : (
            <>
              <span className="status-icon">⚠</span>
              <span className="status-text">This mod has compatibility issues</span>
            </>
          )}
        </div>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <div className="section">
            <h3>Warnings</h3>
            <ul className="warning-list">
              {warnings.map((warning, idx) => (
                <li key={idx} className="warning-item">
                  <span className="warning-icon">⚠</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dependencies Section */}
        {requiredDeps.length > 0 && (
          <div className="section">
            <h3>Required Dependencies</h3>
            <p className="section-description">
              These mods will be installed automatically:
            </p>
            <ul className="dependencies-list">
              {requiredDeps.map((dep, idx) => (
                <li key={idx} className={`dep-item ${dep.alreadyInstalled ? 'already-installed' : 'to-install'}`}>
                  <span className="dep-name">{dep.projectId}</span>
                  {dep.alreadyInstalled && (
                    <span className="dep-status installed">Already installed</span>
                  )}
                  {!dep.alreadyInstalled && (
                    <span className="dep-status to-install">Will be installed</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional Dependencies Section */}
        {optionalDeps.length > 0 && (
          <div className="section">
            <h3>Optional Dependencies</h3>
            <p className="section-description">
              These mods are recommended but optional:
            </p>
            <ul className="dependencies-list optional">
              {optionalDeps.map((dep, idx) => (
                <li key={idx} className="dep-item optional">
                  <span className="dep-name">{dep.projectId}</span>
                  <span className="dep-status optional">Optional</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conflicts Section */}
        {conflicts.length > 0 && (
          <div className="section conflicts">
            <h3>Conflicts Found</h3>
            <ul className="conflicts-list">
              {conflicts.map((conflict, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="conflict-icon">✕</span>
                  <span className="conflict-text">
                    <strong>{conflict.projectId}</strong>: {conflict.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unresolved Dependencies */}
        {unresolvedDeps.length > 0 && (
          <div className="section unresolved">
            <h3>Unable to Resolve</h3>
            <p className="section-description">
              Could not find compatible versions for these dependencies:
            </p>
            <ul className="unresolved-list">
              {unresolvedDeps.map((dep, idx) => (
                <li key={idx} className="unresolved-item">
                  {dep.projectId}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${hasIssues ? 'btn-warning' : 'btn-primary'}`}
            onClick={onProceed}
          >
            {hasIssues ? 'Install Anyway' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModDependencyWarning;
