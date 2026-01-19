import React from 'react';
import { GroupedStories, UserProfile } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';

interface StoryListProps {
  currentUser: UserProfile;
  stories: GroupedStories[];
  onSelectGroup: (group: GroupedStories) => void;
  onCreateStory: () => void;
}

export const StoryList: React.FC<StoryListProps> = ({ currentUser, stories, onSelectGroup, onCreateStory }) => {
  // Cek apakah user sendiri punya story
  const myStoryGroup = stories.find(s => s.user.id === currentUser.id);
  const otherStories = stories.filter(s => s.user.id !== currentUser.id);

  return (
    <div className="flex gap-4 p-4 overflow-x-auto bg-white dark:bg-telegram-darkSecondary border-b border-gray-100 dark:border-black/20 custom-scrollbar">
      {/* Create Story Button / My Story */}
      <div className="flex flex-col items-center min-w-[64px] cursor-pointer" onClick={() => myStoryGroup ? onSelectGroup(myStoryGroup) : onCreateStory()}>
        <div className={`relative w-14 h-14 rounded-full p-[2px] ${myStoryGroup ? 'bg-gradient-to-tr from-yellow-400 to-purple-500' : 'bg-transparent border border-gray-300 border-dashed'}`}>
           <img 
             src={currentUser.avatar_url || DEFAULT_AVATAR} 
             className="w-full h-full rounded-full object-cover border-2 border-white dark:border-telegram-darkSecondary" 
             alt="Me" 
           />
           {!myStoryGroup && (
               <div className="absolute bottom-0 right-0 bg-telegram-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs border-2 border-white dark:border-telegram-darkSecondary">
                   +
               </div>
           )}
        </div>
        <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 truncate w-16 text-center">Cerita Anda</span>
      </div>

      {/* Friends Stories */}
      {otherStories.map((group) => (
         <div key={group.user.id} className="flex flex-col items-center min-w-[64px] cursor-pointer" onClick={() => onSelectGroup(group)}>
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-purple-500">
               <img 
                 src={group.user.avatar_url || DEFAULT_AVATAR} 
                 className="w-full h-full rounded-full object-cover border-2 border-white dark:border-telegram-darkSecondary" 
                 alt={group.user.username} 
               />
            </div>
            <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 truncate w-16 text-center">
                {group.user.full_name?.split(' ')[0] || group.user.username}
            </span>
         </div>
      ))}
    </div>
  );
};