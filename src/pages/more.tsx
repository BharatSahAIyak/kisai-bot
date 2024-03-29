import React from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useConfig } from "../hooks/useConfig";
import { useLocalization } from '../hooks';
const More: NextPage = () => {
  const t = useLocalization();
  const config = useConfig("component", "botDetails");
  return (
    <React.Fragment>
      <Head>
        <title>{t("label.title")}</title>
        <link rel="icon" href={config?.logo} />
        <meta name="description" content="My page description" />
      </Head>
     
    </React.Fragment>
  );
};

export default More;