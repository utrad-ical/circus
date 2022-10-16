import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { ScrollBarsSettings } from 'store/loginUser';
import React from 'react';
import styled from 'styled-components';

const ScrollbarEditor: et.Editor<ScrollBarsSettings | undefined> = props => {
  const {
    value = { size: 'small', position: 'right', visibility: 'none' },
    onChange
  } = props;

  return (
    <StyledDiv>
      <span>Visibility</span>
      <ShrinkSelect
        bsSize="sm"
        options={{ none: 'None', always: 'Always', hover: 'Hover' }}
        value={value.visibility ?? 'none'}
        onChange={(visibility: 'none' | 'always' | 'hover') =>
          onChange({ ...value, visibility })
        }
      />
      {value.visibility && value.visibility !== 'none' && (
        <>
          <span>Size</span>
          <ShrinkSelect
            bsSize="sm"
            options={{ small: 'Small', large: 'Large' }}
            value={value.size ?? 'small'}
            onChange={(size: 'small' | 'large') => onChange({ ...value, size })}
          />
          <span>Position</span>
          <ShrinkSelect
            bsSize="sm"
            options={{
              right: 'Right',
              left: 'Left',
              top: 'Top',
              bottom: 'Bottom'
            }}
            value={value.position ?? 'right'}
            onChange={(position: 'right' | 'left' | 'top' | 'bottom') =>
              onChange({ ...value, position })
            }
          />
        </>
      )}
    </StyledDiv>
  );
};

export default ScrollbarEditor;

const StyledDiv = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;
