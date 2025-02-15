import axios from 'axios';
//@ts-ignore
import Chat from '@samagra-x/chatui';
import React, { ReactElement, useCallback, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../../context';
import { useLocalization } from '../../hooks';
import MessageItem from '../message-item';
import RenderVoiceRecorder from '../recorder/RenderVoiceRecorder';
import toast from 'react-hot-toast';
import { useConfig } from '../../hooks/useConfig';
import ShareButtons from '../share-buttons';
import DowntimePage from '../../pageComponents/downtime-page';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { getMsgType } from '../../utils/getMsgType';
import { recordUserLocation } from '../../utils/location';
import { detectLanguage } from '../../utils/detectLang';
import { debounce } from 'lodash';
import Disclaimer from '../disclaimer';

const ChatUiWindow: React.FC = () => {
  const config = useConfig('component', 'chatUI');
  const homeConfig = useConfig('component', 'homePage');

  const langPopupConfig = useConfig('component', 'langPopup');
  const theme = useColorPalates();
  const secondaryColor = useMemo(() => {
    return theme?.primary?.light;
  }, [theme?.primary?.light]);
  const t = useLocalization();
  const context = useContext(AppContext);
  const { isDown, isMsgReceiving } = context;

  useEffect(() => {
    const fetchData = async () => {
      try {
        await context?.fetchIsDown();
        if (!context?.isDown) {
          const chatHistory = await axios.get(
            `${process.env.NEXT_PUBLIC_BFF_API_URL}/history?userId=${localStorage.getItem(
              'userID'
            )}&channelMessageId=${sessionStorage.getItem('conversationId')}`,
            {
              headers: {
                botId: process.env.NEXT_PUBLIC_BOT_ID || '',
                authorization: `Bearer ${localStorage.getItem('auth')}`,
              },
            }
          );

          console.log('ghji:', chatHistory);
          console.log('history:', chatHistory.data);

          const normalizedChats = normalizedChat(chatHistory?.data);
          console.log('normalized chats', normalizedChats);
          if (normalizedChats.length > 0) {
            context?.setMessages(normalizedChats);
          }
        }
      } catch (error: any) {
        console.error(error);
      }
    };
    recordUserLocation(homeConfig);
    !context?.loading && fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.setMessages, context?.fetchIsDown, context?.isDown]);

  const normalizedChat = (chats: any): any => {
    console.log('in normalized', chats);
    const conversationId = sessionStorage.getItem('conversationId');
    const history = chats
      .filter(
        (item: any) =>
          (conversationId === 'null' || item?.channelMessageId === conversationId) &&
          (item?.to !== 'admin' || !item.payload?.metaData?.hideMessage)
      )
      .map((item: any) => ({
        text: (item?.to === 'admin'
          ? (item?.payload?.metaData?.originalText ?? item?.payload?.text)
          : item?.payload?.text
        )
          ?.replace(/<end\/>/g, '')
          ?.replace(/^Guided:/, ''),
        position: item.to === 'admin' ? 'right' : 'left',
        timestamp: item.timestamp,
        reaction:
          item?.feedback?.type === 'FEEDBACK_POSITIVE'
            ? 1
            : item?.feedback?.type === 'FEEDBACK_NEGATIVE'
              ? -1
              : 0,
        msgId: item.messageId,
        messageId: item.messageId,
        replyId: item.replyId,
        audio_url: item?.audioURL,
        imageUrl: item?.payload?.media?.url,
        isEnd: true,
        optionClicked: true,
        // choices: item?.payload?.buttonChoices,
        isGuided: item?.metaData?.isGuided,
        card: item?.payload?.card,
        choices: [],
        conversationId: item?.channelMessageId,
      }))
      .sort(
        //@ts-ignore
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

    // Hides history chat input box if flow was guided
    if (history?.[0]?.isGuided) {
      context?.setShowInputBox(false);
    }

    console.log('historyyy', history);
    console.log('history length:', history.length);

    return history;
  };

  const handleSend = useCallback(
    async (type: string, msg: any, setMsg?: any) => {
      if (msg.length === 0) {
        toast.error(t('error.empty_msg'));
        return;
      }
      console.log('mssgs:', context?.messages);
      if (type === 'text' && msg.trim()) {
        if (
          context?.languagePopupFlag &&
          context?.locale !== langPopupConfig?.lang &&
          langPopupConfig?.langCheck
        ) {
          const provider = langPopupConfig?.provider;
          const match = langPopupConfig?.match;
          const res = await detectLanguage(msg?.trim()?.split(' ')?.pop() || '', provider, match);
          if (res?.language === langPopupConfig?.match) {
            context?.setShowLanguagePopup(true);
          } else {
            context?.sendMessage(msg.trim(), msg.trim());
            setMsg('');
          }
        } else {
          context?.sendMessage(msg.trim(), msg.trim());
          setMsg('');
        }
      }
    },
    [context, t]
  );

  const debouncedSendMessage = useCallback(debounce(handleSend, 500), [handleSend]);

  const normalizeMsgs = useMemo(
    () =>
      context?.messages?.map((msg: any) => ({
        type: getMsgType(msg),
        content: { text: msg?.text, data: { ...msg } },
        position: msg?.position ?? 'right',
      })),
    [context?.messages]
  );
  console.log('fghj:', { messages: context?.messages, normalizeMsgs });
  const msgToRender = useMemo(() => {
    return context?.loading
      ? [
          ...normalizeMsgs,
          {
            type: 'loader',
            position: 'left',
            botUuid: '1',
          },
        ]
      : normalizeMsgs;
  }, [context?.loading, normalizeMsgs]);

  if (isDown) {
    return <DowntimePage />;
  } else
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <Chat
          btnColor={secondaryColor || 'black'}
          background="var(--bg-color)"
          disableSend={isMsgReceiving}
          showInput={context?.showInputBox}
          //@ts-ignore
          translation={t}
          showTransliteration={
            config?.allowTransliteration &&
            localStorage.getItem('locale') === config?.transliterationOutputLanguage
          }
          transliterationConfig={{
            transliterationApi: config?.transliterationApi + '/transliterate',
            transliterationInputLanguage: config?.transliterationInputLanguage,
            transliterationOutputLanguage: config?.transliterationOutputLanguage,
            transliterationProvider: config?.transliterationProvider,
            transliterationSuggestions: config?.transliterationSuggestions,
          }}
          langDetectionConfig={{
            detectLanguage: detectLanguage,
            languagePopupFlag: context?.languagePopupFlag,
            setShowLanguagePopup: context?.setShowLanguagePopup,
            match: langPopupConfig?.match,
            provider: langPopupConfig?.provider,
            lang: langPopupConfig?.lang,
            langCheck: langPopupConfig?.langCheck,
            locale: context?.locale,
            transliterate: context?.transliterate,
            setTransliterate: context?.setTransliterate,
          }}
          disclaimer={<Disclaimer />}
          //@ts-ignore
          messages={msgToRender}
          voiceToText={RenderVoiceRecorder}
          //@ts-ignore
          renderMessageContent={(props): ReactElement => <MessageItem message={props} />}
          onSend={debouncedSendMessage}
          locale="en-US"
          placeholder={t('message.ask_ur_question')}
        />
        <ShareButtons />
      </div>
    );
};

export default ChatUiWindow;
