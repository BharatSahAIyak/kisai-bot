import React, { useContext, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AppContext } from '../../context';
import { useLocalization } from '../../hooks';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { useConfig } from '../../hooks/useConfig';
import { ShareButtons as NewShareButtons } from '@samagra-x/stencil-molecules';
import axios from 'axios';

const ShareButtons = () => {
  const config = useConfig('component', 'share-buttons');
  const theme = useColorPalates();
  const secondaryColor = useMemo(() => {
    return theme?.primary?.main;
  }, [theme?.primary?.main]);

  const t = useLocalization();
  const context = useContext(AppContext);
  const [shareLoader, setShareLoader] = useState(false);
  const [downloadLoader, setDownloadLoader] = useState(false);

  const downloadChat = async () => {
    const url = `${
      process.env.NEXT_PUBLIC_PDF_GENERATOR_URL
    }/history/generate-pdf/${sessionStorage.getItem('conversationId')}`;

    return axios.get(url, {
      headers: {
        botId: process.env.NEXT_PUBLIC_BOT_ID || '',
        userId: localStorage.getItem('userID'),
        template: process.env.NEXT_PUBLIC_BOT_NAME?.split('-')?.[0] || 'akai',
      },
    });
  };

  const handleShareButton = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setShareLoader(true);
    try {
      const response = await downloadChat();
      const pdfUrl = response.data.pdfUrl;

      if (!pdfUrl) {
        toast.error(`${t('message.no_link')}`);
        setDownloadLoader(false);
        setShareLoader(false);
        return;
      }

      const responseBlob = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
      });
      const blob = new Blob([responseBlob.data], { type: 'application/pdf' });
      const file = new File([blob], 'Chat.pdf', { type: blob.type });

      if (!navigator.canShare) {
        toast.success(`${t('message.sharing')}`);
        // Handle sharing via Android or context
        if (window?.AndroidHandler?.shareUrl) {
          window.AndroidHandler.shareUrl(pdfUrl);
        } else {
          context?.shareChat(pdfUrl);
        }
      } else if (navigator.canShare({ files: [file] })) {
        toast.success(`${t('message.sharing')}`);
        await navigator
          .share({
            files: [file],
            title: 'Chat',
            text: 'Check out my chat with Bot!',
          })
          .catch((error) => {
            toast.error(error.message);
            console.error('Error sharing', error);
          });
      } else {
        toast.error(`${t('message.cannot_share')}`);
        console.error("Your system doesn't support sharing this file.");
      }
    } catch (error) {
      console.error(error);
      toast.error(t('Error sharing the chat.'));
    } finally {
      setShareLoader(false);
    }
  };

  const handleDownloadButton = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setDownloadLoader(true);
    try {
      const response = await downloadChat();
      const pdfUrl = response.data.pdfUrl;

      if (!pdfUrl) {
        toast.error(`${t('message.no_link')}`);
        return;
      }

      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'Chat.pdf';
      link.click();
      context?.downloadChat(pdfUrl);
      toast.success(t('Download successful!'));
    } catch (error) {
      toast.error(t('Error downloading the chat.'));
      console.error(error);
    } finally {
      setDownloadLoader(false);
    }
  };

  return (
    <NewShareButtons
      allowDownloadChat={config?.allowDownloadChat}
      handleDownloadButton={handleDownloadButton}
      handleShareButton={handleShareButton}
      allowShareChat={config?.allowShareChat}
      shareLoader={shareLoader}
      downloadLoader={downloadLoader}
    />
  );
};

export default ShareButtons;
