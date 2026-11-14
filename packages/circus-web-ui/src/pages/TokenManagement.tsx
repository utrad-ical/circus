import Input from '#components/Input.tsx';
import Alert from '#components/Alert.tsx';
import Panel, { PanelList, PanelListItem } from '#components/Panel.tsx';
import Button from '#components/Button.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import { confirm } from '#components/dialogs.tsx';
import Icon from '#components/Icon.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import React, { useCallback, useState } from 'react';
import { api } from '#utils/api.ts';
import useLoadData from '#utils/useLoadData.ts';
import type { CancelToken } from '../utils/cancelToken.ts';
import CopyToClipboardButton from '#components/CopyToClipboardButton.tsx';
import styles from './TokenManagement.module.css';

interface Token {
  tokenId: string;
  description: string;
  createdAt: string;
}

const AccessToken: React.FC<{ accessToken: string }> = props => {
  const { accessToken } = props;
  return (
    <>
      <Alert variant="warning">
        Your access token: <b>{accessToken}</b>
        &ensp;
        <CopyToClipboardButton string={accessToken} />
      </Alert>
      <div>
        Copy and save this token <strong>now</strong>, you cannot show this
        again!
      </div>
    </>
  );
};

const TokenManagement: React.FC<{}> = props => {
  const load = useCallback(async (cancelToken: CancelToken) => {
    return (await api('/tokens', { cancelToken })).items as Token[];
  }, []);
  const [data, isLoading, reload] = useLoadData(load);

  const [accessTokens, setAccessTokens] = useState<{
    [tokenId: string]: string;
  }>({});
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!description.length) return;
    const res = await api('/tokens', {
      method: 'post',
      data: { description }
    });
    const { tokenId, accessToken } = res;
    setAccessTokens(t => ({ ...t, [tokenId]: accessToken }));
    setDescription('');
    reload();
  };

  const handleRemove = async (tokenId: string) => {
    if (
      !(await confirm(
        'Do you really want to remove this token? This cannot be undone.'
      ))
    )
      return;

    await api(`/tokens/${tokenId}`, { method: 'delete' });
    reload();
  };

  return (
    <div>
      <h1>
        <Icon icon="material-bookmarks" /> Permanent API Access Tokens
      </h1>
      <p>
        API tokens can be used to access CIRCUS Rest API programmatically.
        Tokens are bound to your user account.
      </p>
      {data === undefined && <LoadingIndicator delay={300} />}
      {data instanceof Error && <Alert variant="danger">Load error</Alert>}

      <Panel>
        <PanelList>
          {Array.isArray(data) &&
            data.map((token, i) => (
              <PanelListItem
                key={token.tokenId}
                className={styles.item}
                variant={accessTokens[token.tokenId] ? 'info' : undefined}
              >
                <div>
                  <div className={styles.description}>
                    <Icon icon="material-bookmark" />
                    &ensp;
                    {token.description}
                  </div>
                  <div>
                    Created at: <TimeDisplay value={token.createdAt} />
                  </div>
                  {accessTokens[token.tokenId] && (
                    <AccessToken accessToken={accessTokens[token.tokenId]} />
                  )}
                </div>
                <Button
                  variant="danger"
                  icon="material-close"
                  onClick={() => handleRemove(token.tokenId)}
                >
                  Remove
                </Button>
              </PanelListItem>
            ))}
          {Array.isArray(data) && data.length === 0 && (
            <PanelListItem>
              You have not created any permanent access tokens.
            </PanelListItem>
          )}
        </PanelList>
      </Panel>
      <hr />
      <h1>Add new token</h1>
      <div className={styles.newTokenForm}>
        <Input
          placeholder="Description of the new token"
          value={description}
          onChange={ev => setDescription(ev.target.value)}
        />
        <Button
          variant="primary"
          disabled={description.length <= 0}
          onClick={handleCreate}
          icon="material-add"
        >
          Create
        </Button>
      </div>
    </div>
  );
};

export default TokenManagement;
