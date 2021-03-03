import React from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import tinycolor from 'tinycolor2';
import useLoginUser from 'utils/useLoginUser';

const brandPrimary = '#168477';

interface CircusTheme {
  background: string;
  secondaryBackground: string;
  primaryText: string;
  border: string;
  activeBackground: string;
  brandPrimary: string;
  brandDark: string;
  brandDarker: string;
  highlightColor: string;
}

const lightTheme: CircusTheme = {
  background: 'white',
  secondaryBackground: '#eeeeee',
  primaryText: 'black',
  border: 'silver',
  activeBackground: '#dddddd',
  brandPrimary,
  brandDark: tinycolor(brandPrimary).darken(10).toString(),
  brandDarker: tinycolor(brandPrimary).darken(20).toString(),
  highlightColor: '#fd3164'
};

const darkTheme: CircusTheme = {
  background: 'black',
  secondaryBackground: '#222222',
  primaryText: 'white',
  border: 'gray',
  activeBackground: '#444444',
  brandPrimary,
  brandDark: tinycolor(brandPrimary).darken(10).toString(),
  brandDarker: tinycolor(brandPrimary).darken(20).toString(),
  highlightColor: '#fd3164'
};

export const CircusThemeProvider: React.FC<{}> = props => {
  const { children } = props;
  const user = useLoginUser();
  const theme =
    user && user.preferences.theme === 'mode_black' ? darkTheme : lightTheme;
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

// This file overrides bootstrap's default styles to support dynamic theming

const GlobalStyle = createGlobalStyle`
  // BODY
  body {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
  }

  // BUTTONS
  .btn.btn-primary {
    background-color: ${(props: any) => props.theme.brandPrimary};
    border-color: ${(props: any) => props.theme.brandDark};
    &:hover {
      background-color: ${(props: any) => props.theme.brandDark};
    }
    &:active {
      background-color: ${(props: any) => props.theme.brandDarker};
    }
  }
  .open > .dropdown-toggle.btn-primary {
    background-color: ${(props: any) => props.theme.brandDarker};
    &:focus {
      background-color: ${(props: any) => props.theme.brandDarker};
    }
    &:hover {
      background-color: ${(props: any) => props.theme.brandDark};
    }
  }
  .btn.btn-link {
    color: ${(props: any) => props.theme.brandPrimary};
  }
  .btn.btn-default {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.primaryText};
  }

  // PANELS
  .panel-primary {
    border-color: ${(props: any) => props.theme.brandPrimary};
    .panel-heading {
      background-color: ${(props: any) => props.theme.brandPrimary};
      border-color: ${(props: any) => props.theme.brandPrimary};
    }
  }

  // DROPDOWNS
  .dropdown-menu {
    background-color: ${(props: any) => props.theme.background};
  }

  // TABLES
  .table-hover > tbody > tr:hover {
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
  }

  // WELL
  .well {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }

  // A
  a {
    color: ${(props: any) => props.theme.brandPrimary}
  }
`;

export default GlobalStyle;
