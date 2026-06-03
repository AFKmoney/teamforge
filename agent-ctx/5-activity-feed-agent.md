# Task ID: 5 — Agent Activity Feed

## Agent: activity-feed-agent

## Task: Add Agent Activity Feed panel to sidebar

## Work Summary

Added a real-time Agent Activity Feed section to the IDE sidebar below the Agent Team section, plus a full Activities tab in the bottom panel.

## Changes Made

### `/src/lib/types.ts`
- Added `'activities'` to `IDEBottomTab` union type

### `/src/components/ide-sidebar.tsx`
- Added imports: Activity, Play, CheckCircle2, TestTube2, Rocket, MessageSquare from lucide-react; AgentActivity, AgentRole types; useRef, useEffect from React
- Added `ACTIVITY_TYPE_CONFIG` constant mapping 6 activity types to icons and border colors
- Added `formatRelativeTime()` helper function
- Added `ActivityFeedSection` component with scrollable list (max-h-48), newest-first, showing last 20 activities
- Added `ActivityItem` component with colored left border, activity icon, agent avatar/name, description, timestamp
- Integrated section into sidebar below Agent Team with separator
- Added "View All" link that switches to Activities tab in bottom panel

### `/src/components/ide-bottom-panel.tsx`
- Added imports: AGENT_ROLE_CONFIG, AgentActivity, AgentRole types; Activity, FileCode2, TestTube2, Rocket, MessageSquare icons
- Added `'activities'` tab to BOTTOM_TABS array with Activity icon
- Added `ACTIVITY_TYPE_CONFIG_FULL` constant with full labels for bottom panel view
- Added `ActivitiesView` component with sorted activity list, animated entries, type badges
- Added `formatRelativeTime()` helper function
- Added `case 'activities'` to renderContent switch

## Verification
- Lint passes clean with 0 errors
- Dev server compiles successfully
