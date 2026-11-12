import Button from '#components/Button.tsx';
import React from 'react';
import Icon from '#components/Icon.tsx';

const PersonalConsensualSwitch: React.FC<{
  feedbackState: { isConsensual: boolean };
  consensualEntered: boolean;
  myPersonalEntered: boolean;
  onChange: (value: boolean) => void;
}> = props => {
  const {
    feedbackState: { isConsensual },
    consensualEntered,
    myPersonalEntered,
    onChange
  } = props;
  return (
    <div>
      <Button
        icon={
          myPersonalEntered ? 'material-select_check_box' : 'material-person'
        }
        variant={isConsensual ? 'default' : 'primary'}
        pressed={!isConsensual}
        onClick={() => onChange(false)}
      >
        Personal Mode
      </Button>
      &thinsp;
      <Icon icon="material-chevron_right" />
      &thinsp;
      <Button
        icon={
          consensualEntered ? 'material-select_check_box' : 'material-crown'
        }
        variant={isConsensual ? 'primary' : 'default'}
        pressed={isConsensual}
        disabled={!consensualEntered && !myPersonalEntered}
        onClick={() => onChange(true)}
      >
        Consensual Mode
      </Button>
    </div>
  );
};

export default PersonalConsensualSwitch;
