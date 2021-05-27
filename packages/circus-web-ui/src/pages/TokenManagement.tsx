import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { confirm } from '@smikitky/rb-components/lib/modal';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  ListGroup,
  InputGroup,
  ListGroupItem,
  Panel,
  FormControl
} from 'components/react-bootstrap';
import TimeDisplay from 'components/TimeDisplay';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import useLoadData from 'utils/useLoadData';
import { CancelToken } from '../utils/cancelToken';

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
        <IconButton
          icon="glyphicon-copy"
          bsSize="xs"
          bsStyle="default"
          onClick={() => navigator.clipboard.writeText(accessToken)}
        />
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
        <Icon icon="bookmark" /> Permanent API Access Tokens
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
                    <Icon icon="bookmark" />
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
                <IconButton
                  bsStyle="warning"
                  icon="remove"
                  onClick={() => handleRemove(token.tokenId)}
                >
                  Remove
                </IconButton>
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
      <InputGroup>
        <FormControl
          type="text"
          placeholder="Description of the new token"
          value={description}
          onChange={(ev: React.BaseSyntheticEvent) =>
            setDescription(ev.target.value)
          }
        ></FormControl>
        <InputGroup.Button>
          <IconButton
            bsStyle="primary"
            disabled={description.length <= 0}
            onClick={handleCreate}
            icon="plus"
          >
            Create
          </IconButton>
        </InputGroup.Button>
      </InputGroup>
    </div>
  );
};

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
