/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из `model`/`ui`
 * напрямую. Наружу выходят двое — окно формы целиком и хук удаления,
 * как у новостей и конференций.
 */
export { AchievementDialog } from './AchievementDialog';
export { useDeleteAchievement } from './model/useDeleteAchievement';
