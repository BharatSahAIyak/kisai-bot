import React, { useCallback, useEffect, useState } from 'react';
import styles from './index.module.css';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from 'react-hot-toast';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { OTPInput } from '../../components/otp-input';
import { useLocalization } from '../../hooks';
import { useRouter } from 'next/router';
import jwt_decode from 'jwt-decode';
import { useCookies } from 'react-cookie';
import { useConfig } from '../../hooks/useConfig';
import axios from 'axios';
import { FormattedMessage } from 'react-intl';
import { IconButton } from '@mui/material';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const OtpPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState(false); 
  const config = useConfig('component', 'otpPage');
  const theme = useColorPalates();
  const { otpLength, resendOtpTimer } = config;
  const router = useRouter();
  const mobile = router.query.state;
  const t = useLocalization();

  const [cookies, setCookie, removeCookie] = useCookies(['access_token']);
  useEffect(() => {
    if (!router.query.state || router.query.state?.length !== 10) {
      router.push('/login');
    }
  }, [router]);

  const verifyOtp = async (userData: any) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/login/otp`,
        userData
      );
      console.log({ response });
      localStorage.setItem('user', JSON.stringify(response?.data?.result?.data?.user));
      return response.data;
    } catch (error) {
      toast.error(`${t('message.invalid_otp')}`);
      console.error(error);
    }
  };

  const resendOtp = async () => {
    try {
      setLoading(true);
      const response = axios.get(
        `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/api/sendOTP?phone=${router.query.state}`
      );
      console.log(response);
      setLoading(false);
      setCountdown(resendOtpTimer);
      toast.success(`${t('message.otp_sent_again')}`);
    } catch (error) {
      setLoading(false);
      console.error('Error resending OTP:', error);
      toast.error(`${t('error.error.sending_otp')}`);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prevCountdown) => prevCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
         if (otp.length === 0) {  
        setOtpError(true);
        toast.error(`${t('message.enter_otp')}`);
        return;
      }

      if (otp.length === Number(otpLength)) {
        setOtpError(false);
        if (navigator.onLine) {
          setLoading(true);
          verifyOtp({
            loginId: router.query.state,
            password: otp,
            applicationId: process.env.NEXT_PUBLIC_USER_SERVICE_APP_ID,
            //@ts-ignore
          }).then((res: any) => {
            console.log({ res });
            setLoading(false);
            if (res.params.status === 'Success') {
              let expires = new Date();
              expires.setTime(
                expires.getTime() + res.result.data.user.tokenExpirationInstant * 1000
              );
              removeCookie('access_token');

              // setCookie('access_token', res.result.data.user.token, {
              //   path: '/',
              //   expires,
              // });
              const phoneNumber = router.query.state;
              // @ts-ignore
              localStorage.setItem('phoneNumber', phoneNumber);
              const decodedToken = jwt_decode(res.result.data.user.token);
              //@ts-ignore
              localStorage.setItem('userID', decodedToken?.sub);
              localStorage.setItem('auth', res.result.data.user.token);
              // @ts-ignore
              // setUserId(analytics, localStorage.getItem("userID"));
              setTimeout(() => {
                router.push('/');
              }, 10);
            } else {
              toast.error(`${t('message.invalid_otp')}`);
            }
          });
        } else {
          toast.error(`${t('label.no_internet')}`);
        }
      }
    },
    [otp.length]
  );

  useEffect(() => setCountdown(resendOtpTimer), []);
  return (
    <>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      ></meta>
      <div className={styles.rightColumn}>
        <div style={{ width: '100%', height: '100%' }}>
          <div className="d-flex pt-2 align-items-center justify-content-center mt-2 w-100">
            <IconButton
              aria-label="fingerprint"
              sx={{
                height: '40px',
                width: '40px',
                borderRadius: '12px',
                border: '1px solid #E8ECF4',
                ml: 1,
              }}
              onClick={() => router.push('/login')}
            >
              <ArrowBackIosNewRoundedIcon />
            </IconButton>
            <Typography
              data-testid="otp-verification-line1"
              variant="h4"
              textAlign="center"
              width="90%"
              color="#1E232C"
              sx={{ m: 1, mr: 6 }}
            >
              {t('message.otp_verification')}
            </Typography>
          </div>
          {/* Form */}
          <Typography
            data-testid="otp-verification-line2"
            variant="subtitle1"
            textAlign="center"
            color="#1E232C"
            sx={{ m: 2 }}
          >
            <FormattedMessage
              id="message.otp_message"
              defaultMessage=""
              values={{
                mobile: mobile,
                br: (chunks) => <br />,
                b: (chunks) => <b>{chunks}</b>,
              }}
            />
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <OTPInput
              separator={<></>}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                setOtpError(false);  
              }}
              length={parseInt(otpLength)}
            />
          </Box>
          {otpError && (
            <Typography color="error" variant="subtitle2" align="center" sx={{ mt: 1 }}>
              {t('message.invalid_otp')}
            </Typography>
          )}
          <div style={{ margin: '10px', textAlign: 'center' }} data-testid="resend-otp">
            {countdown > 0 ? (
              <span>
                <FormattedMessage
                  id="message.wait_minutes"
                  defaultMessage="Please wait {countdown} seconds before resending OTP"
                  values={{ countdown }}
                />
              </span>
            ) : (
              <>
                <Typography variant="subtitle1" align="center" color="#838BA1">
                  {t('message.didnt_receive')} &nbsp;
                  <p
                    onClick={resendOtp}
                    style={{
                      color: theme?.primary?.main || '#3da156',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {t('message.resend_again')}
                  </p>
                </Typography>
              </>
            )}
          </div>
        </div>
        <Button
          data-testid="otp-submit-button"
          fullWidth
          variant="contained"
          sx={{
            textTransform: 'none',
            m: 2,
            height: '60px',
            fontSize: '16px',
            p: 1,
            background: theme?.primary?.main,
            borderRadius: '10px',
            width: '90%',
          }}
          onClick={handleLogin}
          disabled={loading}
          endIcon={<ArrowForwardIcon />}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : `${t('label.submit')}`}
        </Button>
      </div>
    </>
  );
};

export default OtpPage;
