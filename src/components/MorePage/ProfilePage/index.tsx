import styles from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useFlags } from 'flagsmith/react';
import ComingSoonPage from '../../coming-soon-page';

const ProfilePage: React.FC = () => {
  const flags = useFlags(['show_profile_page']);

  if (!flags?.show_profile_page?.enabled) {
    return <ComingSoonPage />;
  } else
    return (
      <>
        <div className={styles.container}>
          <h1>Profile Page</h1>
        </div>
      </>
    );
};

export default ProfilePage;
