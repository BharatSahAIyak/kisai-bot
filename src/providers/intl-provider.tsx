'use client';
import React, {
  FC,
  ReactElement,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { FullPageLoader } from '../components/fullpage-loader';
import ContextProvider from './context-provider';
import { IntlProvider } from 'react-intl';
import { useConfig } from '../hooks/useConfig';
import mergeConfigurations from '../utils/mergeConfigurations';
import { ThemeContext } from './theme-provider/theme-context';

// function loadMessages(locale: string) {
//     switch (locale) {
//         case 'en':
//             return import('../lang/en.json');
//         // case 'or':
//         //     return import('../../lang/or.json');
//         default:
//             return import('../lang/en.json');
//     }
// }
export const LocaleProvider: FC<{ children: ReactElement }> = ({
  children,
}) => {
  const themeContext = useContext(ThemeContext);
  const [config, setConfig] = useState<any>(null);
  useEffect(() => {
    mergeConfigurations().then((res) => {
      setConfig(res);
      !localStorage.getItem('locale') &&
        localStorage.setItem(
          'locale',
          res?.component?.botDetails?.defaultLanguage
        );
      themeContext?.modifyPaletes(res?.theme?.palette);
    });
  }, []);
  const defaultLang = useMemo(
    () =>
      localStorage.getItem('locale') ||
      config?.component?.botDetails?.defaultLanguage ||
      'en',
    [config]
  );
  const [locale, setLocale] = useState(
    localStorage.getItem('locale') || defaultLang
  );

  useEffect(() => {
    setLocale(defaultLang);
  }, [defaultLang]);

  !localStorage.getItem('locale') && defaultLang !== 'en'
    ? localStorage.setItem('locale', defaultLang as string)
    : '';

  const [localeMsgs, setLocaleMsgs] = useState<Record<string, string> | null>(
    null
  );

  // useEffect(() => {
  //         //@ts-ignore
  //         if(config?.translation?.en)
  //         setLocaleMsgs(config.translation.en);
  // }, [config]);

  if (typeof window === 'undefined')
    return <FullPageLoader loading label="Fetching Locale" />;
  return (
    //@ts-ignore
    <IntlProvider locale={locale} messages={localeMsgs}>
      <ContextProvider
        config={config}
        locale={locale}
        setLocale={setLocale}
        localeMsgs={localeMsgs}
        setLocaleMsgs={setLocaleMsgs}
      >
        {children}
      </ContextProvider>
    </IntlProvider>
  );
};
