import React, { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
  onChange?: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  defaultTab, 
  className = '',
  onChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="flex overflow-x-auto scrollbar-hide -mb-px px-4 sm:px-6">
          <div className="flex space-x-1 min-w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`
                  py-3 sm:py-4 px-3 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm rounded-t-lg flex-shrink-0
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
                  transition-all duration-200 whitespace-nowrap flex items-center
                `}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon && <span className="mr-2 sm:mr-3">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <div className="mt-6 bg-white rounded-b-lg shadow-sm border border-gray-200 border-t-0">
        <div className="p-4 sm:p-6">
          {tabs.find(tab => tab.id === activeTab)?.content}
        </div>
      </div>
    </div>
  );
};

export default Tabs;