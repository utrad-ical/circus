import { createGlobalStyle } from 'styled-components';
import tinycolor from 'tinycolor2';

const brandPrimary = '#168477';
const backgroundLight = 'white';
const backgroundDark = 'black';

interface CircusTheme {
  background: string;
  backgroundDark: string;
  backgroundDarker: string;
  backgroundText: string;
  secondaryBackground: string;
  primaryText: string;
  border: string;
  activeBackground: string;
  invalidBackground: string;
  brandPrimary: string;
  brandDark: string;
  brandDarker: string;
  brandText: string;
  stateInfo: string;
  highlightColor: string;
}

export const themes: { [name: string]: CircusTheme } = {
  light: {
    background: backgroundLight,
    backgroundDark: tinycolor(backgroundLight).darken(10).toString(),
    backgroundDarker: tinycolor(backgroundLight).darken(20).toString(),
    backgroundText: tinycolor
      .mostReadable(backgroundLight, ['#111111', '#ffffff'])
      .toHexString(),
    secondaryBackground: '#eeeeee',
    primaryText: 'black',
    border: 'silver',
    activeBackground: '#dddddd',
    invalidBackground: 'pink',
    brandPrimary,
    brandDark: tinycolor(brandPrimary).darken(10).toString(),
    brandDarker: tinycolor(brandPrimary).darken(20).toString(),
    brandText: tinycolor
      .mostReadable(brandPrimary, ['#111111', '#ffffff'])
      .toHexString(),
    stateInfo: '#d9edf7',
    highlightColor: '#fd3164'
  },
  dark: {
    background: backgroundDark,
    backgroundDark: tinycolor(backgroundDark).lighten(10).toString(),
    backgroundDarker: tinycolor(backgroundDark).lighten(20).toString(),
    backgroundText: tinycolor
      .mostReadable(backgroundDark, ['#111111', '#ffffff'])
      .toHexString(),
    secondaryBackground: '#222222',
    primaryText: 'white',
    border: 'darkgray',
    activeBackground: '#444444',
    invalidBackground: '#660000',
    brandPrimary,
    brandDark: tinycolor(brandPrimary).darken(10).toString(),
    brandDarker: tinycolor(brandPrimary).darken(20).toString(),
    brandText: tinycolor
      .mostReadable(brandPrimary, ['#111111', '#ffffff'])
      .toHexString(),
    stateInfo: '#0a3a52',
    highlightColor: '#fd3164'
  }
};

/////
// The following overrides bootstrap's default styles to support dynamic theming
/////

const button = (
  variant: string,
  colorVarName: string,
  borderVarName: string
) => `
  .btn.btn-${variant} {
    background-color: var(${colorVarName});
    border-color: var(${borderVarName});
    color: var(${colorVarName}-text);
    &:hover {
      background-color: var(${colorVarName}-dark);
    }
    &:active {
      background-color: var(${colorVarName}-darker);
    }
    &:disabled {
      background-color: var(${colorVarName});
    }
  }
  .open > .dropdown-toggle.btn-${variant} {
    background-color: var(${colorVarName});
    color: var(${colorVarName}-text);
    &:focus {
      background-color: var(${colorVarName}-dark);
      color: var(${colorVarName}-text);
    }
    &:hover {
      background-color: var(${colorVarName}-darker);
      color: var(${colorVarName}-text);
    }
  }
`;

const GlobalStyle = createGlobalStyle<{ theme: CircusTheme }>`
  :root {
    --circus-background: ${(props: { theme: CircusTheme }) => props.theme.background};
    --circus-background-dark: ${(props: { theme: CircusTheme }) => props.theme.backgroundDark};
    --circus-background-darker: ${(props: { theme: CircusTheme }) => props.theme.backgroundDarker};
    --circus-background-text: ${(props: { theme: CircusTheme }) => props.theme.backgroundText};
    --circus-secondary-background: ${(props: { theme: CircusTheme }) => props.theme.secondaryBackground};
    --circus-primary-text: ${(props: { theme: CircusTheme }) => props.theme.primaryText};
    --circus-border: ${(props: { theme: CircusTheme }) => props.theme.border};
    --circus-active-background: ${(props: { theme: CircusTheme }) => props.theme.activeBackground};
    --circus-invalid-background: ${(props: { theme: CircusTheme }) => props.theme.invalidBackground};
    --circus-brand-primary: ${(props: { theme: CircusTheme }) => props.theme.brandPrimary};
    --circus-brand-primary-dark: ${(props: { theme: CircusTheme }) => props.theme.brandDark};
    --circus-brand-primary-darker: ${(props: { theme: CircusTheme }) => props.theme.brandDarker};
    --circus-brand-primary-text: ${(props: { theme: CircusTheme }) => props.theme.brandText};
    --circus-state-info: ${(props: { theme: CircusTheme }) => props.theme.stateInfo};
    --circus-highlight-color: ${(props: { theme: CircusTheme }) => props.theme.highlightColor};
  }

  // BODY
  body {
    background-color: var(--circus-background);
    color: var(--circus-primary-text);
  }

  // BUTTONS
  ${button('primary', '--circus-brand-primary', '--circus-brand-primary-dark')}
  ${button('default', '--circus-background', '--circus-border')}
  .btn.btn-link {
    color: var(--circus-brand-primary);
  }

  // PANELS
  .panel-primary {
    border-color: var(--circus-brand-primary);
    .panel-heading {
      background-color: var(--circus-brand-primary);
      border-color: var(--circus-brand-primary);
    }
    .panel-footer {
      background-color: var(--circus-secondary-background);
      border-top-color: transparent;
    }
  }

  // DROPDOWNS
  .dropdown-menu {
    background-color: var(--circus-background);
    border-color: var(--circus-border);
    > li > a {
      color: var(--circus-primary-text);
      &:hover, &:focus {
        background-color: var(--circus-secondary-background);
        color: var(--circus-primary-text);
      }
    }
  }

  // TABLES
  .table {
    > thead, > tbody, > tfoot {
      > tr {
        > th, > td {
          border-color: var(--circus-border);
        }
        &.info > td, &.info:hover > td {
          background-color: var(--circus-state-info);
        }
      }
      > thead > tr > th {
        border-color: var(--circus-border);
      }
    }
  }
  .table-hover > tbody > tr:hover {
    background-color: var(--circus-secondary-background);
  }
  .table-striped > tbody > tr:nth-of-type(odd) {
    background-color: var(--circus-secondary-background);
  }

  // TABS
  .nav-tabs > li.active {
    a, a:hover, a:focus {
      background-color: var(--circus-background);
      color: var(--circus-primary-text);
    }
  }

  // FORM CONTROLS
  .form-control {
    background-color: var(--circus-background);
    color: var(--circus-primary-text);
    border-color: var(--circus-border);
  }
  textarea {
    background-color: var(--circus-background);
    color: var(--circus-primary-text);
  }

  // WELL
  .well {
    background-color: var(--circus-secondary-background);
  }

  // POPOVER
  .popover {
    background-color: var(--circus-background);
    border-color: var(--circus-border);
    &.top > .arrow {
      border-top-color: var(--circus-border);
      &:after {
        border-top-color: var(--circus-background);
      }
    }
    &.right > .arrow {
      border-right-color: var(--circus-border);
      &:after {
        border-right-color: var(--circus-background);
      }
    }
    &.bottom > .arrow {
      border-bottom-color: var(--circus-border);
      &:after {
        border-bottom-color: var(--circus-background);
      }
    }
    &.left > .arrow {
      border-left-color: var(--circus-border);
      &:after {
        border-left-color: var(--circus-background);
      }
    }
  }

  // A
  a {
    color: var(--circus-brand-primary);
  }

  // MODAL
  .modal-content {
    background-color: var(--circus-background);
    border-color: var(--circus-border);
  }
  .close {
    color: var(--circus-primary-text);
    opacity: 0.5;
  }

  // PAGINATION
  .pagination {
    > li {
      > a, > span {
        background-color: var(--circus-background);
        color: var(--circus-primary-text);
        border-color: var(--circus-border);
        &:hover, &:focus {
          color: var(--circus-primary-text);
          background-color: var(--circus-secondary-background);
          border-color: var(--circus-border);
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
        color: var(--circus-border);
        background-color: var(--circus-background);
        border-color: var(--circus-border);
      }
    }
  }
`;

export default GlobalStyle;
