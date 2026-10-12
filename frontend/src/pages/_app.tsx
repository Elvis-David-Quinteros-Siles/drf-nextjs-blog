import '@/styles/globals.css';
import '@/styles/slider.css';
import { NextComponentType, NextPageContext } from 'next';
import type { AppProps } from 'next/app';
import { Inter, JetBrains_Mono } from 'next/font/google';
import moment from 'moment';
import 'moment/locale/es';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ThemeProvider } from 'next-themes';

import { Provider } from 'react-redux';
import wrapper from '@/redux/store';
import { PersistGate } from 'redux-persist/integration/react';

moment.locale('es');

const fontSans = Inter({ subsets: ['latin'], display: 'swap' });
const fontMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap' });

export type NextLayoutComponentType<P = {}> = NextComponentType<NextPageContext, any, P> & {
  getLayout?: (page: React.ReactNode) => React.ReactNode;
};

export default function App({ Component, pageProps }: AppProps) {
  const getLayout =
    (Component as NextLayoutComponentType).getLayout || ((page: React.ReactNode) => page);

  const { store, props } = wrapper.useWrappedStore(pageProps);

  return (
    <Provider store={store}>
      <style jsx global>{`
        :root {
          --font-sans: ${fontSans.style.fontFamily};
          --font-mono: ${fontMono.style.fontFamily};
        }
      `}</style>
      {/* Con hijos en forma de función, PersistGate renderiza también en el servidor
          (antes devolvía null hasta rehidratar y el HTML inicial salía vacío). */}
      <PersistGate persistor={(store as any).persistor}>
        {() => (
          <ThemeProvider enableSystem attribute="class" disableTransitionOnChange>
            {getLayout(<Component {...props} />)}
            <ToastContainer position="bottom-right" theme="colored" />
          </ThemeProvider>
        )}
      </PersistGate>
    </Provider>
  );
}
