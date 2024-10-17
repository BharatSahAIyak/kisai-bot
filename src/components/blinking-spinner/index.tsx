import { useMemo } from 'react';
import { useColorPalates } from '../../providers/theme-provider/hooks';
import { BlinkingSpinner as ImportedBlinkingSpinner } from '@samagra-x/stencil-molecules';

const BlinkingSpinner = () => {
  const theme = useColorPalates();
  const secondaryColor = useMemo(() => {
    return theme?.primary?.contrastText;
  }, [theme?.primary?.contrastText]);

  return <ImportedBlinkingSpinner spinerStyle={{ backgroundColor: secondaryColor }} />;
};

export default BlinkingSpinner;
