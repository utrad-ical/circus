import Icon from 'components/Icon';
import React from 'react';
import { Link } from 'react-router-dom';
import { MyList } from 'store/loginUser';
import styled from 'styled-components';

const MyListArray: React.FC<{
  value: MyList[];
  toUrl: (list: MyList) => string;
}> = props => {
  const { value, toUrl } = props;
  return (
    <StyledUl>
      {value.map(list => (
        <li key={list.myListId}>
          <Link to={toUrl(list)}>
            <Icon bsSize="xl" icon="glyphicon-folder-open" />
            <span className="name">{list.name}</span>
          </Link>
        </li>
      ))}
    </StyledUl>
  );
};

const StyledUl = styled.ul`
  display: flex;
  padding: 0;
  margin: 15 0;
  > li {
    list-style-type: none;
    border: 1px solid silver;
    background: #eeeeee;
    width: 180px;
    height: 180px;
    margin: 5px;
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
      .glyphicon {
        font-size: 80px;
      }
      .name {
        margin-top: 5px;
        font-size: 120%;
      }
    }
  }
`;

export default MyListArray;
