import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { NextPage } from 'next';
import axios from 'axios';
import { AppContext } from '../../context';
import SendButton from './assets/sendButton';
import { useLocalization } from '../../hooks';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import RenderVoiceRecorder from '../../components/recorder-modal/RenderVoiceRecorder';
import { useConfig } from '../../hooks/useConfig';
import DowntimePage from '../downtime-page';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { recordUserLocation } from '../../utils/location';
import saveTelemetryEvent from '../../utils/telemetry';
import FAQ from '../../components/chat-faq';
import { Modal, Box, IconButton, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import styles from './index.module.css';
const ChatPage: NextPage = () => {
  const context = useContext(AppContext);
  const botConfig = useConfig('component', 'chatUI');
  const config = useConfig('component', 'homePage');
  const { micWidth, micHeight } = config;
  const t = useLocalization();
  const inputRef = useRef(null);
  const placeholder = t('message.ask_ur_question');
  const [inputMsg, setInputMsg] = useState('');
  const theme = useColorPalates();
  const secondaryColor = theme?.primary?.main;
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleQuestionClick = (question: string) => {
    setInputMsg(question);
  };

  useEffect(() => {
    context?.fetchIsDown(); // check if server is down

    if (!sessionStorage.getItem('conversationId')) {
      const newConversationId = uuidv4();
      sessionStorage.setItem('conversationId', newConversationId);
      context?.setConversationId(newConversationId);
    }
    recordUserLocation();

    const searchParams = new URLSearchParams(window.location.search);
    const voice = searchParams.get('voice');

    if (voice === 'true') {
      handleOpenModal();
      // Remove the 'voice' query parameter from the URL
      searchParams.delete('voice');
      router.replace({
        pathname: '/newchat',
        search: searchParams.toString(),
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (msg: string) => {
      if (msg.length === 0) {
        toast.error(t('error.empty_msg'));
        return;
      }
      if (context?.newSocket?.socket?.connected) {
        context?.setMessages([]);
        router.push('/chat');
        context?.sendMessage(msg, msg);
      } else {
        toast.error(t('error.disconnected'));
      }
    },
    [context, t, router]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMsg(e.target.value);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage(inputMsg);
      }
    },
    [inputMsg, sendMessage]
  );

  if (context?.isDown) {
    return <DowntimePage />;
  } else {
    return (
      <div className={styles.main} style={{ color: secondaryColor }}>
        {config?.showMic && (
          <div
            className={styles.voiceRecorder}
            style={{ height: micHeight, width: micWidth }}
          >
            <IconButton onClick={handleOpenModal}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: micWidth,
                  height: micHeight,
                  backgroundColor: 'green',
                  borderRadius: '50%',
                }}
              >
                <MicIcon style={{ color: 'white', fontSize: 100 }} />
              </Box>
            </IconButton>
          </div>
        )}
        <Modal
          open={openModal}
          onClose={handleCloseModal}
          aria-labelledby="voice-recorder-modal"
          aria-describedby="voice-recorder"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'green',
              boxShadow: 24,
              p: 4,
              outline: 'none',
              color: 'white',
              width: '80%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {t(`label.help_text`)}
            </Typography>
            <RenderVoiceRecorder
              setInputMsg={(msg: string) => {
                setInputMsg(msg);
                handleCloseModal();
              }}
              tapToSpeak={config?.showTapToSpeakText}
              onCloseModal={handleCloseModal}
            />
          </Box>
        </Modal>

        <div className="faq-section">
          <FAQ onQuestionClick={handleQuestionClick} />
        </div>

        <form onSubmit={(event) => event?.preventDefault()}>
          <div className={styles.inputBox}>
            <textarea
              data-testid="homepage-input-field"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage(inputMsg);
                }
              }}
              style={{ fontFamily: 'NotoSans-Regular' }}
              id="inputBox"
              ref={inputRef}
              rows={1}
              value={inputMsg}
              onChange={handleInputChange}
              placeholder={
                !context?.kaliaClicked
                  ? placeholder
                  : t('label.enter_aadhaar_number')
              }
            />

            <button
              data-testid="homepage-send-button"
              type="submit"
              className={styles.sendButton}
              onClick={() => sendMessage(inputMsg)}
            >
              <SendButton
                width={40}
                height={40}
                color={theme?.primary?.light}
              />
            </button>
          </div>
        </form>
      </div>
    );
  }
};

export default ChatPage;
