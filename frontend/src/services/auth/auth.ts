import type { Profile } from '@/shared/types/auth.types';

export const createAnonymousProfile = (): Profile => ({
    pk: -1,
    username: 'anonymous',
    isSuperuser: false,
    isModerator: false,
    isTeacher: false,
    isAnonymous: true,
    isStaff: false,
    email: null,
    lastName: '',
    firstName: '',
    avatar: getDefaultUserAvatarPath(),
    telegramCode: null,
    telegramUser: null
  });

export const getDefaultUserAvatarPath = (): string => '/assets/images/avatars/default-user.png';