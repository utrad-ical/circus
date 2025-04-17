import React from 'react';
import IconButton from 'components/IconButton';
import { Sizes } from 'react-bootstrap';

const CopyToClipboardButton: React.FC<{
  string: string;
  bsSize?: Sizes;
}> = props => {
  const { string, bsSize } = props;
  if (!('clipboard' in navigator)) return null;
  return (
    <IconButton
      title="Copy to clipboard"
      icon="material-content_copy"
      bsSize={bsSize}
      bsStyle="link"
      onClick={() => navigator.clipboard.writeText(string)}
    />
  );
};

export default CopyToClipboardButton;
