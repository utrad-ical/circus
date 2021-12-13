import React from 'react';
import { createGlobalStyle, css, ThemeProvider } from 'styled-components';
import tinycolor from 'tinycolor2';
import useLoginUser from 'utils/useLoginUser';

const brandPrimary = '#168477';

interface CircusTheme {
  background: string;
  secondaryBackground: string;
  primaryText: string;
  border: string;
  activeBackground: string;
  invalidBackground: string;
  brandPrimary: string;
  brandDark: string;
  brandDarker: string;
  stateInfo: string;
  highlightColor: string;
}

const themes: { [name: string]: CircusTheme } = {
  light: {
    background: 'white',
    secondaryBackground: '#eeeeee',
    primaryText: 'black',
    border: 'silver',
    activeBackground: '#dddddd',
    invalidBackground: 'pink',
    brandPrimary,
    brandDark: tinycolor(brandPrimary).darken(10).toString(),
    brandDarker: tinycolor(brandPrimary).darken(20).toString(),
    stateInfo: '#d9edf7',
    highlightColor: '#fd3164'
  },
  dark: {
    background: 'black',
    secondaryBackground: '#222222',
    primaryText: 'white',
    border: 'darkgray',
    activeBackground: '#444444',
    invalidBackground: '#660000',
    brandPrimary,
    brandDark: tinycolor(brandPrimary).darken(10).toString(),
    brandDarker: tinycolor(brandPrimary).darken(20).toString(),
    stateInfo: '#0a3a52',
    highlightColor: '#fd3164'
  }
};

export const CircusThemeProvider: React.FC<{}> = props => {
  const { children } = props;
  const user = useLoginUser();
  const theme =
    user && user.preferences.theme === 'mode_black'
      ? themes.dark
      : themes.light;
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

/////
// The following overrides bootstrap's default styles to support dynamic theming
/////

const button = (variant: string, bgColor: string, border: string) => {
  const hoverColor = tinycolor(bgColor).darken(10).toString();
  const activeColor = tinycolor(bgColor).darken(20).toString();
  const textColor = tinycolor
    .mostReadable(bgColor, ['#111111', '#ffffff'])
    .toHexString();
  return css`
    .btn.btn-${variant} {
      background-color: ${bgColor};
      border-color: ${border};
      color: ${textColor};
      &:hover {
        background-color: ${hoverColor};
      }
      &:active {
        background-color: ${activeColor};
      }
      &:disabled {
        background-color: ${bgColor};
      }
    }
    .open > .dropdown-toggle.btn-${variant} {
      background-color: ${bgColor};
      color: ${textColor};
      &:focus {
        background-color: ${hoverColor};
        color: ${textColor};
      }
      &:hover {
        background-color: ${activeColor};
        color: ${textColor};
      }
    }
  `;
};

const GlobalStyle = createGlobalStyle`
  // BODY
  body {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
  }

  // BUTTONS
  ${(props: any) =>
    button('primary', props.theme.brandPrimary, props.theme.brandDark)}
  ${(props: any) =>
    button('default', props.theme.background, props.theme.border)}
  .btn.btn-link {
    color: ${(props: any) => props.theme.brandPrimary};
  }

  // PANELS
  .panel-primary {
    border-color: ${(props: any) => props.theme.brandPrimary};
    .panel-heading {
      background-color: ${(props: any) => props.theme.brandPrimary};
      border-color: ${(props: any) => props.theme.brandPrimary};
    }
    .panel-footer {
      background-color: ${(props: any) => props.theme.secondaryBackground};
      border-top-color: transparent;
    }
  }

  // DROPDOWNS
  .dropdown-menu {
    background-color: ${(props: any) => props.theme.background};
    border-color: ${(props: any) => props.theme.border};
    > li > a {
      color: ${(props: any) => props.theme.primaryText};
      &:hover, &:focus {
        background-color: ${(props: any) => props.theme.secondaryBackground};
        color: ${(props: any) => props.theme.primaryText};
      }
    }
  }

  // TABLES
  .table {
    > thead, > tbody, > tfoot {
      > tr {
        > th, > td {
          border-color: ${(props: any) => props.theme.border};
        }
        &.info > td, &.info:hover > td {
          background-color: ${(props: any) => props.theme.stateInfo};
        }
      }
      > thead > tr > th {
        border-color: ${(props: any) => props.theme.border};
      }
    }
  }
  .table-hover > tbody > tr:hover {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }
  .table-striped > tbody > tr:nth-of-type(odd) {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }

  // TABS
  .nav-tabs > li.active {
    a, a:hover, a:focus {
      background-color: ${(props: any) => props.theme.background};
      color: ${(props: any) => props.theme.primaryText};
    }
  }

  // FORM CONTROLS
  .form-control {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
    border-color: ${(props: any) => props.theme.border};
  }
  textarea {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
  }

  // WELL
  .well {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }

  // POPOVER
  .popover {
    background-color: ${(props: any) => props.theme.background};
    border-color: ${(props: any) => props.theme.border};
    &.top > .arrow {
      border-top-color: ${(props: any) => props.theme.border};
      &:after {
        border-top-color: ${(props: any) => props.theme.background};
      }
    }
    &.right > .arrow {
      border-right-color: ${(props: any) => props.theme.border};
      &:after {
        border-right-color: ${(props: any) => props.theme.background};
      }
    }
    &.bottom > .arrow {
      border-bottom-color: ${(props: any) => props.theme.border};
      &:after {
        border-bottom-color: ${(props: any) => props.theme.background};
      }
    }
    &.left > .arrow {
      border-left-color: ${(props: any) => props.theme.border};
      &:after {
        border-left-color: ${(props: any) => props.theme.background};
      }
    }
  }

  // A
  a {
    color: ${(props: any) => props.theme.brandPrimary}
  }

  // MODAL
  .modal-content {
    background-color: ${(props: any) => props.theme.background};
    border-color: ${(props: any) => props.theme.border};
  }
  .close {
    color: ${(props: any) => props.theme.primaryText};
    opacity: 0.5;
  }

  // PAGINATION
  .pagination {
    > li {
      > a, > span {
        background-color: ${(props: any) => props.theme.background};
        color: ${(props: any) => props.theme.primaryText};
        border-color: ${(props: any) => props.theme.border};
        &:hover, &:focus {
          color: ${(props: any) => props.theme.primaryText};
          background-color: ${(props: any) => props.theme.secondaryBackground};
          border-color: ${(props: any) => props.theme.border};
        }
      }
    }
    > .disabled {
      > span,
      > span:hover,
      > span:focus,
      > a,
      > a:hover,
      > a:focus {
        color: ${(props: any) => props.theme.border};
        background-color: ${(props: any) => props.theme.background};
        border-color: ${(props: any) => props.theme.border};
      }
    }
  }
`;

export default GlobalStyle;
