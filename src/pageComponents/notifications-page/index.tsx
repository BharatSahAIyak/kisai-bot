import { FC, useCallback, useEffect, useState } from 'react';
import styles from './index.module.css';
import { List } from '../../components/list';
import ForumIcon from '@mui/icons-material/Forum';
import InfoIcon from '@mui/icons-material/Info';
import CallIcon from '@mui/icons-material/Call';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { FullPageLoader } from '../../components/fullpage-loader';
import { useLocalization } from '../../hooks';
import { useConfig } from '../../hooks/useConfig';
import Menu from '../../components/menu';
import axios from 'axios';

const NotificationsPage: FC = () => {
  const [isFetching, setIsFetching] = useState(true);
  const theme = useColorPalates();
  const [notifications, setNotifications] = useState<any>([]);
  const [pushNotification, setPushNotification] = useState<any>([]);
  const t = useLocalization();

  const faqConfig = useConfig('component', 'faqPage');

  const downloadPDFHandler = useCallback(() => {
    const link: any = faqConfig?.faqManualPdfLink;
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';

    // window.open(link);

    fetch(proxyUrl + link, {
      method: 'GET',
      headers: {},
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = link;
        a.download = `User_Manual_For_VAWs.pdf`;

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [faqConfig?.faqManualPdfLink]);

  const handleContactClick = useCallback(() => {
    const phoneNumber = `tel:${faqConfig?.faqPhoneNumber}`;
    window.location.href = phoneNumber;
  }, [faqConfig?.faqPhoneNumber]);

  const handleClick = useCallback((activeItem: any) => {
    switch (activeItem?.action) {
      case 'downloadManual':
        downloadPDFHandler();
        break;
      case 'callCenter':
        handleContactClick();
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchNotificationHistory();
  }, []);

  const fetchHistory = useCallback(() => {
    setIsFetching(true);

    const notificationList = [
      {
        label: t('label.notification1_label'),
        secondaryLabel: t('label.notification1_description'),
        icon: <InfoIcon style={{ color: theme?.primary?.main }} />,
        action: 'downloadManual',
        onClick: handleClick,
        isDivider: true,
      },
      {
        label: t('label.notification2_label'),
        secondaryLabel: t('label.notification2_description'),
        icon: <CallIcon style={{ color: theme?.primary?.main }} />,
        action: 'callCenter',
        onClick: handleClick,
        isDivider: true,
      },
    ];

    setNotifications(notificationList);
    setIsFetching(false);
  }, [t, theme, handleClick]);

  const fetchNotificationHistory = useCallback(async () => {
    setIsFetching(true);

    const notificationList = [
      {
        label: t('label.notification1_label'),
        secondaryLabel: t('label.notification1_description'),
        icon: <InfoIcon style={{ color: theme?.primary?.main }} />,
        action: 'downloadManual',
        onClick: handleClick,
        isDivider: true,
      },
      {
        label: t('label.notification2_label'),
        secondaryLabel: t('label.notification2_description'),
        icon: <CallIcon style={{ color: theme?.primary?.main }} />,
        action: 'callCenter',
        onClick: handleClick,
        isDivider: true,
      },
    ];

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BFF_API_URL}/history/notifications/${localStorage.getItem('phoneNumber')}`
      );

      const notificationList2 = res.data.map((item: any) => {
        const payload = item.payload;
        const iconImage = payload.media.find((media: any) => media.caption === 'Icon_Image');

        return {
          label: payload.subject,
          secondaryLabel: payload.text,
          icon: iconImage ? (
            <img src={iconImage.url} alt="Notification Icon" style={{ width: 24, height: 24 }} />
          ) : (
            <InfoIcon style={{ color: theme?.primary?.main }} />
          ),
          action: 'viewNotification',
          onClick: () => {},
          isDivider: true,
        };
      });

      setPushNotification(notificationList2);
    } catch (error) {
      console.log('error in fetching the notification :', error);
    }
  }, [t, theme, handleClick]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <>
      <div className={styles.main}>
        <FullPageLoader
          loading={isFetching}
          color={theme?.primary?.main}
          label="Fetching Notifications"
        />
        <div
          className={styles.title}
          style={{ color: theme?.primary?.main }}
          data-testid="notifications-title"
        >
          {t('label.notifications')}
        </div>
        <div className={styles.list} data-testid="notifications-list">
          {/* <List
            items={notifications}
            noItem={{
              label: t('label.no_notifications'),
              icon: <ForumIcon style={{ color: theme?.primary?.light }} />,
            }}
          /> */}
          <List
            items={pushNotification}
            noItem={{
              label: t('label.no_notifications'),
              icon: <ForumIcon style={{ color: theme?.primary?.light }} />,
            }}
          />
        </div>
        <Menu />
      </div>
    </>
  );
};

export default NotificationsPage;
