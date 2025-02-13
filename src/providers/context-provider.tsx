'use client';
import {
  FC,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppContext } from '../context';
import _ from 'underscore';
import { v4 as uuidv4 } from 'uuid';
import { useLocalization } from '../hooks';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { UCI } from 'socket-package';
import { XMessage } from '@samagra-x/xmessage';
import { FullPageLoader } from '../components/fullpage-loader';
import WelcomePage from '../pageComponents/welcome-page';
import saveTelemetryEvent from '../utils/telemetry';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

const ContextProvider: FC<{
  config: any;
  locale: any;
  localeMsgs: any;
  setLocale: any;
  children: ReactElement;
  setLocaleMsgs: any;
}> = ({ config, locale, children, localeMsgs, setLocale, setLocaleMsgs }) => {
  const t = useLocalization();
  const [loading, setLoading] = useState(false);
  const [isMsgReceiving, setIsMsgReceiving] = useState(false);
  const [messages, setMessages] = useState<Array<any>>([]);
  const [newSocket, setNewSocket] = useState<any>();
  const socketRef = useRef<any>(null);
  const [showWelcomePage, setShowWelcomePage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    sessionStorage.getItem('conversationId') || uuidv4()
  );
  const [isDown, setIsDown] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  // const [isConnected, setIsConnected] = useState(newSocket?.connected || false);
  const [cookie, setCookie, removeCookie] = useCookies();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [audioElement, setAudioElement] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [clickedAudioUrl, setClickedAudioUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [endTime, setEndTime] = useState(Date.now());
  const [s2tMsgId, sets2tMsgId] = useState('');
  const [kaliaClicked, setKaliaClicked] = useState(false);
  const [showInputBox, setShowInputBox] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [languagePopupFlag, setLanguagePopupFlag] = useState(true); // To not show the popup again until message is sent
  const [transliterate, setTransliterate] = useState(false); // To know whether to transliterate or not
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fetchedMessageId, setFetchedMessageId] = useState<string[]>([]);

  const getFormattedTime = (timestamp: any) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };
  const fetchMessagesWithRetry = useCallback(async () => {
    const retryIntervals = [0, 5000, 3000, 2000, 1000];

    let count = 1;
    const fetchAndProcessMessages = async () => {
      try {
        console.log(
          ` number : ${count++} api call to fetch scoket message through api, and time is ${getFormattedTime(Date.now())}  `
        );
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SOCKET_URL}/botMsg/user/${sessionStorage.getItem('conversationId')}/${localStorage.getItem('userID')}`
        );

        const isMessagePresent = messages.some(
          (msg) => msg?.messageId === response?.data?.messageId
        );
        const isPresentInFetchedMessage = fetchedMessageId?.some(
          (id) => id === response?.data?.messageId
        );

        if (!isPresentInFetchedMessage && isMessagePresent) {
          console.log('meesage id allready present');
        } else {
          if (!isPresentInFetchedMessage) {
            fetchedMessageId.push(response?.data?.messageId);
            console.log('message id is inserted in the fetched message id array', fetchedMessageId);
          }
          const msg = JSON.parse(response?.data?.xmessage);

          const hasEndTag = msg?.payload?.text?.includes('<end/>');

          if (msg.messageType.toUpperCase() === 'IMAGE') {
            if (
              // msg.content.timeTaken + 1000 < timer2 &&
              isOnline
            ) {
              await updateMsgState({
                msg: msg,
                media: { imageUrls: msg?.content?.media_url },
              });
            }
          } else if (msg.messageType.toUpperCase() === 'AUDIO') {
            updateMsgState({
              msg,
              media: { audioUrl: msg?.content?.media_url },
            });
          } else if (msg.messageType.toUpperCase() === 'HSM') {
            updateMsgState({
              msg,
              media: { audioUrl: msg?.content?.media_url },
            });
          } else if (msg.messageType.toUpperCase() === 'VIDEO') {
            updateMsgState({
              msg,
              media: { videoUrl: msg?.content?.media_url },
            });
          } else if (
            msg.messageType.toUpperCase() === 'DOCUMENT' ||
            msg.messageType.toUpperCase() === 'FILE'
          ) {
            updateMsgState({
              msg,
              media: { fileUrl: msg?.content?.media_url },
            });
          } else if (msg.messageType.toUpperCase() === 'TEXT') {
            if (
              // msg.content.timeTaken + 1000 < timer2 &&
              isOnline
            ) {
              await updateMsgState({
                msg: msg,
                media: null,
              });
            }
          }
          if (!hasEndTag) {
            setTimeout(async () => {
              await fetchAndProcessMessages();
            }, 1000);
          }
        }

        return true;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return false;
      }
    };

    for (const interval of retryIntervals) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      const newMessagesAdded = await fetchAndProcessMessages();
      if (newMessagesAdded) return;
    }

    // If no new messages after all retries, add a resend message
    console.log('No response received after all retries. Adding resend message.');
    const resendMessage = {
      text: 'Please resend the above message again <end/>',
      position: 'left',
      payload: {
        textToShow: 'Please resend the above message again <end/>',
      },
      time: Date.now(),
      messageId: uuidv4(),
      conversationId: sessionStorage.getItem('conversationId'),
      repliedTimestamp: Date.now(),
      isEnd: true,
    };
    setMessages((prevMessages) => [...prevMessages, resendMessage]);
    setLoading(false);
    setIsMsgReceiving(false);
    return true;
  }, [messages, setMessages, setLoading, setIsMsgReceiving]);

  useEffect(() => {
    if (
      //@ts-ignore
      config?.component?.welcomePage &&
      //@ts-ignore
      config?.component?.welcomePage?.showWelcomePage
    ) {
      setShowWelcomePage(true);
      setTimeout(() => {
        setShowWelcomePage(false);
      }, 2000);
    }
  }, [config]);

  const downloadChat = useMemo(() => {
    return (e: string) => {
      try {
        //@ts-ignore
        downloadHandler.postMessage(e);
      } catch (err) {
        console.log(err);
      }
    };
  }, []);
  useEffect(() => {
    console.log('trigger', { locale });
    //@ts-ignore
    if (config?.translation && locale) {
      onLocaleUpdate();
    }
  }, [config, locale]);

  const onLocaleUpdate = useCallback(() => {
    //@ts-ignore
    console.log('trigger', { trans: config?.translation, locale });
    //@ts-ignore
    setLocaleMsgs(config?.translation?.[locale]);
  }, [config, locale]);

  const shareChat = useMemo(() => {
    return (e: string) => {
      try {
        //@ts-ignore
        shareUrl.postMessage(e);
      } catch (err) {
        console.log(err);
      }
    };
  }, []);

  const playAudio = useMemo(() => {
    return (url: string, content: any) => {
      if (!url) {
        console.error('Audio URL not provided.');
        return;
      }
      if (audioElement) {
        //@ts-ignore
        if (audioElement.src === url) {
          // If the same URL is provided and audio is paused, resume playback
          //@ts-ignore
          if (audioElement.paused) {
            setClickedAudioUrl(url);
            // setTtsLoader(true);
            audioElement
              //@ts-ignore
              .play()
              .then(() => {
                // setTtsLoader(false);
                setAudioPlaying(true);
                console.log('Resumed audio:', url);
              })
              //@ts-ignore
              .catch((error) => {
                setAudioPlaying(false);
                // setTtsLoader(false);
                setAudioElement(null);
                setClickedAudioUrl(null);
                console.error('Error resuming audio:', error);
              });
          } else {
            // Pause the current audio if it's playing
            //@ts-ignore
            audioElement.pause();
            setAudioPlaying(false);
            console.log('Paused audio:', url);
          }
          return;
        } else {
          // Pause the older audio if it's playing
          //@ts-ignore
          audioElement.pause();
          setAudioPlaying(false);
        }
      }
      setClickedAudioUrl(url);
      // setTtsLoader(true);
      const audio = new Audio(url);
      audio.playbackRate = config?.component?.botDetails?.audioPlayback || 1.5;
      audio.addEventListener('ended', () => {
        setAudioElement(null);
        setAudioPlaying(false);
      });
      audio
        .play()
        .then(() => {
          // setTtsLoader(false);
          setAudioPlaying(true);
          console.log('Audio played:', url);
          // Update the current audio to the new audio element
          //@ts-ignore
          setAudioElement(audio);
        })
        .catch((error) => {
          setAudioPlaying(false);
          // setTtsLoader(false);
          setAudioElement(null);
          setClickedAudioUrl(null);
          console.error('Error playing audio:', error);
        });
    };
  }, [audioElement, config?.component?.botDetails?.audioPlayback]);

  useEffect(() => {
    if (!isOnline) {
      setMessages((prev) => [
        ...prev,
        {
          text: t('message.no_signal'),
          choices: [],
          position: 'left',
          isEnd: true,
          reaction: 0,
          messageId: uuidv4(),
          conversationId: conversationId,
          sentTimestamp: Date.now(),
          btns: true,
          audio_url: '',
        },
      ]);
    }
  }, [isOnline]);

  const checkInternetConnection = () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setLoading(false);
      setIsMsgReceiving(false);
    } else {
      setIsOnline(true);
    }
  };

  useEffect(() => {
    // Initial check
    checkInternetConnection();

    // Set up event listeners to detect changes in the internet connection status
    window.addEventListener('online', checkInternetConnection);
    window.addEventListener('offline', checkInternetConnection);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('online', checkInternetConnection);
      window.removeEventListener('offline', checkInternetConnection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localStorage.getItem('userID')) {
      setNewSocket(
        new UCI(
          URL,
          {
            transportOptions: {
              polling: {
                extraHeaders: {
                  Authorization: `Bearer ${localStorage.getItem('auth')}`,
                  channel: 'akai',
                },
              },
            },
            path: process.env.NEXT_PUBLIC_SOCKET_PATH || '',
            query: {
              deviceId: localStorage.getItem('userID'),
            },
            autoConnect: false,
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            timeout: 2000,
          },
          onMessageReceived
        )
      );
    }
    function cleanup() {
      if (newSocket)
        newSocket.onDisconnect(() => {
          console.log('Socket disconnected');
        });
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorage.getItem('userID')]);

  useEffect(() => {
    socketRef.current = newSocket;
  }, [newSocket]);

  const updateMsgState = useCallback(
    async ({ msg, media }: { msg: any; media: any }) => {
      console.log('updatemsgstate:', msg);
      if (msg?.messageId?.Id && msg?.messageId?.channelMessageId && msg?.messageId?.replyId) {
        if (sessionStorage.getItem('conversationId') === msg.messageId.channelMessageId) {
          const word = msg?.payload?.text || '';

          setMessages((prev: any) => {
            const updatedMessages = [...prev];
            const existingMsgIndex = updatedMessages.findIndex(
              (m: any) => m.messageId === msg.messageId.Id
            );
            console.log('existingMsgIndex', existingMsgIndex);

            if (existingMsgIndex !== -1) {
              // Update the existing message with the new word
              if (word.endsWith('<end/>')) {
                updatedMessages[existingMsgIndex].isEnd = true;
              }
              updatedMessages[existingMsgIndex].text = word.replace(/<end\/>/g, '') + ' ';
            } else {
              // If the message doesn't exist, create a new one
              const newMsg = {
                text: word.replace(/<end\/>/g, '') + ' ',
                isEnd: word.endsWith('<end/>') ? true : false,
                choices: msg?.payload?.buttonChoices,
                position: 'left',
                reaction: 0,
                messageId: msg?.messageId.Id,
                replyId: msg?.messageId.replyId,
                conversationId: msg.messageId.channelMessageId,
                sentTimestamp: Date.now(),
                card: msg?.payload?.card,
                isGuided: msg?.transformer?.metaData?.isGuided || false,
                // btns: msg?.payload?.buttonChoices,
                // audio_url: msg?.content?.audio_url,
                // metaData: msg.payload?.metaData
                //     ? JSON.parse(msg.payload?.metaData)
                //     : null,
                ...media,
              };

              updatedMessages.push(newMsg);
              // console.log('useeffect', newMsg.text);
              try {
                saveTelemetryEvent('0.1', 'E017', 'userQuery', 'responseAt', {
                  botId: process.env.NEXT_PUBLIC_BOT_ID || '',
                  orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
                  userId: localStorage.getItem('userID') || '',
                  phoneNumber: localStorage.getItem('phoneNumber') || '',
                  conversationId: sessionStorage.getItem('conversationId') || '',
                  messageId: msg.messageId.replyId,
                  text: word,
                  timeTaken: 0,
                  createdAt: Math.floor(new Date().getTime() / 1000),
                });
              } catch (err) {
                console.error(err);
              }
            }
            return updatedMessages;
          });
          setIsMsgReceiving(false);
          if (msg?.payload?.text?.endsWith('<end/>')) {
            setEndTime(Date.now());
          }
          setLoading(false);
        }
      }
    },
    [messages]
  );

  useEffect(() => {
    const postTelemetry = async () => {
      console.log('MESSAGE:', messages);
      if (messages.length > 0)
        try {
          await saveTelemetryEvent('0.1', 'E033', 'messageQuery', 'messageReceived', {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
            userId: localStorage.getItem('userID') || '',
            phoneNumber: localStorage.getItem('phoneNumber') || '',
            conversationId: sessionStorage.getItem('conversationId') || '',
            replyId: messages?.[messages.length - 2]?.messageId,
            messageId: messages?.[messages.length - 1]?.messageId,
            text: messages[messages.length - 1]?.text,
            createdAt: Math.floor(new Date().getTime() / 1000),
            timeTaken: endTime - startTime,
          });
        } catch (err) {
          console.log(err);
        }
    };
    postTelemetry();
  }, [endTime]);

  console.log('erty:', { conversationId });

  const onMessageReceived = useCallback(
    async (msg: any) => {
      const parsedMessage = JSON.parse(JSON.stringify(msg));
      console.log(
        'fetchedMesage id arraya and the message id on incomming message',
        fetchedMessageId,
        parsedMessage?.messageId?.Id
      );
      if (fetchedMessageId.some((id: any) => id === parsedMessage?.messageId?.Id)) {
        console.log('id is allready detected so returning from onMessageReceived');
        return;
      }
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      console.log('message recieved through socket at', getFormattedTime(Date.now()));

      const ackMessage = JSON.parse(JSON.stringify(msg));
      ackMessage.messageType = 'ACKNOWLEDGEMENT';
      console.log(msg);
      socketRef?.current?.sendMessage({
        payload: ackMessage,
      });
      // if (!msg?.content?.id) msg.content.id = '';
      if (msg.messageType.toUpperCase() === 'IMAGE') {
        if (
          // msg.content.timeTaken + 1000 < timer2 &&
          isOnline
        ) {
          await updateMsgState({
            msg: msg,
            media: { imageUrls: msg?.content?.media_url },
          });
        }
      } else if (msg.messageType.toUpperCase() === 'AUDIO') {
        updateMsgState({
          msg,
          media: { audioUrl: msg?.content?.media_url },
        });
      } else if (msg.messageType.toUpperCase() === 'HSM') {
        updateMsgState({
          msg,
          media: { audioUrl: msg?.content?.media_url },
        });
      } else if (msg.messageType.toUpperCase() === 'VIDEO') {
        updateMsgState({
          msg,
          media: { videoUrl: msg?.content?.media_url },
        });
      } else if (
        msg.messageType.toUpperCase() === 'DOCUMENT' ||
        msg.messageType.toUpperCase() === 'FILE'
      ) {
        updateMsgState({
          msg,
          media: { fileUrl: msg?.content?.media_url },
        });
      } else if (msg.messageType.toUpperCase() === 'TEXT') {
        if (
          // msg.content.timeTaken + 1000 < timer2 &&
          isOnline
        ) {
          await updateMsgState({
            msg: msg,
            media: null,
          });
        }
      }
    },
    [isOnline, newSocket, updateMsgState]
  );

  console.log('config:', { config });
  //@ts-ignore
  const sendMessage = useCallback(
    async (textToSend: string, textToShow: string, media: any) => {
      console.log('send message called at', getFormattedTime(Date.now()));
      if (!textToShow) textToShow = textToSend;

      setLanguagePopupFlag(true);

      // if (!localStorage.getItem('userID')) {
      //   removeCookie('access_token', { path: '/' });
      //   location?.reload();
      //   return;
      // }
      // console.log('mssgs:', messages)
      setLoading(true);
      setIsMsgReceiving(true);
      console.log('my mssg:', textToSend, textToShow);
      console.log('s2tMsgId:', s2tMsgId);
      const messageId = s2tMsgId ? s2tMsgId : uuidv4();
      console.log('s2t messageId:', messageId);
      const cId = uuidv4();
      newSocket.sendMessage({
        payload: {
          app: process.env.NEXT_PUBLIC_BOT_ID || '',
          payload: {
            text: textToSend?.replace('&', '%26')?.replace(/^\s+|\s+$/g, ''),
            media,
            metaData: {
              phoneNumber: localStorage.getItem('phoneNumber') || '',
              latitude: sessionStorage.getItem('latitude'),
              longitude: sessionStorage.getItem('longitude'),
              city: sessionStorage.getItem('city') || '',
              state: sessionStorage.getItem('state') || '',
              block: sessionStorage.getItem('block') || '',
              district: sessionStorage.getItem('city') || '',
              hideMessage: textToShow?.startsWith('Guided:') || false,
              originalText: textToShow?.replace(/^\s+|\s+$/g, ''),
              userType: sessionStorage.getItem('userType') || '',
            },
          },
          tags: JSON.parse(sessionStorage.getItem('tags') || '[]') || [],
          from: {
            userID: localStorage.getItem('userID'),
          },
          messageId: {
            Id: messageId,
            channelMessageId: sessionStorage.getItem('conversationId') || cId,
          },
        } as Partial<XMessage>,
      });

      if (!sessionStorage.getItem('conversationId')) {
        console.log('convId', cId);
        setConversationId(() => {
          sessionStorage.setItem('conversationId', cId);
          return cId;
        });
      } else sessionStorage.setItem('conversationId', conversationId || '');

      setStartTime(Date.now());
      if (media) {
        if (media.mimeType.slice(0, 5) === 'image') {
          console.log('media', media);
          setMessages((prev: any) => [
            ...prev.map((prevMsg: any) => ({
              ...prevMsg,
            })),
            {
              text: textToShow?.replace(/^\s+|\s+$/g, ''),
              // ?.replace(/^Guided:/, ''),
              position: 'right',
              payload: { media },
              time: Date.now(),
              messageId: messageId,
              conversationId: conversationId,
              repliedTimestamp: Date.now(),
            },
          ]);
        } else if (media.mimeType.slice(0, 5) === 'audio') {
        } else if (media.mimeType.slice(0, 5) === 'video') {
        } else if (media.mimeType.slice(0, 11) === 'application') {
        } else {
        }
      } else {
        if (!textToShow?.startsWith('Guided:')) {
          setMessages((prev: any) => [
            ...prev.map((prevMsg: any) => ({
              ...prevMsg,
            })),
            {
              text: textToShow?.replace(/^\s+|\s+$/g, ''),
              // ?.replace(/^Guided:/, ''),
              position: 'right',
              payload: { textToShow },
              time: Date.now(),
              messageId: messageId,
              conversationId: conversationId,
              repliedTimestamp: Date.now(),
            },
          ]);
        }
      }
      try {
        await saveTelemetryEvent('0.1', 'E032', 'messageQuery', 'messageSent', {
          botId: process.env.NEXT_PUBLIC_BOT_ID || '',
          orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
          userId: localStorage.getItem('userID') || '',
          phoneNumber: localStorage.getItem('phoneNumber') || '',
          conversationId: conversationId || '',
          messageId: messageId,
          text: textToSend || 'NA',
          media: media,
          createdAt: Math.floor(new Date().getTime() / 1000),
        });
      } catch (err) {
        console.error(err);
      }
      sets2tMsgId('');
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => {
        fetchMessagesWithRetry();
      }, 10000);
    },

    [conversationId, newSocket, removeCookie, s2tMsgId, languagePopupFlag]
  );

  const fetchIsDown = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BFF_API_URL}/health/${
          config?.component?.botDetails?.healthCheckTime || 5
        }`
      );
      const status = res.data.status;
      console.log('hie', status);
      if (status === 'OK') {
        setIsDown(false);
      } else {
        setIsDown(true);
        console.log('Server status is not OK');
      }
    } catch (error: any) {
      console.error(error);
    }
  }, [config?.component?.botDetails?.healthCheckTime]);

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

    console.log('historyyy', history);
    console.log('history length:', history.length);

    return history;
  };

  useEffect(() => {
    if (isDown) return;
    let secondTimer: any = null;
    let timer: any = null;
    if (timer || secondTimer) {
      clearTimeout(secondTimer);
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      if (loading) {
        toast.loading(t('message.taking_longer'), { duration: 3000 });
      }
      secondTimer = setTimeout(async () => {
        fetchIsDown();
        console.log('log: here');
        if (loading) {
          console.log('log:', loading);
          try {
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

            if (!chatHistory.data[chatHistory.data.length - 1].response) {
              chatHistory.data[chatHistory.data.length - 1].response = `${t('message.no_signal')}`;
            }
            const normalizedChats = normalizedChat(chatHistory);
            console.log('normalized chats', normalizedChats);
            if (normalizedChats.length > 0) {
              setIsMsgReceiving(false);
              setLoading(false);
              setMessages(normalizedChats);
            }
          } catch (error: any) {
            setIsMsgReceiving(false);
            setLoading(false);
            console.error(error);
          }
        } else if (isMsgReceiving) {
          console.log('log: here');
          const secondLastMsg = messages.length > 2 ? messages[messages.length - 2] : null;
          setMessages((prev: any) => {
            if (prev.length > 0) {
              // Create a new array without the last element
              const updatedMessages = prev.slice(0, -1);
              // Update the state with the new array
              return updatedMessages;
            } else {
              return prev;
            }
          });
          setLoading(true);
          console.log('log:', secondLastMsg);
          if (secondLastMsg) {
            newSocket.sendMessage({
              payload: {
                app: process.env.NEXT_PUBLIC_BOT_ID || '',
                payload: {
                  text: secondLastMsg.text,
                },
                from: {
                  userID: localStorage.getItem('userID'),
                },
                messageId: {
                  channelMessageId: sessionStorage.getItem('conversationId'),
                },
              } as Partial<XMessage>,
            });
          }
        } else {
          setLoading(false);
          setIsMsgReceiving(false);
        }
      }, config?.component?.botDetails?.timer2 || 45000);
    }, config?.component?.botDetails?.timer1 || 30000);

    return () => {
      clearTimeout(timer);
      clearTimeout(secondTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDown,
    isMsgReceiving,
    loading,
    t,
    config?.component?.botDetails?.timer1,
    config?.component?.botDetails?.timer2,
  ]);

  const values = useMemo(
    () => ({
      sendMessage,
      messages,
      setMessages,
      loading,
      setLoading,
      isMsgReceiving,
      setIsMsgReceiving,
      locale,
      setLocale,
      localeMsgs,
      setConversationId,
      newSocket,
      isDown,
      fetchIsDown,
      showFeedbackPopup,
      setShowFeedbackPopup,
      currentQuery,
      setCurrentQuery,
      playAudio,
      audioElement,
      shareChat,
      clickedAudioUrl,
      downloadChat,
      audioPlaying,
      setAudioPlaying,
      config,
      kaliaClicked,
      setKaliaClicked,
      s2tMsgId,
      sets2tMsgId,
      showInputBox,
      setShowInputBox,
      weather,
      setWeather,
      showLanguagePopup,
      setShowLanguagePopup,
      languagePopupFlag,
      setLanguagePopupFlag,
      transliterate,
      setTransliterate,
      isOnline,
    }),
    [
      locale,
      setLocale,
      localeMsgs,
      sendMessage,
      messages,
      setMessages,
      loading,
      setLoading,
      isMsgReceiving,
      setIsMsgReceiving,
      setConversationId,
      newSocket,
      isDown,
      fetchIsDown,
      showFeedbackPopup,
      setShowFeedbackPopup,
      currentQuery,
      setCurrentQuery,
      playAudio,
      audioElement,
      shareChat,
      clickedAudioUrl,
      downloadChat,
      audioPlaying,
      setAudioPlaying,
      config,
      kaliaClicked,
      setKaliaClicked,
      s2tMsgId,
      sets2tMsgId,
      showInputBox,
      setShowInputBox,
      weather,
      setWeather,
      showLanguagePopup,
      setShowLanguagePopup,
      languagePopupFlag,
      setLanguagePopupFlag,
      transliterate,
      setTransliterate,
      isOnline,
    ]
  );

  if (!config) return <FullPageLoader loading label="Loading configuration.." />;

  if (showWelcomePage) return <WelcomePage config={config} />;

  return (
    //@ts-ignore
    <AppContext.Provider value={values}>{children}</AppContext.Provider>
  );
};

export default ContextProvider;
