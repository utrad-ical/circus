import Icon from 'components/Icon';
import React from 'react';
import { Link } from 'react-router-dom';
import { MyList } from 'store/loginUser';
import styled from 'styled-components';
import { Button } from 'components/react-bootstrap';

const MyListArray: React.FC<{
  value: MyList[];
  toUrl: (myListId: string) => string;
  onRenameClick: (myListId: string) => void;
  onDeleteClick: (myListId: string) => void;
}> = props => {
  const { value, toUrl, onRenameClick, onDeleteClick } = props;

  return (
    <StyledUl>
      {value.map(list => (
        <li key={list.myListId}>
          <Link to={toUrl(list.myListId)}>
            <Icon size="xxl" icon="material-folder_open" />
            <span className="name">{list.name}</span>
            <div className="menu">
              <Button
                bsSize="xs"
                bsStyle="primary"
                onClick={ev => {
                  ev.preventDefault();
                  onRenameClick(list.myListId);
                }}
              >
                Rename
              </Button>
              &ensp;
              <Button
                bsSize="xs"
                bsStyle="danger"
                onClick={ev => {
                  ev.preventDefault();
                  onDeleteClick(list.myListId);
                }}
              >
                Delete
              </Button>
            </div>
          </Link>
        </li>
      ))}
    </StyledUl>
  );
};

const StyledUl = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, 200px);
  gap: 8px;
  padding: 0;
  margin: 15 0;
  > li {
    list-style-type: none;
    border: 1px solid silver;
    background: ${(props: any) => props.theme.secondaryBackground};
    min-height: 200px;
    > a {
      display: flex;
      flex-flow: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      &:hover {
        text-decoration: none;
        color: ${(props: any) => props.theme.highlightColor};
      }
      .name {
        margin-top: 5px;
        font-size: 120%;
      }
      .menu {
        margin-top: 15px;
      }
    }
  }
`;

export default MyListArray;
