import React from 'react';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';

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
      <IconButton
        icon={myPersonalEntered ? 'check' : 'user'}
        bsStyle={isConsensual ? 'default' : 'primary'}
        active={!isConsensual}
        onClick={() => onChange(false)}
      >
        Personal Mode
      </IconButton>
      &thinsp;
      <Icon icon="chevron-right" />
      &thinsp;
      <IconButton
        icon={consensualEntered ? 'check' : 'tower'}
        bsStyle={isConsensual ? 'primary' : 'default'}
        active={isConsensual}
        disabled={!consensualEntered && !myPersonalEntered}
        onClick={() => onChange(true)}
      >
        Consensual Mode
      </IconButton>
    </div>
  );
};

export default PersonalConsensualSwitch;
