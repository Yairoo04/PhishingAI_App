import React from 'react';

const Tabs = ({ tabs, activeTab, setActiveTab }) => {
    return (
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`flex-1 min-w-[120px] py-3 px-5 text-center font-medium text-sm sm:text-base transition-all duration-200 ${activeTab === tab.id
                        ? 'border-b-4 border-green-600 text-green-700 dark:text-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-t-lg`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default Tabs;