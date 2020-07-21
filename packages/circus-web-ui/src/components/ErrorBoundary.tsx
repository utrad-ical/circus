import React from 'react';

export default class ErrorBoundary extends React.Component<
  {},
  { error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error });
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      return (
        <div className="alert alert-danger">
          An error occurred while rendering UI. Please reload the page.
          {process.env.NODE_ENV === 'development' && (
            <pre>
              {error.message}
              {'stack' in error && error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
