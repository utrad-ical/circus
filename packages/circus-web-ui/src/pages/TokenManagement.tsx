import Button from '#components/Button.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import { confirm } from '@smikitky/rb-components/lib/modal';
import Icon from '#components/Icon.tsx';
import {
  ListGroup,
  ListGroupItem,
  Panel,
  FormControl
} from '#components/react-bootstrap.ts';
import TimeDisplay from '#components/TimeDisplay.tsx';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useApi } from '#utils/api.ts';
import useLoadData from '#utils/useLoadData.ts';
import type { CancelToken } from '../utils/cancelToken.ts';
import CopyToClipboardButton from '#components/CopyToClipboardButton.tsx';

interface Token {
  tokenId: string;
  description: string;
  createdAt: string;
}

const AccessToken: React.FC<{ accessToken: string }> = props => {
  const { accessToken } = props;
  return (
    <>
      <div className="alert alert-warning">
        Your access token: <b>{accessToken}</b>
        &ensp;
        <CopyToClipboardButton string={accessToken} />
      </div>
      <div>
        Copy and save this token <strong>now</strong>, you cannot show this
        again!
      </div>
    </>
  );
};

const TokenManagement: React.FC<{}> = props => {
  const api = useApi();
  const load = useCallback(
    async (cancelToken: CancelToken) => {
      return (await api('/tokens', { cancelToken })).items as Token[];
    },
    [api]
  );
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
      {data instanceof Error && (
        <div className="alert alert-danger">Load error</div>
      )}

      <Panel bsStyle="default">
        <ListGroup>
          {Array.isArray(data) &&
            data.map((token, i) => (
              <StyledListGroupItem
                key={token.tokenId}
                bsStyle={accessTokens[token.tokenId] ? 'info' : undefined}
              >
                <div>
                  <div className="description">
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
              </StyledListGroupItem>
            ))}
          {Array.isArray(data) && data.length === 0 && (
            <ListGroupItem>
              You have not created any permanent access tokens.
            </ListGroupItem>
          )}
        </ListGroup>
      </Panel>
      <hr />
      <h1>Add new token</h1>
      <NewTokenForm>
        <FormControl
          type="text"
          placeholder="Description of the new token"
          value={description}
          onChange={(ev: React.BaseSyntheticEvent) =>
            setDescription(ev.target.value)
          }
        ></FormControl>
        <Button
          variant="primary"
          disabled={description.length <= 0}
          onClick={handleCreate}
          icon="material-add"
        >
          Create
        </Button>
      </NewTokenForm>
    </div>
  );
};

const NewTokenForm = styled.div`
  display: flex;
`;

const StyledListGroupItem = styled(ListGroupItem)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  .description {
    font-weight: bold;
    font-size: 110%;
  }
`;

export default TokenManagement;
