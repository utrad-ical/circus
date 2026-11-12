import React from 'react';
import { useDispatch } from 'react-redux';
import IconButton from '#components/IconButton.ts';
import { showMessage } from '#store/messages.ts';
import type { Sizes } from 'react-bootstrap';

/**
 * Copies the text using a temporary textarea and `execCommand('copy')`.
 * Deprecated, but this is the only way available in non-secure contexts
 * (plain HTTP), where `navigator.clipboard` is not provided.
 */
const copyWithExecCommand = (text: string): boolean => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  // Keeps the page from scrolling to the textarea
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  const previousFocus = document.activeElement as HTMLElement | null;
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    previousFocus?.focus?.();
  }
};

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falls back below
    }
  }
  return copyWithExecCommand(text);
};

const CopyToClipboardButton: React.FC<{
  string: string;
  bsSize?: Sizes;
}> = props => {
  const { string, bsSize } = props;
  const dispatch = useDispatch();

  const handleClick = async () => {
    const ok = await copyText(string);
    dispatch(
      ok
        ? showMessage('Copied to clipboard.', 'info', { short: true })
        : showMessage('Could not copy to clipboard.', 'danger', {
            short: true
          })
    );
  };

  return (
    <IconButton
      title="Copy to clipboard"
      icon="material-content_copy"
      bsSize={bsSize}
      bsStyle="link"
      onClick={handleClick}
    />
  );
};

export default CopyToClipboardButton;
