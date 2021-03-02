import { createGlobalStyle } from 'styled-components';

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
    background-color: ${(props: any) => props.theme.secondaryBackground};
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
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }

  // TABLES
  .table-hover > tbody > tr:hover {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }

  // TABS
  .nav-tabs > li.active {
    a, a:hover, a:focus {
      background-color: ${(props: any) => props.theme.secondaryBackground};
      color: ${(props: any) => props.theme.primaryText};
    }
  }

  // FORM CONTROLS
  .form-control {
    background-color: ${(props: any) => props.theme.secondaryBackground};
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
