import { RouterProvider } from 'react-router';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './routes';
import ToastViewport from '@shared/ui/Toast';

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      {/*
        Рядом с роутером, а не внутри лейаута: сообщение поднимается
        из мутации и переживает переход между страницами — форма могла
        закрыться раньше, чем пришёл ответ. Внутри лейаута такой тост
        исчезал бы вместе со страницей, которая его подняла.
      */}
      <ToastViewport />
    </QueryProvider>
  );
}

export default App
