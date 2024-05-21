import {
  Bubble,
  Image as Img,
  ScrollView,
  List,
  ListItem,
  FileCard,
  Typing,
  Popup,
  RichText,
} from '@samagra-x/chatui';
import {
  FC,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import styles from './index.module.css';
import RightIcon from './assets/right';
import SpeakerIcon from './assets/speaker';
import SpeakerPauseIcon from './assets/speakerPause';
import MsgThumbsUp from './assets/msg-thumbs-up';
import MsgThumbsDown from './assets/msg-thumbs-down';
import { MessageItemPropType } from './index.d';
import { JsonToTable } from '../json-to-table';
import moment from 'moment';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { useConfig } from '../../hooks/useConfig';
import { useLocalization } from '../../hooks';
import { AppContext } from '../../context';
import axios from 'axios';
import saveTelemetryEvent from '../../utils/telemetry';
import BlinkingSpinner from '../blinking-spinner/index';
import Loader from '../loader';
import { MessageType, XMessage } from '@samagra-x/xmessage';
import { divide } from 'lodash';
import { borderRadius } from '@mui/system';

const MessageItem: FC<MessageItemPropType> = ({ message }) => {
  const { content, type } = message;
  const config = useConfig('component', 'chatUI');
  const context = useContext(AppContext);
  const [reaction, setReaction] = useState(content?.data?.reaction?.type);
  const [optionDisabled, setOptionDisabled] = useState(
    content?.data?.optionClicked || false
  );
  const [audioFetched, setAudioFetched] = useState(false);
  const [ttsLoader, setTtsLoader] = useState(false);
  const [popupActive, setPopupActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChoices, setFilteredChoices] = useState([]);
  const t = useLocalization();
  const theme = useColorPalates();
  const secondaryColor = useMemo(() => {
    return theme?.primary?.light;
  }, [theme?.primary?.light]);

  const contrastText = useMemo(() => {
    return theme?.primary?.contrastText;
  }, [theme?.primary?.contrastText]);

  // const getToastMessage = (t: any, reaction: number): string => {
  //   if (reaction === 1) return t('toast.reaction_like');
  //   return t('toast.reaction_reset');
  // };

  const handleSearchChange = (e: any) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query) {
      const results = content?.data?.choices?.choices
        .filter((item: any) => item.text.toLowerCase().includes(query))
        .slice(0, 3);
      setFilteredChoices(results);
    } else {
      setFilteredChoices([]);
    }
  };

  const displayedChoices = searchQuery
    ? filteredChoices
    : content?.data?.choices?.choices?.slice(
        0,
        content?.data?.choices?.isSearchable ? 3 : undefined
      );

  useEffect(() => {
    setReaction(content?.data?.reaction);
  }, [content?.data?.reaction]);

  const onLikeDislike = useCallback(
    ({ value, msgId }: { value: 0 | 1 | -1; msgId: string }) => {
      if (value === 1) {
        context?.newSocket.sendMessage({
          payload: {
            app: process.env.NEXT_PUBLIC_BOT_ID || '',
            from: {
              userID: localStorage.getItem('userID'),
            },
            messageType: MessageType.FEEDBACK_POSITIVE,
            messageId: {
              replyId: msgId,
              channelMessageId: sessionStorage.getItem('conversationId'),
            },
          } as Partial<XMessage>,
        });
      } else if (value === -1) {
        context?.setCurrentQuery(msgId);
        context?.setShowFeedbackPopup(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const feedbackHandler = useCallback(
    ({ like, msgId }: { like: 0 | 1 | -1; msgId: string }) => {
      console.log('vbnm:', { reaction, like });
      // Don't let user change reaction once given
      if (reaction !== 0) return toast.error('Cannot give feedback again');
      if (reaction === 0) {
        setReaction(like);
        return onLikeDislike({ value: like, msgId });
      }
      if (reaction === 1 && like === -1) {
        console.log('vbnm triggered 1');
        setReaction(-1);
        return onLikeDislike({ value: -1, msgId });
      }
      if (reaction === -1 && like === 1) {
        console.log('vbnm triggered 2');
        setReaction(1);
        return onLikeDislike({ value: 1, msgId });
      }
    },
    [onLikeDislike, reaction]
  );

  const getLists = useCallback(
    ({ choices, isWeather = false }: { choices: any; isWeather: Boolean }) => {
      return (
        <List className={`${styles.list}`}>
          {choices?.map((choice: any, index: string) => (
            // {_.map(choices ?? [], (choice, index) => (
            <ListItem
              key={`${index}_${choice?.key}`}
              className={`${styles.onHover} ${styles.listItem}`}
              // @ts-ignore
              style={
                optionDisabled
                  ? {
                      background: 'var(--lightgrey)',
                      color: 'var(--font)',
                      boxShadow: 'none',
                    }
                  : null
              }
              onClick={(e: any): void => {
                e.preventDefault();
                console.log('Option Disabled', optionDisabled);
                if (optionDisabled) {
                  toast.error(
                    `${
                      isWeather
                        ? t('message.wait_before_choosing')
                        : t('message.cannot_answer_again')
                    }`
                  );
                } else {
                  context?.sendMessage(choice?.key, choice?.text);
                  setOptionDisabled(true);
                  setTimeout(
                    () =>
                      document
                        .getElementsByClassName('PullToRefresh')?.[0]
                        ?.scrollTo({
                          top: 999999,
                          left: 0,
                          behavior: 'smooth',
                        }),
                    500
                  );
                  if (isWeather) {
                    setTimeout(() => {
                      console.log('Enabling options again');
                      setOptionDisabled(false);
                    }, 4001);
                  }
                }
              }}>
              <div
                className="onHover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color:
                    content?.data?.position === 'right'
                      ? 'white'
                      : optionDisabled
                      ? 'var(--font)'
                      : 'var(--secondarygreen)',
                }}>
                <div>{choice?.text}</div>
                <div style={{ marginLeft: 'auto' }}>
                  <RightIcon
                    width="30px"
                    color={
                      optionDisabled ? 'var(--font)' : 'var(--secondarygreen)'
                    }
                  />
                </div>
              </div>
            </ListItem>
          ))}
        </List>
      );
    },
    [context, t, optionDisabled]
  );

  useEffect(() => {
    if (content?.data?.choices?.choices?.length > 0) {
      setPopupActive(true);
    }
  }, [content]);

  console.log('here', content);

  const handleAudio = useCallback(
    (url: any) => {
      // console.log(url)
      if (!url) {
        if (audioFetched) toast.error('No audio');
        return;
      }
      context?.playAudio(url, content);
      setTtsLoader(false);
      saveTelemetryEvent('0.1', 'E015', 'userQuery', 'timesAudioUsed', {
        botId: process.env.NEXT_PUBLIC_BOT_ID || '',
        orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
        userId: localStorage.getItem('userID') || '',
        phoneNumber: localStorage.getItem('phoneNumber') || '',
        conversationId: sessionStorage.getItem('conversationId') || '',
        messageId: content?.data?.messageId,
        text: content?.text,
        timesAudioUsed: 1,
      });
    },
    [audioFetched, content, context?.playAudio]
  );

  const downloadAudio = useCallback(() => {
    const fetchAudio = async (text: string) => {
      const startTime = Date.now();
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_AI_TOOLS_API}/text-to-speech`,
          {
            text: text,
            language: context?.locale,
            messageId: content?.data?.messageId,
            conversationId: sessionStorage.getItem('conversationId') || '',
          },
          {
            headers: {
              botId: process.env.NEXT_PUBLIC_BOT_ID || '',
              orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
              userId: localStorage.getItem('userID') || '',
            },
          }
        );
        setAudioFetched(true);
        const endTime = Date.now();
        const latency = endTime - startTime;
        await saveTelemetryEvent(
          '0.1',
          'E045',
          'aiToolProxyToolLatency',
          't2sLatency',
          {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
            userId: localStorage.getItem('userID') || '',
            phoneNumber: localStorage.getItem('phoneNumber') || '',
            conversationId: sessionStorage.getItem('conversationId') || '',
            text: text,
            messageId: content?.data?.messageId,
            timeTaken: latency,
            createdAt: Math.floor(startTime / 1000),
            audioUrl: response?.data?.url || 'No audio URL',
          }
        );
        // cacheAudio(response.data);
        return response?.data?.url;
      } catch (error: any) {
        console.error('Error fetching audio:', error);
        setAudioFetched(true);
        const endTime = Date.now();
        const latency = endTime - startTime;
        await saveTelemetryEvent(
          '0.1',
          'E045',
          'aiToolProxyToolLatency',
          't2sLatency',
          {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
            userId: localStorage.getItem('userID') || '',
            phoneNumber: localStorage.getItem('phoneNumber') || '',
            conversationId: sessionStorage.getItem('conversationId') || '',
            text: text,
            msgId: content?.data?.messageId,
            timeTaken: latency,
            createdAt: Math.floor(startTime / 1000),
            error: error?.message || 'Error fetching audio',
          }
        );
        return null;
      }
    };

    const fetchData = async () => {
      if (!content?.data?.audio_url && content?.data?.position === 'left') {
        const toastId = toast.loading(`${t('message.download_audio')}`);
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 1500);
        const text = content?.data?.card
          ? content?.data?.card?.footer?.title
          : content?.text;
        const audioUrl = await fetchAudio(text ?? 'No text found');

        setTtsLoader(false);
        if (audioUrl) {
          content.data.audio_url = audioUrl;
          handleAudio(audioUrl);
        } else setTtsLoader(false);
      }
    };

    if (content?.data?.audio_url) {
      handleAudio(content.data.audio_url);
    } else {
      setTtsLoader(true);
      fetchData();
    }
  }, [handleAudio, content?.data, content?.text, t]);

  const parseWeatherJson = (data: any) => {
    if (!data || data.length === 0) {
      console.error('Data is undefined or empty.');
      return [];
    }
    const firstKey = Object.keys(data[0])[0] || 'datetime';
    const result = Object.keys(data[0]).reduce((acc: any, key) => {
      if (key !== firstKey) {
        acc.push({
          [firstKey]: key,
          ...data.reduce((obj: any, item: any) => {
            obj[item[firstKey]] = item[key];
            return obj;
          }, {}),
        });
      }
      return acc;
    }, []);
    console.log({ result, data });
    return result;
  };

  switch (type) {
    case 'loader':
      return <Typing />;
    case 'text':
      return (
        <div
          style={{
            position: 'relative',
            maxWidth: '90vw',
          }}>
          <Bubble
            type="text"
            style={
              content?.data?.position === 'right'
                ? {
                    background: secondaryColor,
                    boxShadow: '0 3px 8px rgba(0,0,0,.24)',
                  }
                : {
                    background: contrastText,
                    boxShadow: '0 3px 8px rgba(0,0,0,.24)',
                  }
            }>
            {content?.data?.card ? (
              <div>
                <div
                  style={{
                    background: '#EDEDF1',
                    padding: '10px',
                    fontWeight: 600,
                    color: theme?.primary?.main,
                    textAlign: 'center',
                  }}>
                  <div>{content?.data?.card?.header?.title}</div>
                  <div>{content?.data?.card?.header?.description}</div>
                </div>
                <div>
                  {content?.data?.card?.content?.cells?.map((cell: any) => {
                    return (
                      <div
                        style={{
                          border: '1px solid #EDEDF1',
                          padding: '10px',
                          textAlign: 'center',
                        }}>
                        <div
                          style={{
                            color: theme?.primary?.main,
                          }}>
                          <RichText content={cell?.header} />
                        </div>
                        <div>
                          <RichText content={cell?.footer} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {content?.data?.card?.footer && <div
                  style={{ padding: '20px', borderTop: '1px solid #EDEDF1' }}>
                  <div>
                    <RichText content={content?.data?.card?.footer?.title} />
                  </div>
                  <div>
                    <RichText
                      content={content?.data?.card?.footer?.description}
                    />
                  </div>
                </div>}
              </div>
            ) : (
              <span
                style={{
                  // fontWeight: 600,
                  fontSize: '1rem',
                  color:
                    content?.data?.position === 'right'
                      ? contrastText
                      : secondaryColor,
                }}>
                {content?.text}{' '}
                {content?.data?.position === 'right'
                  ? null
                  : !content?.data?.isEnd && <BlinkingSpinner />}
                {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
                  <div
                    style={{
                      color:
                        content?.data?.position === 'right'
                          ? 'yellow'
                          : 'black',
                      fontSize: '12px',
                      fontWeight: 'normal',
                    }}>
                    <br></br>
                    <span>messageId: {content?.data?.messageId}</span>
                    <br></br>
                    <span>conversationId: {content?.data?.conversationId}</span>
                  </div>
                )}
              </span>
            )}

            {content?.data?.choices?.choices?.length > 0 && (
              <Popup
                isCollapsed={content?.data?.choices?.isCollapsed ?? false}
                height={content?.data?.choices?.isSearchable ? '70vh' : '15vh'}
                onClose={() => {}}
                active={popupActive}
                backdrop={false}
                showClose={false}
                bgColor="transparent"
                title={content?.data?.choices?.header}>
                {displayedChoices.map((item: any) => {
                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '3px',
                        color: 'black',
                        cursor: 'pointer',
                        borderBottom: '2px solid #DDDDDD',
                      }}
                      onClick={() => {
                        setPopupActive(false);
                        if (item?.showTextInput) {
                          context?.setGuidedFlow(false);
                        }
                        context?.sendMessage(item?.key, item?.text);
                      }}>
                      {item.text}
                    </div>
                  );
                })}
                {content?.data?.choices?.isSearchable && (
                  <div
                    style={{
                      padding: '10px',
                      background: '#F4F4F4',
                    }}>
                    <input
                      placeholder="Search"
                      value={searchQuery}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '10px',
                        color: 'black',
                        cursor: 'pointer',
                        border: 'none',
                        outline: 'none',
                        borderRadius: '10px',
                      }}
                      onChange={handleSearchChange}
                    />
                  </div>
                )}
              </Popup>
            )}
            {/* {getLists({
              choices:
                content?.data?.payload?.buttonChoices ?? content?.data?.choices,
                isWeather: false
            })} */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
              <span
                style={{
                  color:
                    content?.data?.position === 'right'
                      ? contrastText
                      : secondaryColor,
                  fontSize: '10px',
                }}>
                {moment(content?.data?.timestamp).format('hh:mm A DD/MM/YYYY')}
              </span>
            </div>
          </Bubble>
          {content?.data?.btns ? (
            <div className={styles.offlineBtns}>
              <button
                onClick={() => window?.location?.reload()}
                style={{
                  border: `2px solid ${secondaryColor}`,
                }}>
                Refresh
              </button>
            </div>
          ) : (
            content?.data?.position === 'left' && (
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  top: '-10px',
                  justifyContent: 'space-between',
                }}>
                {config?.allowTextToSpeech && (
                  <div style={{ display: 'flex' }}>
                    <div
                      // style={{
                      //   border: `1px solid ${theme?.primary?.main}`,
                      // }}
                      className={styles.msgSpeaker}
                      onClick={downloadAudio}
                      style={
                        !content?.data?.isEnd
                          ? {
                              pointerEvents: 'none',
                              filter: 'grayscale(100%)',
                              opacity: '0.5',
                              border: `1px solid ${theme?.primary?.main}`,
                            }
                          : {
                              pointerEvents: 'auto',
                              opacity: '1',
                              filter: 'grayscale(0%)',
                              border: `1px solid ${theme?.primary?.main}`,
                            }
                      }>
                      {context?.clickedAudioUrl === content?.data?.audio_url ? (
                        !context?.audioPlaying ? (
                          <SpeakerIcon color={theme?.primary?.main} />
                        ) : (
                          <SpeakerPauseIcon color={theme?.primary?.main} />
                        )
                      ) : ttsLoader ? (
                        <Loader color={theme?.primary?.main} />
                      ) : (
                        <SpeakerIcon color={theme?.primary?.main} />
                      )}

                      <p
                        style={{
                          fontSize: '11px',
                          // color: contrastText,
                          // fontFamily: 'Mulish-bold',
                          display: 'flex',
                          alignItems: 'flex-end',
                          marginRight: '1px',
                          padding: '0 5px',
                        }}>
                        {t('message.speaker')}
                      </p>
                    </div>
                  </div>
                )}
                {config?.allowFeedback &&
                  (!context?.guidedFlow || content?.data?.card) && (
                    <div className={styles.msgFeedback}>
                      <div
                        className={styles.msgFeedbackIcons}
                        style={{
                          border: `1px solid ${theme?.primary?.main}`,
                        }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                            paddingRight: '6px',
                          }}
                          onClick={() =>
                            feedbackHandler({
                              like: 1,
                              msgId: content?.data?.messageId,
                            })
                          }>
                          <MsgThumbsUp fill={reaction === 1} width="20px" />
                          <p
                            style={{
                              fontSize: '11px',
                              // fontFamily: 'Mulish-bold',
                            }}>
                            {t('label.helpful')}
                          </p>
                        </div>
                        <div
                          style={{
                            height: '32px',
                            width: '1px',
                            backgroundColor: theme?.primary?.main,
                            margin: '6px 0',
                          }}></div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                          }}
                          onClick={() =>
                            feedbackHandler({
                              like: -1,
                              msgId: content?.data?.messageId,
                            })
                          }>
                          <MsgThumbsDown fill={reaction === -1} width="20px" />
                          <p
                            style={{
                              fontSize: '11px',
                              // fontFamily: 'Mulish-bold',
                            }}>
                            {t('label.not_helpful')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )
          )}
        </div>
      );

    case 'image': {
      const url = content?.data?.payload?.media?.url || content?.data?.imageUrl;
      return (
        <>
          {content?.data?.position === 'left' && (
            <div
              style={{
                width: '40px',
                marginRight: '4px',
                textAlign: 'center',
              }}></div>
          )}
          <Bubble type="image">
            <div style={{ padding: '7px' }}>
              <Img src={url} width="299" height="200" alt="image" lazy fluid />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'self-end',
                }}>
                <span
                  style={{
                    color: contrastText,
                    fontSize: '10px',
                  }}>
                  {moment(content?.data?.timestamp).format(
                    'hh:mm A DD/MM/YYYY'
                  )}
                </span>
              </div>
            </div>
          </Bubble>
        </>
      );
    }

    case 'file': {
      const url = content?.data?.payload?.media?.url || content?.data?.fileUrl;
      return (
        <>
          {content?.data?.position === 'left' && (
            <div
              style={{
                width: '40px',
                marginRight: '4px',
                textAlign: 'center',
              }}></div>
          )}
          <Bubble type="image">
            <div style={{ padding: '7px' }}>
              <FileCard file={url} extension="pdf" />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'self-end',
                }}>
                <span
                  style={{
                    color: contrastText,
                    fontSize: '10px',
                  }}>
                  {moment(content?.data?.timestamp).format(
                    'hh:mm A DD/MM/YYYY'
                  )}
                </span>
              </div>
            </div>
          </Bubble>
        </>
      );
    }

    case 'video': {
      const url = content?.data?.payload?.media?.url || content?.data?.videoUrl;
      const videoId = url.split('=')[1];
      return (
        <>
          <Bubble type="image">
            <div style={{ padding: '7px' }}>
              <iframe
                width="100%"
                height="fit-content"
                src={`https://www.youtube.com/embed/` + videoId}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen></iframe>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'self-end',
                }}>
                <span
                  style={{
                    color: contrastText,
                    fontSize: '10px',
                  }}>
                  {moment(content?.data?.timestamp).format(
                    'hh:mm A DD/MM/YYYY'
                  )}
                </span>
              </div>
            </div>
          </Bubble>
        </>
      );
    }
    case 'options': {
      return (
        <>
          <Bubble type="text" className={styles.textBubble}>
            <div style={{ display: 'flex' }}>
              <span className={styles.optionsText}>
                {content?.data?.payload?.text}
                {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
                  <div
                    style={{
                      color: 'black',
                      fontSize: '12px',
                      fontWeight: 'normal',
                    }}>
                    <br></br>
                    <span>messageId: {content?.data?.messageId}</span>
                    <br></br>
                    <span>conversationId: {content?.data?.conversationId}</span>
                  </div>
                )}
              </span>
            </div>
            {getLists({
              choices: content?.data?.choices?.choices,
              isWeather: false,
            })}
          </Bubble>
        </>
      );
    }

    case 'table': {
      console.log({ table: content });
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            maxWidth: '90vw',
          }}>
          <div
            className={
              content?.data?.position === 'right'
                ? styles.messageTriangleRight
                : styles.messageTriangleLeft
            }
            style={
              content?.data?.position === 'right'
                ? {
                    borderColor: `${secondaryColor} transparent transparent transparent`,
                  }
                : {
                    borderColor: `${contrastText} transparent transparent transparent`,
                  }
            }></div>
          <Bubble
            type="text"
            style={
              content?.data?.position === 'right'
                ? {
                    background: secondaryColor,
                    boxShadow: '0 3px 8px rgba(0,0,0,.24)',
                  }
                : {
                    background: contrastText,
                    boxShadow: '0 3px 8px rgba(0,0,0,.24)',
                  }
            }>
            <div
              className={styles.tableContainer}
              style={{ overflowX: 'scroll' }}>
              {
                <JsonToTable
                  json={parseWeatherJson(JSON.parse(content?.text)?.table)}
                />
              }
              <style>
                {`
          div::-webkit-scrollbar-thumb {
            background-color: #d4aa70;
            border-radius: 10px;
          }
        `}
              </style>
            </div>
            <span
              style={{
                // fontWeight: 600,
                fontSize: '1rem',
                color:
                  content?.data?.position === 'right' ? contrastText : 'black',
              }}>
              {`\n` + JSON.parse(content?.text)?.generalAdvice ||
                '' + `\n\n` + JSON.parse(content?.text)?.buttonDescription ||
                ''}
              {getLists({
                choices: JSON.parse(content?.text)?.buttons,
                isWeather: true,
              })}
              {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
                <div
                  style={{
                    color: 'black',
                    fontSize: '12px',
                    fontWeight: 'normal',
                  }}>
                  <br></br>
                  <span>messageId: {content?.data?.messageId}</span>
                  <br></br>
                  <span>conversationId: {content?.data?.conversationId}</span>
                </div>
              )}
            </span>
          </Bubble>
        </div>
      );
    }
    default:
      return (
        <ScrollView
          data={[]}
          // @ts-ignore
          renderItem={(item): ReactElement => <Button label={item.text} />}
        />
      );
  }
};

export default MessageItem;
