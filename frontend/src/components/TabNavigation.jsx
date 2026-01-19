import './TabNavigation.css';

function TabNavigation({ tabs, activeTab, onTabChange, badges = {} }) {
  return (
    <div className="tab-navigation">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
            {badges[tab.id] !== undefined && badges[tab.id] !== null && (
              <span className="tab-badge">{badges[tab.id]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TabNavigation;
