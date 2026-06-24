export default function DashboardPage() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-md">
        {/* Primary Action Card */}
        <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[240px] shadow-[0_0_12px_2px_rgba(139,124,255,0.1)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <span className="inline-block px-xs py-base bg-[#1C1C24] text-on-surface-variant rounded text-code-sm font-code-sm mb-sm border border-[#2A2A32]">Continue Learning</span>
            <h1 className="text-display font-display text-on-surface mb-xs">Past Tense Mastery</h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-lg">Module 4: Irregular Verbs in Narrative</p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="flex justify-between items-end gap-md">
              <div className="flex-1 max-w-sm">
                <div className="flex justify-between text-label-md font-label-md text-on-surface-variant mb-xs">
                  <span>Progress</span>
                  <span>65%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <button className="bg-primary-container text-on-primary-container px-md py-sm rounded-lg font-label-md text-label-md hover:bg-inverse-primary transition-colors duration-200 shadow-[0_0_15px_rgba(110,91,255,0.3)] border border-[#8B7CFF]/50 hover:shadow-[0_0_20px_rgba(110,91,255,0.5)]">
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Review Card */}
        <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md col-span-1 flex flex-col hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-auto">
            <div className="p-xs bg-[#1C1C24] rounded-lg border border-[#2A2A32] group-hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-primary">psychology</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-[#E8B339]"></span>
          </div>
          <div className="mt-lg">
            <h3 className="text-headline-md font-headline-md text-on-surface mb-xs">Review Queue</h3>
            <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-xs">
              <span className="text-on-surface font-medium">52 items</span> ready for review
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Scroll */}
      <div className="mb-lg">
        <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Quick Actions</h2>
        <div className="flex gap-md overflow-x-auto pb-sm" style={{ scrollbarWidth: 'none' }}>
          {[
            { icon: 'smart_toy', label: 'AI Tutor' },
            { icon: 'explore', label: 'Real World Missions' },
            { icon: 'workspace_premium', label: 'Exams' },
            { icon: 'translate', label: 'Vocabulary' }
          ].map(action => (
            <button key={action.label} className="flex-shrink-0 w-[200px] bg-[#15151A] border border-[#2A2A32] rounded-lg p-sm flex items-center gap-sm hover:bg-[#1C1C24] hover:border-primary/30 transition-all text-left">
              <div className="p-xs bg-[#1C1C24] rounded border border-[#2A2A32] text-on-surface-variant">
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <span className="text-label-md font-label-md text-on-surface">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl overflow-hidden">
        <div className="p-sm border-b border-[#2A2A32] bg-[#1C1C24]/50">
          <h3 className="text-label-md font-label-md text-on-surface">Recent Activity</h3>
        </div>
        <div className="flex flex-col">
          {[
            { title: 'Conversation Practice', subtitle: 'Restaurant Scenario', icon: 'chat_bubble', xp: '+150 XP' },
            { title: 'Vocabulary Quiz', subtitle: 'Food & Drink', icon: 'quiz', xp: '+80 XP' },
            { title: 'Listening Comprehension', subtitle: 'News Broadcast Excerpt', icon: 'hearing', xp: '+120 XP' }
          ].map((activity, i, arr) => (
            <div key={i} className={`flex items-center justify-between p-sm ${i < arr.length - 1 ? 'border-b border-[#2A2A32]' : ''} hover:bg-[#1C1C24] transition-colors cursor-pointer`}>
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-outline">{activity.icon}</span>
                <div>
                  <p className="text-body-sm font-body-sm text-on-surface">{activity.title}</p>
                  <p className="text-code-sm font-code-sm text-on-surface-variant">{activity.subtitle}</p>
                </div>
              </div>
              <span className="text-code-sm font-code-sm text-primary">{activity.xp}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
