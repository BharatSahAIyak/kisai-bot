import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ReactElement, useCallback, useEffect, useState } from 'react';
import '@samagra-x/chatui/dist/index.css';
import 'bootstrap-css-only/css/bootstrap.min.css'
import { Toaster } from 'react-hot-toast';
import { useCookies } from 'react-cookie';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useLogin } from '../hooks';
import FeaturePopup from '../components/feature-popup';
import Provider from '../providers';
import { InstallModal } from '../components/install-modal';
import { FullPageLoader } from '../components/fullpage-loader';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import OnBoardingPage from '../pageComponents/onboarding-page';

const NavBar = dynamic(() => import('../components/navbar'), {
  ssr: false,
});

function SafeHydrate({ children }: { children: ReactElement }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
}

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const { isAuthenticated, login } = useLogin();
  const [cookie, setCookie, removeCookie] = useCookies();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', uuidv4());
    }
  }, []);

  const handleLoginRedirect = useCallback(() => {
    if (router.pathname === '/login' || router.pathname.startsWith('/otp')) {
      // already logged in then send to home
      if (localStorage.getItem('auth') && localStorage.getItem('userID')) {
        console.log("here")
        router.push(sessionStorage.getItem("path") ?? '/');
      }
    } else {
      if(router.query.navbar){
        localStorage.setItem("navbar", router.query.navbar as string);
      }
      sessionStorage.setItem("path", router.asPath);
      if(router.query.auth && router.query.userId){
        // setCookie('access_token', router.query.auth, { path: '/' });
        localStorage.setItem('auth', router.query.auth as string);
        localStorage.setItem('userID', router.query.userId as string);
      }else if (!localStorage.getItem('auth') || !localStorage.getItem('userID')) {
        localStorage.clear();
        sessionStorage.clear();
        removeCookie('access_token', { path: '/' })
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    handleLoginRedirect();
  }, [handleLoginRedirect]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(process.env.NEXT_PUBLIC_BFF_API_URL + '/user/' + localStorage.getItem('userID'), {
        headers: {
          Authorization: process.env.NEXT_PUBLIC_FUSIONAUTH_KEY || '',
          "Service-Url": process.env.NEXT_PUBLIC_FUSIONAUTH_URL || ''
        }
      })
      setUser(res?.data?.user);
    }catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }else if(process.env.NEXT_PUBLIC_SHOW_ONBOARDING === 'true'){
      fetchUser()
    }
  }, [isAuthenticated, login]);

  if (process.env.NODE_ENV === 'production') {
    globalThis.console.log = () => {};
  }

  if (typeof window === 'undefined') return <FullPageLoader loading />;
  if(isAuthenticated && user && !user?.data?.profile){
    return (
      <Provider>
      <OnBoardingPage setUser={setUser}/>
      </Provider>
    )
  }
    return (
      <Provider>
        <>
          <div style={{ height: '100%' }}>
            <Toaster position="top-center" reverseOrder={false} />
            <FeaturePopup />
            {localStorage.getItem("navbar") !== "hidden" &&<InstallModal />}
            {localStorage.getItem("navbar") !== "hidden" && <NavBar />}
            <SafeHydrate>
              <Component {...pageProps} />
            </SafeHydrate>
          </div>
        </>
      </Provider>
    );
  
};

export default App;
