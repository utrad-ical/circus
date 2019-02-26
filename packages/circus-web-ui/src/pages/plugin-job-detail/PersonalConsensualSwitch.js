import React from 'react';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';

const PersonalConsensualSwitch = props => {
  const { feedbackState: { isConsensual }, onChange } = props;
  return (
    <div>
      <IconButton
        icon="user"
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
        icon="tower"
        bsStyle={isConsensual ? 'primary' : 'default'}
        active={isConsensual}
        onClick={() => onChange(true)}
      >
        Consensual Mode
      </IconButton>
    </div>
  );
};

export default PersonalConsensualSwitch;
