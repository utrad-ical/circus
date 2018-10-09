import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, info) {
    this.setState({ hasError: true });
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger">
          An error occurred while rendering UI. Please reload the page.
        </div>
      );
    }
    return this.props.children;
  }
}
