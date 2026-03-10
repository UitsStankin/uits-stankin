export interface TelegramUser {
  id: number,
  userId: number,
  username: string,
  chatId: number,
  assignedUser: number
}

export interface Profile {
  pk: number;
  avatar: string;
  email: string | null;
  firstName: string;
  lastName: string;
  username: string;
  isSuperuser: boolean;
  isModerator: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  isAnonymous: boolean;
  telegramCode: string | null;
  telegramUser: TelegramUser | null;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export type ListUsersParams = {
  is_moderator?: boolean;
  is_teacher?: boolean;
};

