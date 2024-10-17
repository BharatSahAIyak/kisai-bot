import React, { useEffect, useState } from 'react';
import styles from './index.module.css';
import Typography from '@mui/material/Typography';
import { Box } from '@mui/material';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import { toast } from 'react-hot-toast';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { useConfig } from '../../hooks/useConfig';
import axios from 'axios';
import { useLocalization } from '../../hooks';
import Menu from '../../components/menu';
import Sidebar from '../../components/sidebar';

const FeedbackPage: React.FC = () => {
  const [star, setStar] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const theme = useColorPalates();
  const config = useConfig('component', 'feedbackPage');
  const t = useLocalization();

  useEffect(() => {
    const storedRating = localStorage.getItem('feedbackRating');

    if (storedRating && parseInt(storedRating) > 0) {
      setStar(parseInt(storedRating));

      axios
        .get(`${process.env.NEXT_PUBLIC_BFF_API_URL}/feedback/${localStorage.getItem('userID')}`, {
          headers: {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
          },
        })
        .then((res) => {
          const { rating, review } = res.data;

          if (rating) {
            setStar(rating);
            localStorage.setItem('feedbackRating', rating);

            if (review && review.trim()) {
              setReview(review);
              localStorage.setItem('feedbackReview', review);
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      localStorage.removeItem('feedbackReview');
    }
  }, []);

  const handleRatingSubmit = () => {
    if (star === 0) {
      setShowWarning(true);
      toast.error(t('label.empty_rating'));
      return;
    }

    setLoading(true);

    const payload = {
      rating: star,
      review: review.trim(),
    };

    axios
      .post(
        `${process.env.NEXT_PUBLIC_BFF_API_URL}/feedback/${localStorage.getItem('userID')}`,
        payload,
        {
          headers: {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
          },
        }
      )
      .then(() => {
        toast.success(t('label.successful_feedback'));
        localStorage.setItem('feedbackRating', star.toString());
        openSidebar();
      })
      .catch((error) => {
        console.error('Error submitting rating:', error);
        toast.error(t('label.unsuccessful_feedback'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleReviewSubmit = () => {
    if (review.trim() === '') {
      setShowWarning(true);

      return;
    }

    setLoading(true);

    const payload = {
      rating: star,
      review: review.trim(),
    };

    axios
      .post(
        `${process.env.NEXT_PUBLIC_BFF_API_URL}/feedback/${localStorage.getItem('userID')}`,
        payload,
        {
          headers: {
            botId: process.env.NEXT_PUBLIC_BOT_ID || '',
            orgId: process.env.NEXT_PUBLIC_ORG_ID || '',
          },
        }
      )
      .then(() => {
        toast.success(t('label.successful_feedback'));
        localStorage.setItem('feedbackReview', review.trim());
        openSidebar();
      })
      .catch((error) => {
        console.error('Error submitting review:', error);
        toast.error(t('label.unsuccessful_feedback'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className={styles.container}>
      <Box className={styles.main}>
        <Box>
          <Typography
            data-testid="feedback-title"
            sx={{ fontSize: '5vh', fontWeight: 'bold', color: theme.primary.main }}
          >
            {t('label.feedback')}
          </Typography>
        </Box>

        {config?.ratingBox && (
          <Box className={styles.section}>
            <Typography
              data-testid="feedback-rating-title"
              sx={{ fontWeight: 'bold', fontSize: '3vh' }}
            >
              {t('message.rating')}
            </Typography>

            <Rating
              data-testid="feedback-rating-component"
              name="simple-controlled"
              value={star}
              max={config?.ratingMaxStars || 5}
              onChange={(event, newValue) => {
                setStar(newValue || 1);
              }}
              defaultValue={1}
              sx={{ fontSize: '6vh' }}
            />
            <Typography
              data-testid="feedback-rating-description"
              sx={{ textAlign: 'center', fontSize: '2vh' }}
            >
              {t('message.rating_description')}
            </Typography>
            <Button
              data-testid="feedback-rating-button"
              variant="contained"
              sx={{
                mt: 2,
                backgroundColor: `${theme.primary.main}`,
                fontWeight: 'bold',
                borderRadius: '10rem',
                fontSize: '1.5vh',
                p: 1.5,
                '&:hover': { backgroundColor: `${theme.primary.dark}` },
              }}
              onClick={handleRatingSubmit}
            >
              {t('label.submit_review')}
            </Button>
            {showWarning && (
              <Typography sx={{ color: 'red', fontSize: '1.5vh', textAlign: 'center' }}>
                {t('label.click_here')}
              </Typography>
            )}
          </Box>
        )}

        {config?.reviewBox && (
          <Box className={styles.section}>
            <Typography
              data-testid="feedback-review-title"
              sx={{ m: '1rem', fontWeight: 'bold', fontSize: '3vh' }}
            >
              {t('message.review')}
            </Typography>
            <textarea
              data-testid="feedback-review-component"
              placeholder={t('message.review_description')}
              value={review}
              className={styles.textBlock}
              style={{ border: `2px solid ${theme.primary.main}` }}
              onChange={(e) => {
                setReview(e.target.value);
                setShowWarning(false);
              }}
            />

            <Button
              id="reviewBtn"
              variant="contained"
              data-testid="feedback-review-button"
              sx={{
                mt: 2,
                backgroundColor: `${theme.primary.main}`,
                fontWeight: 'bold',
                borderRadius: '10rem',
                fontSize: '1.5vh',
                p: 1.5,
                '&:hover': { backgroundColor: `${theme.primary.dark}` },
              }}
              onClick={handleReviewSubmit}
            >
              {t('label.submit_review')}
            </Button>
          </Box>
        )}
      </Box>

      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <Menu />
    </div>
  );
};

export default FeedbackPage;
