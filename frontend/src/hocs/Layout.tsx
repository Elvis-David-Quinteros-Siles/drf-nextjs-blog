import Footer from '@/features/footer';
import Navbar from '@/features/navbar';
import { loadProfile, loadUser } from '@/redux/actions/auth/actions';
import { RootState } from '@/redux/reducers';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

interface PageProps {
  children: React.ReactNode;
}

export default function Layout({ children }: PageProps) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadUser());
      dispatch(loadProfile());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-indigo-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
