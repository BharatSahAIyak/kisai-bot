import React from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useLocalization } from '../hooks';
import NotificationsPage from '../pageComponents/notifications-page';
import { useConfig } from '../hooks/useConfig';
const History: NextPage = () => {
  const t = useLocalization();
  const config = useConfig('component', 'botDetails');
  return (
    <React.Fragment>
      <Head>
        <title>{t('label.tab_title')}</title>
        <link rel="icon" href={config?.favicon} />
      </Head>
      <NotificationsPage />
    </React.Fragment>
  );
};

export default History;
