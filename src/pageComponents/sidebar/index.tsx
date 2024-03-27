import { useState, useContext } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HistoryIcon from '@mui/icons-material/History';
import HelpIcon from '@mui/icons-material/Help';
import FeedbackIcon from '@mui/icons-material/Feedback';
import LogoutIcon from '@mui/icons-material/Logout';
import { useConfig } from '../../hooks/useConfig';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import router from 'next/router';
import { useCookies } from 'react-cookie';
import { AppContext } from '../../context';
export const Sidebar = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => {
  //   const [config, setConfig] = useState<{
  //     showLangSwitcher: boolean;
  //     languages: { code: string; label: string; }[];
  //     showProfileIcon: boolean;
  //     profileText: string;
  //     links: { label: string; icon: string; route: string; }[];
  //     showLogoutButton: boolean;
  //     logoutButtonLabel: string;
  //   } | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>('en');
  const [cookie, setCookie, removeCookie] = useCookies();
  const context = useContext(AppContext);
  const config = useConfig('component', 'sidebar');
  const theme = useColorPalates();
  const handleLanguageClick = (langCode: string) => {
    setActiveLanguage(langCode);
    onToggle();
  };

  const handleItemClick = () => {
    onToggle();
  };

  function logout() {
    removeCookie('access_token', { path: '/' });
    localStorage.clear();
    sessionStorage.clear();
    context?.setMessages([]);
    router.push('/login');
    if (typeof window !== 'undefined') window.location.reload();
  }
  return (
    <div
      style={{
        background: theme.primary.main,
      }}>
      <Drawer open={isOpen} onClose={onToggle}>
        <Box
          sx={{ width: 300, height: '100vh' }}
          style={{ background: theme.primary.main }}
          role="presentation">
          {config && (
            <List>
              {config.showLangSwitcher && (
                <ListItem disablePadding>
                  <ListItemButton onClick={handleItemClick}>
                    <ListItemIcon>
                      <ArrowBackIcon
                        sx={{ color: theme.primary.contrastText }}
                      />
                    </ListItemIcon>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        width: '100%',
                      }}>
                      {config.languages.map((lang: any, index: number) => (
                        <button
                          key={index}
                          id={lang.code}
                          className={`Sidemenu_button ${
                            lang.code === activeLanguage ? 'active' : ''
                          }`}
                          style={{
                            borderTopLeftRadius: index === 0 ? '10px' : '0',
                            borderBottomLeftRadius: index === 0 ? '10px' : '0',
                            borderTopRightRadius:
                              index === config.languages.length - 1
                                ? '10px'
                                : '0',
                            borderBottomRightRadius:
                              index === config.languages.length - 1
                                ? '10px'
                                : '0',
                            backgroundColor:
                              lang.code === activeLanguage
                                ? theme.primary.light
                                : '#FFFFFF',
                            border: 'none',
                            width: '60px',
                            height: '30px',
                            padding: '5px',
                          }}
                          onClick={() => handleLanguageClick(lang.code)}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </ListItemButton>
                </ListItem>
              )}

              {config.showProfileIcon && (
                <ListItem disablePadding>
                  <ListItemButton sx={{ color: theme.primary.contrastText }}>
                    <ListItemIcon>
                      <AccountCircleIcon
                        sx={{ color: theme.primary.contrastText }}
                      />
                    </ListItemIcon>
                    <ListItemText primary={config.profileText} />
                  </ListItemButton>
                </ListItem>
              )}

              {config.links.map((link: any, index: number) => (
                <div key={index}>
                  <ListItem
                    disablePadding
                    sx={{
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      color: theme.primary.contrastText,
                    }}
                    onClick={() => {
                      {
                        handleItemClick();
                        router.push(`/${link.route}`);
                      }
                    }}>
                    <ListItemButton>
                      <ListItemIcon sx={{ color: theme.primary.contrastText }}>
                        {getIconComponent(link.icon)}
                      </ListItemIcon>
                      <ListItemText primary={`${link.label}`} />
                      <ChevronRightIcon />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </div>
              ))}

              {config.showLogoutButton && (
                <ListItem disablePadding>
                  <ListItemButton
                    sx={{ color: theme.primary.contrastText }}
                    onClick={logout}>
                    <ListItemIcon>
                      <LogoutIcon sx={{ color: theme.primary.contrastText }} />
                    </ListItemIcon>
                    <ListItemText primary={config.logoutButtonLabel} />
                    <ChevronRightIcon />
                  </ListItemButton>
                </ListItem>
              )}
            </List>
          )}
        </Box>
      </Drawer>
    </div>
  );
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'HistoryIcon':
      return <HistoryIcon />;
    case 'HelpIcon':
      return <HelpIcon />;
    case 'FeedbackIcon':
      return <FeedbackIcon />;
    default:
      return null;
  }
};

export default Sidebar;