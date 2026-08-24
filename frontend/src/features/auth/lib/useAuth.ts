import { createAnonymousProfile } from '../model/profile';

import { useState, useEffect } from 'react';
// Импорт типов и утилит из вашей существующей архитектуры
import { 
  type Profile, 
  type LoginForm 
} from '@/shared/types/auth.types';

// Константа для анонимного профиля (вычисляем один раз)
const ANONYMOUS_PROFILE = createAnonymousProfile();

export function useAuth() {
  // === STATE ===
  const [profile, setProfile] = useState<Profile>(ANONYMOUS_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
  
  // Проверка наличия токена
  const checkAuthStatus = () => {
    return !!localStorage.getItem('access_token');
  };

  // === ЭФФЕКТ ПРИ МОНТИРОВАНИИ ===
  // Проверяем авторизацию при загрузке приложения
  useEffect(() => {
    const initAuth = async () => {
      // Если токена нет — сразу завершаем загрузку
      if (!checkAuthStatus()) {
        setIsLoading(false);
        return;
      }

      try {
        // === ЗДЕСЬ БУДЕТ РЕАЛЬНЫЙ ЗАПРОС К API ===
        // const response = await api.get('/api/users/auth/user/');
        // setProfile(response.data);
        
        // --- ЗАГЛУШКА (MOCK) ДЛЯ ТЕСТА ---
        console.log('Auth: Token found, loading profile...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Имитация успешной загрузки профиля
        setProfile({
          ...ANONYMOUS_PROFILE,
          pk: 1,
          username: 'demo_user',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User',
          isSuperuser: false,
          isModerator: true, // Для тестов даем права
          isAnonymous: false,
        });
        // ---------------------------------
        
      } catch (err) {
        console.error('Auth: Failed to load profile', err);
        // Если ошибка (например, 401) — чистим токен и сбрасываем профиль
        localStorage.removeItem('access_token');
        setProfile(ANONYMOUS_PROFILE);
        setError('Session expired');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // === LOGIN ===
  const login = async (credentials: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // === ЗДЕСЬ БУДЕТ РЕАЛЬНЫЙ ЗАПРОС К API ===
      // const response = await api.post('/api/users/auth/login/', credentials);
      // const token = response.data.token;
      
      // --- ЗАГЛУШКА (MOCK) ---
      console.log('Auth: Logging in...', credentials);
      await new Promise(resolve => setTimeout(resolve, 800));
      const token = 'mock-token-' + Date.now();
      // -----------------------

      // 1. Сохраняем токен
      localStorage.setItem('access_token', token);

      // 2. Обновляем профиль (берем данные из кредов или ответа сервера)
      setProfile({
        ...ANONYMOUS_PROFILE,
        pk: 1,
        username: credentials.email.split('@')[0],
        email: credentials.email,
        firstName: '',
        lastName: '',
        isAnonymous: false,
        isModerator: true, // Тестовые права
      });

      return { success: true };

    } catch (err) {
      console.error('Auth: Login failed', err);
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // === LOGOUT ===
  const logout = async () => {
    try {
      // === ЗДЕСЬ БУДЕТ РЕАЛЬНЫЙ ЗАПРОС К API ===
      // await api.post('/api/users/auth/logout/');
      
      console.log('Auth: Logging out');
    } catch (err) {
      console.error('Auth: Logout error', err);
    } finally {
      // В любом случае чистим всё локально
      localStorage.removeItem('access_token');
      setProfile(ANONYMOUS_PROFILE);
      // Редирект на страницу входа
      window.location.href = '/auth/login';
    }
  };

  // === ВЫЧИСЛЯЕМЫЕ ПРАВА (Business Logic) ===
  // Эти значения пересчитываются автоматически при изменении `profile`
  
  // Аналог canEdit() из Angular
  const canEdit = (profile.isModerator || profile.isSuperuser) && !profile.isAnonymous;
  
  // Аналог isAdmin() из Angular
  const isAdmin = profile.isSuperuser;
  
  // Аналог isTeacher() из Angular
  const isTeacher = (profile.isTeacher || profile.isSuperuser) && !profile.isAnonymous;
  
  // Общая проверка авторизации
  const isAuthenticated = !profile.isAnonymous;

  // === RETURN ===
  return {
    // Данные
    profile,
    isLoading,
    error,
    
    // Методы
    login,
    logout,
    
    // Флаги прав (ready-to-use в компонентах)
    canEdit,
    isAdmin,
    isTeacher,
    isAuthenticated,
  };
}