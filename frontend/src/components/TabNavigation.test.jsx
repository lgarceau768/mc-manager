import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabNavigation from './TabNavigation';

describe('TabNavigation', () => {
  const mockTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'console', label: 'Console', icon: '💻' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  it('renders all tabs', () => {
    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Console')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the active tab with active class', () => {
    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="console"
        onTabChange={() => {}}
      />
    );

    const consoleButton = screen.getByRole('button', { name: /Console/i });
    expect(consoleButton).toHaveClass('active');

    const overviewButton = screen.getByRole('button', { name: /Overview/i });
    expect(overviewButton).not.toHaveClass('active');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();

    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={onTabChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });

  it('renders tab icons when provided', () => {
    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('💻')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('renders badges when provided', () => {
    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
        badges={{ console: 5, settings: 0 }}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('does not render badge when value is null or undefined', () => {
    render(
      <TabNavigation
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
        badges={{ console: null, settings: undefined }}
      />
    );

    const badges = document.querySelectorAll('.tab-badge');
    expect(badges).toHaveLength(0);
  });

  it('renders tabs without icons', () => {
    const tabsWithoutIcons = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' }
    ];

    render(
      <TabNavigation
        tabs={tabsWithoutIcons}
        activeTab="tab1"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });
});
